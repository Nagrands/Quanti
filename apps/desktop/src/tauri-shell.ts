export type DesktopShellCommand =
  | "get_shell_info"
  | "read_import_preview"
  | "write_export_file";

export interface DesktopShellInfo {
  appName: string;
  appVersion: string;
  desktopTarget: string;
}

export interface ImportPreviewResult {
  path: string;
  size: number;
  preview: string;
}

export interface WriteExportFileRequest {
  fileName: string;
  contents: string;
}

export function createDesktopApp(): string {
  return "quanti-desktop";
}

export function getSupportedDesktopShellCommands(): DesktopShellCommand[] {
  return ["get_shell_info", "read_import_preview", "write_export_file"];
}
