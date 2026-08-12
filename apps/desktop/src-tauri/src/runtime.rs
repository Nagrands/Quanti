use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use uuid::Uuid;

const DATABASE_VERSION: u32 = 1;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeInfo {
    pub app_version: String,
    pub base_url: String,
    pub session_token: String,
    pub database_version: u32,
    pub database_path: String,
    pub log_path: String,
    pub first_run: bool,
}

#[derive(Default)]
pub struct RuntimeState {
    info: Mutex<Option<Result<RuntimeInfo, String>>>,
    child: Mutex<Option<CommandChild>>,
}

fn lock_error() -> String {
    "Quanti runtime state is unavailable.".to_string()
}

fn find_file(root: &Path, accepted: impl Fn(&Path) -> bool + Copy) -> Option<PathBuf> {
    let entries = fs::read_dir(root).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() && accepted(&path) {
            return Some(path);
        }
        if path.is_dir() {
            if let Some(found) = find_file(&path, accepted) {
                return Some(found);
            }
        }
    }
    None
}

fn available_port() -> Result<u16, String> {
    let listener = TcpListener::bind(("127.0.0.1", 0)).map_err(|error| error.to_string())?;
    listener
        .local_addr()
        .map(|address| address.port())
        .map_err(|error| error.to_string())
}

fn session_token() -> String {
    format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple())
}

fn resource_paths(app: &AppHandle) -> Result<(PathBuf, PathBuf, Option<PathBuf>), String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|error| error.to_string())?;
    let migrations = resource_dir.join("migrations");
    let prisma = find_file(&resource_dir.join("prisma"), |path| {
        path.file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name.starts_with("libquery_engine-") && name.ends_with(".node"))
    })
    .ok_or_else(|| "Bundled Prisma engine was not found.".to_string())?;
    let chromium = find_file(&resource_dir.join("chromium"), |path| {
        path.file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| {
                matches!(
                    name,
                    "chrome-headless-shell" | "headless_shell" | "chrome.exe"
                )
            })
    });
    Ok((migrations, prisma, chromium))
}

fn write_log(path: &Path, message: &str) {
    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{message}");
    }
}

fn health_request(port: u16, token: &str, method: &str, route: &str) -> Result<String, String> {
    let address = SocketAddr::from(([127, 0, 0, 1], port));
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_millis(400))
        .map_err(|error| error.to_string())?;
    stream
        .set_read_timeout(Some(Duration::from_secs(1)))
        .map_err(|error| error.to_string())?;
    write!(
        stream,
        "{method} {route} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nAuthorization: Bearer {token}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
    )
    .map_err(|error| error.to_string())?;
    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .map_err(|error| error.to_string())?;
    if !response.starts_with("HTTP/1.1 200") {
        return Err("Quanti API returned a non-ready response.".to_string());
    }
    Ok(response)
}

fn wait_until_ready(port: u16, token: &str) -> Result<(), String> {
    let deadline = std::time::Instant::now() + Duration::from_secs(20);
    while std::time::Instant::now() < deadline {
        if health_request(port, token, "GET", "/health").is_ok() {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(150));
    }
    Err("Quanti API did not become ready within 20 seconds.".to_string())
}

fn stop_child(state: &RuntimeState) {
    if let Ok(mut guard) = state.child.lock() {
        if let Some(child) = guard.take() {
            let _ = child.kill();
        }
    }
}

pub fn start_runtime(app: &AppHandle, state: &RuntimeState) -> Result<RuntimeInfo, String> {
    stop_child(state);
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&app_data).map_err(|error| error.to_string())?;
    let database = app_data.join("quanti.sqlite3");
    let first_run = !database.exists();
    let log_path = app_data.join("quanti-runtime.log");
    let (migrations, prisma, chromium) = resource_paths(app)?;
    let port = available_port()?;
    let token = session_token();

    let mut environment = HashMap::from([
        ("HOST".to_string(), "127.0.0.1".to_string()),
        ("PORT".to_string(), port.to_string()),
        (
            "DATABASE_URL".to_string(),
            format!("file:{}", database.display()),
        ),
        (
            "QUANTI_MIGRATIONS_DIR".to_string(),
            migrations.to_string_lossy().to_string(),
        ),
        ("QUANTI_SESSION_TOKEN".to_string(), token.clone()),
        (
            "PRISMA_QUERY_ENGINE_LIBRARY".to_string(),
            prisma.to_string_lossy().to_string(),
        ),
        ("NODE_ENV".to_string(), "production".to_string()),
    ]);
    if let Some(chromium) = chromium {
        environment.insert(
            "QUANTI_CHROMIUM_PATH".to_string(),
            chromium.to_string_lossy().to_string(),
        );
    }

    write_log(&log_path, "Starting autonomous Quanti API.");
    let sidecar = app
        .shell()
        .sidecar("quanti-api")
        .map_err(|error| error.to_string())?
        .envs(environment);
    let (mut receiver, child) = sidecar.spawn().map_err(|error| error.to_string())?;
    state.child.lock().map_err(|_| lock_error())?.replace(child);

    let event_log = log_path.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = receiver.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => {
                    write_log(&event_log, &String::from_utf8_lossy(&bytes));
                }
                CommandEvent::Stderr(bytes) => {
                    write_log(&event_log, &String::from_utf8_lossy(&bytes));
                }
                CommandEvent::Terminated(payload) => {
                    write_log(&event_log, &format!("API terminated: {payload:?}"));
                }
                _ => {}
            }
        }
    });

    if let Err(error) = wait_until_ready(port, &token) {
        stop_child(state);
        write_log(&log_path, &error);
        return Err(error);
    }

    Ok(RuntimeInfo {
        app_version: app.package_info().version.to_string(),
        base_url: format!("http://127.0.0.1:{port}"),
        session_token: token,
        database_version: DATABASE_VERSION,
        database_path: database.to_string_lossy().to_string(),
        log_path: log_path.to_string_lossy().to_string(),
        first_run,
    })
}

