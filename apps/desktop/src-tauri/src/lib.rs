mod runtime;
mod shell_commands;
mod updates;

use runtime::{
    choose_and_restore_backup, create_database_backup, get_runtime_info, read_runtime_log,
    restore_latest_backup, retry_runtime, RuntimeState,
};
use shell_commands::{
    get_shell_info, pick_import_file, read_import_file, read_import_preview, save_export_bytes,
    save_export_file, ImportApprovals,
};
use tauri::Manager;
use updates::{check_for_update, install_update};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(ImportApprovals::default())
        .manage(RuntimeState::default())
        .setup(|app| {
            let state = app.state::<RuntimeState>();
            runtime::initialize(app.handle(), &state);
            if let Some(window) = app.get_webview_window("main") {
                window.show()?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_shell_info,
            get_runtime_info,
            retry_runtime,
            create_database_backup,
            read_runtime_log,
            restore_latest_backup,
            choose_and_restore_backup,
            pick_import_file,
            read_import_preview,
            read_import_file,
            save_export_file,
            save_export_bytes,
            check_for_update,
            install_update
        ])
        .build(tauri::generate_context!())
        .expect("failed to build Quanti desktop shell");

    app.run(|app_handle, event| {
        if matches!(
            event,
            tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }
        ) {
            runtime::shutdown(&app_handle.state::<RuntimeState>());
        }
    });
}
