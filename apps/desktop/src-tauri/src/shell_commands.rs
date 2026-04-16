use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::{AppHandle, Manager};

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
pub fn write_export_file(app: AppHandle, file_name: String, contents: String) -> Result<String, String> {
  let resolved = resolve_export_path(&app, &file_name)?;

  if contents.len() > MAX_EXPORT_BYTES {
    return Err("Export payload is too large.".into());
  }

  if let Some(parent) = resolved.parent() {
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
  }

  fs::write(&resolved, contents.as_bytes()).map_err(|error| error.to_string())?;

  Ok(resolved.to_string_lossy().to_string())
}

fn resolve_export_path(app: &AppHandle, file_name: &str) -> Result<PathBuf, String> {
  let relative = validate_export_name(file_name)?;
  let app_data_dir = app
    .path()
    .app_data_dir()
    .map_err(|error| error.to_string())?;

  Ok(app_data_dir.join("exports").join(relative))
}

fn validate_export_name(file_name: &str) -> Result<PathBuf, String> {
  let relative = PathBuf::from(file_name);

  if relative.is_absolute() {
    return Err("Export file name must be relative to the Quanti export directory.".into());
  }

  if has_forbidden_components(&relative) {
    return Err("Export file name must not escape the Quanti export directory.".into());
  }

  let extension = relative
    .extension()
    .and_then(|value| value.to_str())
    .ok_or_else(|| "Export file name must include an allowed extension.".to_string())?;

  if !ALLOWED_EXPORT_EXTENSIONS.contains(&extension) {
    return Err("Export extension is not allowed.".into());
  }

  if is_hidden_path(&relative) {
    return Err("Export file name must not target hidden files or folders.".into());
  }

  Ok(relative)
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
  path
    .components()
    .filter_map(|component| component.as_os_str().to_str())
    .any(|part| part.starts_with('.'))
}

#[cfg(test)]
mod tests {
  use super::{has_forbidden_components, is_hidden_path, validate_export_name};
  use std::path::Path;

  #[test]
  fn accepts_relative_export_name_with_allowed_extension() {
    let result = validate_export_name("reports/report.csv");
    assert!(result.is_ok());
  }

  #[test]
  fn rejects_absolute_export_paths() {
    let result = validate_export_name("/tmp/report.csv");
    assert!(result.is_err());
  }

  #[test]
  fn rejects_hidden_path_segments() {
    assert!(is_hidden_path(Path::new("/tmp/.private/report.csv")));
  }

  #[test]
  fn rejects_parent_directory_escape() {
    assert!(has_forbidden_components(Path::new("../report.csv")));
    assert!(validate_export_name("../report.csv").is_err());
  }
}
