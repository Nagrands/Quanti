mod shell_commands;

use shell_commands::{get_shell_info, read_import_preview, write_export_file};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      get_shell_info,
      read_import_preview,
      write_export_file
    ])
    .run(tauri::generate_context!())
    .expect("failed to run Quanti desktop shell");
}
