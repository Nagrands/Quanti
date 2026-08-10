use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

const MAX_IMPORT_BYTES: u64 = 5 * 1024 * 1024;
const MAX_EXPORT_BYTES: usize = 5 * 1024 * 1024;
const PREVIEW_BYTES: usize = 4 * 1024;
const ALLOWED_TEXT_EXPORT_EXTENSIONS: &[&str] = &["csv", "json", "txt"];

#[derive(Default)]
pub struct ImportApprovals {
    files: Mutex<HashMap<String, PathBuf>>,
}

impl ImportApprovals {
    fn approve(&self, path: PathBuf) -> Result<String, String> {
        let token = Uuid::new_v4().to_string();
        let mut files = self
            .files
            .lock()
            .map_err(|_| "Import approvals are unavailable.".to_string())?;
        files.insert(token.clone(), path);
        Ok(token)
    }

    fn resolve(&self, token: &str) -> Result<PathBuf, String> {
        let files = self
            .files
            .lock()
            .map_err(|_| "Import approvals are unavailable.".to_string())?;
        files
            .get(token)
            .cloned()
            .ok_or_else(|| "Import approval is missing or expired.".to_string())
    }

    fn consume(&self, token: &str) -> Result<(), String> {
        let mut files = self
            .files
            .lock()
            .map_err(|_| "Import approvals are unavailable.".to_string())?;
        files.remove(token);
        Ok(())
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellInfo {
    app_name: &'static str,
    app_version: &'static str,
    desktop_target: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreview {
    file_name: String,
    size: u64,
    preview: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedTextFile {
    file_name: String,
    size: u64,
    contents: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectedImportFile {
    token: String,
    file_name: String,
    size: u64,
}

#[tauri::command]
pub fn get_shell_info() -> ShellInfo {
    ShellInfo {
        app_name: env!("CARGO_PKG_NAME"),
        app_version: env!("CARGO_PKG_VERSION"),
        desktop_target: std::env::consts::OS,
    }
}

#[tauri::command]
pub async fn pick_import_file(
    app: AppHandle,
    approvals: State<'_, ImportApprovals>,
) -> Result<Option<SelectedImportFile>, String> {
    let Some(path) = app
        .dialog()
        .file()
        .set_title("Select a file to import into Quanti")
        .add_filter("Quanti transfer", &["json"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };
    let resolved = path.into_path().map_err(|error| error.to_string())?;
    let metadata = fs::metadata(&resolved).map_err(|error| error.to_string())?;

    if !metadata.is_file() {
        return Err("Only files can be imported.".into());
    }

    if !has_allowed_extension(&resolved, &["json"]) {
        return Err("Only Quanti JSON transfer files can be imported.".into());
    }

    if metadata.len() > MAX_IMPORT_BYTES {
        return Err("Import file is too large for preview.".into());
    }

    Ok(Some(SelectedImportFile {
        token: approvals.approve(resolved.clone())?,
        file_name: file_name(&resolved)?,
        size: metadata.len(),
    }))
}

#[tauri::command]
pub fn read_import_file(
    token: String,
    approvals: State<'_, ImportApprovals>,
) -> Result<ImportedTextFile, String> {
    let resolved = approvals.resolve(&token)?;
    approvals.consume(&token)?;
    let metadata = fs::metadata(&resolved).map_err(|error| error.to_string())?;
    if !metadata.is_file() || !has_allowed_extension(&resolved, &["json"]) {
        return Err("Only Quanti JSON transfer files can be imported.".into());
    }
    if metadata.len() > MAX_IMPORT_BYTES {
        return Err("Import file is larger than 5 MB.".into());
    }
    let bytes = fs::read(&resolved).map_err(|error| error.to_string())?;
    let contents = String::from_utf8(bytes)
        .map_err(|_| "Import file must contain valid UTF-8 JSON.".to_string())?;
    Ok(ImportedTextFile {
        file_name: file_name(&resolved)?,
        size: metadata.len(),
        contents,
    })
}

#[tauri::command]
pub fn read_import_preview(
    token: String,
    approvals: State<'_, ImportApprovals>,
) -> Result<ImportPreview, String> {
    let resolved = approvals.resolve(&token)?;
    let metadata = fs::metadata(&resolved).map_err(|error| error.to_string())?;

    if !metadata.is_file() {
        return Err("Only files can be imported.".into());
    }

    if metadata.len() > MAX_IMPORT_BYTES {
        return Err("Import file is too large for preview.".into());
    }

    let mut file = fs::File::open(&resolved).map_err(|error| error.to_string())?;
    let mut bytes = Vec::with_capacity(PREVIEW_BYTES);
    file.by_ref()
        .take(PREVIEW_BYTES as u64)
        .read_to_end(&mut bytes)
        .map_err(|error| error.to_string())?;
    approvals.consume(&token)?;

    Ok(ImportPreview {
        file_name: file_name(&resolved)?,
        size: metadata.len(),
        preview: String::from_utf8_lossy(&bytes).to_string(),
    })
}

#[tauri::command]
pub async fn save_export_file(
    app: AppHandle,
    file_name: String,
    contents: String,
) -> Result<Option<String>, String> {
    if contents.len() > MAX_EXPORT_BYTES {
        return Err("Export payload is too large.".into());
    }

    let suggested_name = validate_export_name(&file_name, ALLOWED_TEXT_EXPORT_EXTENSIONS)?;
    save_export(
        &app,
        &suggested_name,
        contents.as_bytes(),
        ALLOWED_TEXT_EXPORT_EXTENSIONS,
    )
}

#[tauri::command]
pub async fn save_export_bytes(
    app: AppHandle,
    file_name: String,
    contents: Vec<u8>,
) -> Result<Option<String>, String> {
    if contents.len() > MAX_EXPORT_BYTES {
        return Err("Export payload is too large.".into());
    }

    if !contents.starts_with(b"%PDF-") {
        return Err("PDF export payload has an invalid signature.".into());
    }

    let suggested_name = validate_export_name(&file_name, &["pdf"])?;
    save_export(&app, &suggested_name, &contents, &["pdf"])
}

fn save_export(
    app: &AppHandle,
    suggested_name: &Path,
    contents: &[u8],
    allowed_extensions: &[&str],
) -> Result<Option<String>, String> {
    let Some(path) = app
        .dialog()
        .file()
        .set_title("Choose where to save Quanti export")
        .set_file_name(file_name(suggested_name)?)
        .add_filter("Quanti export", allowed_extensions)
        .blocking_save_file()
    else {
        return Ok(None);
    };
    let resolved = path.into_path().map_err(|error| error.to_string())?;
    validate_export_destination(&resolved, allowed_extensions)?;
    fs::write(&resolved, contents).map_err(|error| error.to_string())?;
    Ok(Some(resolved.to_string_lossy().to_string()))
}

fn file_name(path: &Path) -> Result<String, String> {
    path.file_name()
        .and_then(|value| value.to_str())
        .map(str::to_owned)
        .ok_or_else(|| "Selected file must have a valid name.".to_string())
}

fn validate_export_name(file_name: &str, allowed_extensions: &[&str]) -> Result<PathBuf, String> {
    let relative = PathBuf::from(file_name);

    if relative.is_absolute() || has_forbidden_components(&relative) {
        return Err("Export file name must be a safe relative path.".into());
    }

    if !has_allowed_extension(&relative, allowed_extensions) {
        return Err("Export extension is not allowed.".into());
    }

    if is_hidden_path(&relative) {
        return Err("Export file name must not target hidden files or folders.".into());
    }

    Ok(relative)
}

fn validate_export_destination(path: &Path, allowed_extensions: &[&str]) -> Result<(), String> {
    if !has_allowed_extension(path, allowed_extensions) {
        return Err("Export destination must include an allowed extension.".into());
    }

    Ok(())
}

fn has_allowed_extension(path: &Path, allowed_extensions: &[&str]) -> bool {
    let Some(extension) = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
    else {
        return false;
    };

    allowed_extensions.contains(&extension.as_str())
}

fn has_forbidden_components(path: &Path) -> bool {
    path.components().any(|component| {
        matches!(
            component,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        )
    })
}

fn is_hidden_path(path: &Path) -> bool {
    path.components()
        .filter_map(|component| component.as_os_str().to_str())
        .any(|part| part.starts_with('.'))
}

#[cfg(test)]
mod tests {
    use super::{
        has_forbidden_components, is_hidden_path, validate_export_destination,
        validate_export_name, ImportApprovals, ALLOWED_TEXT_EXPORT_EXTENSIONS,
    };
    use std::path::Path;

    #[test]
    fn accepts_relative_export_name_with_allowed_extension() {
        assert!(validate_export_name("reports/report.csv", ALLOWED_TEXT_EXPORT_EXTENSIONS).is_ok());
    }

    #[test]
    fn rejects_absolute_export_paths() {
        assert!(validate_export_name("/tmp/report.csv", ALLOWED_TEXT_EXPORT_EXTENSIONS).is_err());
    }

    #[test]
    fn rejects_hidden_path_segments() {
        assert!(is_hidden_path(Path::new("/tmp/.private/report.csv")));
    }

    #[test]
    fn rejects_parent_directory_escape() {
        assert!(has_forbidden_components(Path::new("../report.csv")));
        assert!(validate_export_name("../report.csv", ALLOWED_TEXT_EXPORT_EXTENSIONS).is_err());
    }

    #[test]
    fn accepts_export_destination_with_allowed_extension() {
        assert!(validate_export_destination(
            Path::new("/tmp/report.csv"),
            ALLOWED_TEXT_EXPORT_EXTENSIONS
        )
        .is_ok());
    }

    #[test]
    fn accepts_uppercase_export_extensions_for_windows_paths() {
        assert!(validate_export_name("REPORT.CSV", ALLOWED_TEXT_EXPORT_EXTENSIONS).is_ok());
        assert!(validate_export_destination(Path::new(r"C:\Exports\REPORT.PDF"), &["pdf"]).is_ok());
    }

    #[test]
    fn rejects_pdf_payload_for_text_exports() {
        assert!(validate_export_name("document.pdf", ALLOWED_TEXT_EXPORT_EXTENSIONS).is_err());
    }

    #[test]
    fn import_approvals_are_opaque_one_time_tokens() {
        let approvals = ImportApprovals::default();
        let token = approvals
            .approve(Path::new("/tmp/report.csv").to_path_buf())
            .unwrap();

        assert_eq!(token.len(), 36);
        assert_eq!(
            approvals.resolve(&token).unwrap(),
            Path::new("/tmp/report.csv")
        );
        approvals.consume(&token).unwrap();
        assert!(approvals.resolve(&token).is_err());
    }
}
