use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

const MAX_IMPORT_BYTES: u64 = 5 * 1024 * 1024;
const MAX_EXPORT_BYTES: usize = 5 * 1024 * 1024;
const PREVIEW_BYTES: usize = 4 * 1024;
const ALLOWED_EXPORT_EXTENSIONS: &[&str] = &["csv", "json", "pdf", "txt"];

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
  path: String,
  size: u64,
  preview: String,
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
pub fn read_import_preview(path: String) -> Result<ImportPreview, String> {
  let resolved = PathBuf::from(&path);
  let metadata = fs::metadata(&resolved).map_err(|error| error.to_string())?;

  if !metadata.is_file() {
    return Err("Only files can be imported.".into());
  }

  if metadata.len() > MAX_IMPORT_BYTES {
    return Err("Import file is too large for preview.".into());
  }

  let bytes = fs::read(&resolved).map_err(|error| error.to_string())?;
  let preview = String::from_utf8_lossy(&bytes[..bytes.len().min(PREVIEW_BYTES)]).to_string();

  Ok(ImportPreview {
    path,
    size: metadata.len(),
    preview,
  })
}

#[tauri::command]
pub fn write_export_file(path: String, contents: String) -> Result<(), String> {
  let resolved = validate_export_path(&path)?;

  if contents.len() > MAX_EXPORT_BYTES {
    return Err("Export payload is too large.".into());
  }

  if let Some(parent) = resolved.parent() {
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
  }

  fs::write(&resolved, contents.as_bytes()).map_err(|error| error.to_string())
}

fn validate_export_path(path: &str) -> Result<PathBuf, String> {
  let resolved = PathBuf::from(path);

  if !resolved.is_absolute() {
    return Err("Export path must be absolute.".into());
  }

  let extension = resolved
    .extension()
    .and_then(|value| value.to_str())
    .ok_or_else(|| "Export path must include an allowed extension.".to_string())?;

  if !ALLOWED_EXPORT_EXTENSIONS.contains(&extension) {
    return Err("Export extension is not allowed.".into());
  }

  if is_hidden_path(&resolved) {
    return Err("Export path must not target hidden files or folders.".into());
  }

  Ok(resolved)
}

fn is_hidden_path(path: &Path) -> bool {
  path
    .components()
    .filter_map(|component| component.as_os_str().to_str())
    .any(|part| part.starts_with('.'))
}

#[cfg(test)]
mod tests {
  use super::{is_hidden_path, validate_export_path};
  use std::path::Path;

  #[test]
  fn accepts_absolute_export_with_allowed_extension() {
    let result = validate_export_path("/tmp/quanti/report.csv");
    assert!(result.is_ok());
  }

  #[test]
  fn rejects_relative_export_paths() {
    let result = validate_export_path("report.csv");
    assert!(result.is_err());
  }

  #[test]
  fn rejects_hidden_path_segments() {
    assert!(is_hidden_path(Path::new("/tmp/.private/report.csv")));
  }
}
