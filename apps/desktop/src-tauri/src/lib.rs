mod shell_commands;

use shell_commands::{
    get_shell_info, pick_import_file, read_import_file, read_import_preview, save_export_bytes, save_export_file,
    ImportApprovals,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(ImportApprovals::default())
        .invoke_handler(tauri::generate_handler![
            get_shell_info,
            pick_import_file,
            read_import_preview,
            read_import_file,
            save_export_file,
            save_export_bytes
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Quanti desktop shell");
}