pub fn initialize(app: &AppHandle, state: &RuntimeState) {
    let result = start_runtime(app, state);
    if let Ok(mut info) = state.info.lock() {
        *info = Some(result);
    }
}

pub fn shutdown(state: &RuntimeState) {
    stop_child(state);
}

#[tauri::command]
pub fn get_runtime_info(state: State<'_, RuntimeState>) -> Result<RuntimeInfo, String> {
    state
        .info
        .lock()
        .map_err(|_| lock_error())?
        .clone()
        .unwrap_or_else(|| Err("Quanti runtime is still starting.".to_string()))
}

#[tauri::command]
pub fn retry_runtime(
    app: AppHandle,
    state: State<'_, RuntimeState>,
) -> Result<RuntimeInfo, String> {
    let result = start_runtime(&app, &state);
    *state.info.lock().map_err(|_| lock_error())? = Some(result.clone());
    result
}

#[tauri::command]
pub fn create_database_backup(state: State<'_, RuntimeState>) -> Result<String, String> {
    let info = get_runtime_info(state.clone())?;
    let port = info
        .base_url
        .rsplit(':')
        .next()
        .and_then(|value| value.parse::<u16>().ok())
        .ok_or_else(|| "Invalid runtime port.".to_string())?;
    health_request(port, &info.session_token, "POST", "/runtime/checkpoint")?;
    let source = PathBuf::from(&info.database_path);
    let backups = source
        .parent()
        .ok_or_else(|| "Invalid database path.".to_string())?
        .join("backups");
    fs::create_dir_all(&backups).map_err(|error| error.to_string())?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_secs();
    let destination = backups.join(format!("quanti-manual-{stamp}.sqlite3"));
    fs::copy(source, &destination).map_err(|error| error.to_string())?;
    Ok(destination.to_string_lossy().to_string())
}

#[tauri::command]
pub fn read_runtime_log(app: AppHandle, state: State<'_, RuntimeState>) -> Result<String, String> {
    let info = state
        .info
        .lock()
        .map_err(|_| lock_error())?
        .as_ref()
        .and_then(|result| result.as_ref().ok())
        .cloned();
    let path = match info {
        Some(value) => PathBuf::from(value.log_path),
        None => app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?
            .join("quanti-runtime.log"),
    };
    let mut contents = fs::read_to_string(path).map_err(|error| error.to_string())?;
    const MAX_LOG_CHARS: usize = 1_000_000;
    if contents.len() > MAX_LOG_CHARS {
        contents = contents.split_off(contents.len() - MAX_LOG_CHARS);
    }
    Ok(contents)
}

#[tauri::command]
pub fn restore_latest_backup(
    app: AppHandle,
    state: State<'_, RuntimeState>,
) -> Result<String, String> {
    if state
        .info
        .lock()
        .map_err(|_| lock_error())?
        .as_ref()
        .is_some_and(Result::is_ok)
    {
        return Err("Close the running database before restoring a backup.".to_string());
    }
    stop_child(&state);
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let backups = app_data.join("backups");
    let mut candidates = fs::read_dir(&backups)
        .map_err(|error| error.to_string())?
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| path.extension().and_then(|value| value.to_str()) == Some("sqlite3"))
        .collect::<Vec<_>>();
    candidates.sort();
    let source = candidates
        .pop()
        .ok_or_else(|| "No Quanti backup is available.".to_string())?;
    restore_source(&app_data, &source)?;
    Ok(source.to_string_lossy().to_string())
}

fn restore_source(app_data: &Path, source: &Path) -> Result<(), String> {
    let database = app_data.join("quanti.sqlite3");
    for suffix in ["-wal", "-shm"] {
        let _ = fs::remove_file(format!("{}{}", database.display(), suffix));
    }
    fs::copy(source, &database).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn choose_and_restore_backup(
    app: AppHandle,
    state: State<'_, RuntimeState>,
) -> Result<Option<String>, String> {
    if state
        .info
        .lock()
        .map_err(|_| lock_error())?
        .as_ref()
        .is_some_and(Result::is_ok)
    {
        return Err("Close the running database before restoring a backup.".to_string());
    }
    let Some(selected) = app
        .dialog()
        .file()
        .set_title("Select a Quanti SQLite backup")
        .add_filter("Quanti SQLite backup", &["sqlite3", "sqlite"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };
    let source = selected.into_path().map_err(|error| error.to_string())?;
    if !source.is_file()
        || !matches!(
            source.extension().and_then(|value| value.to_str()),
            Some("sqlite3" | "sqlite")
        )
    {
        return Err("Select a Quanti SQLite backup file.".to_string());
    }
    stop_child(&state);
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    restore_source(&app_data, &source)?;
    Ok(Some(source.to_string_lossy().to_string()))
}

#[cfg(test)]
mod tests {
    use super::{session_token, DATABASE_VERSION};

    #[test]
    fn runtime_token_has_256_bits_of_uuid_material() {
        assert_eq!(session_token().len(), 64);
    }

    #[test]
    fn database_version_matches_sqlite_foundation() {
        assert_eq!(DATABASE_VERSION, 1);
    }
}
