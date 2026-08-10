export type DesktopShellCommand =
  | "get_shell_info"
  | "pick_import_file"
  | "read_import_preview"
  | "read_import_file"
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

export interface ImportedTextFile {
  fileName: string;
  size: number;
  contents: string;
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
    const contentType = fileName.toLowerCase().endsWith(".json")
      ? "application/json;charset=utf-8"
      : "text/csv;charset=utf-8";
    downloadInBrowser(fileName, new Blob([contents], { type: contentType }));
    return true;
  }

  return (await invoke<string | null>("save_export_file", { fileName, contents })) !== null;
}

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export async function pickJsonImport(): Promise<ImportedTextFile | null> {
  const invoke = getTauriInvoke();
  if (invoke) {
    const selected = await invoke<SelectedImportFile | null>("pick_import_file");
    if (!selected) return null;
    return invoke<ImportedTextFile>("read_import_file", { token: selected.token });
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    let settled = false;
    const finish = (value: ImportedTextFile | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return finish(null);
      if (!file.name.toLowerCase().endsWith(".json")) return reject(new Error("Only Quanti JSON transfer files can be imported."));
      if (file.size > MAX_IMPORT_BYTES) return reject(new Error("Import file is larger than 5 MB."));
      try {
        const contents = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
        finish({ fileName: file.name, size: file.size, contents });
      } catch (error) {
        reject(error);
      }
    }, { once: true });
    window.addEventListener("focus", () => window.setTimeout(() => {
      if (!input.files?.length) finish(null);
    }, 0), { once: true });
    input.click();
  });
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
    "read_import_file",
    "save_export_file",
    "save_export_bytes"
  ];
}
