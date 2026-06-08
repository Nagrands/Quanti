export type DesktopShellCommand =
  | "get_shell_info"
  | "pick_import_file"
  | "read_import_preview"
  | "save_export_file"
  | "save_export_bytes";

export interface DesktopShellInfo {
  appName: string;
  appVersion: string;
  desktopTarget: string;
}

export interface SelectedImportFile {
  token: string;
  fileName: string;
  size: number;
}

export interface ImportPreviewResult {
  fileName: string;
  size: number;
  preview: string;
}

export interface ReadImportPreviewRequest {
  token: string;
}

export interface SaveExportFileRequest {
  fileName: string;
  contents: string;
}

export interface SaveExportBytesRequest {
  fileName: string;
  contents: number[];
}

interface TauriGlobal {
  core: {
    invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  };
}

declare global {
  interface Window {
    __TAURI__?: TauriGlobal;
  }
}

export async function saveTextExport(fileName: string, contents: string): Promise<boolean> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    downloadInBrowser(fileName, new Blob([contents], { type: "text/csv;charset=utf-8" }));
    return true;
  }

  return (await invoke<string | null>("save_export_file", { fileName, contents })) !== null;
}

export async function saveBinaryExport(
  fileName: string,
  contents: ArrayBuffer,
  contentType: string
): Promise<boolean> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    downloadInBrowser(fileName, new Blob([contents], { type: contentType }));
    return true;
  }

  return (await invoke<string | null>("save_export_bytes", {
    fileName,
    contents: Array.from(new Uint8Array(contents))
  })) !== null;
}

function getTauriInvoke() {
  return window.__TAURI__?.core.invoke.bind(window.__TAURI__.core);
}

function downloadInBrowser(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function createDesktopApp(): string {
  return "quanti-desktop";
}

export function getSupportedDesktopShellCommands(): DesktopShellCommand[] {
  return [
    "get_shell_info",
    "pick_import_file",
    "read_import_preview",
    "save_export_file",
    "save_export_bytes"
  ];
}
