use serde::Serialize;
use tauri::{AppHandle, State};
use tauri_plugin_updater::UpdaterExt;

use crate::runtime::{create_database_backup, shutdown, RuntimeState};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AvailableUpdate {
    current_version: String,
    version: String,
    body: Option<String>,
}

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<Option<AvailableUpdate>, String> {
    let update = app
        .updater()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| error.to_string())?;
    Ok(update.map(|value| AvailableUpdate {
        current_version: value.current_version,
        version: value.version,
        body: value.body,
    }))
}

#[tauri::command]
pub async fn install_update(
    app: AppHandle,
    runtime: State<'_, RuntimeState>,
) -> Result<(), String> {
    let update = app
        .updater()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "No Quanti update is available.".to_string())?;
    let bytes = update
        .download(|_, _| {}, || {})
        .await
        .map_err(|error| error.to_string())?;

    create_database_backup(runtime.clone())?;
    shutdown(&runtime);
    update.install(bytes).map_err(|error| error.to_string())?;
    app.restart();
}
