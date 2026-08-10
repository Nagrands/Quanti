import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { pickJsonImport, saveBinaryExport, saveTextExport } from "../src/tauri-shell";

describe("desktop shell adapter", () => {
  const click = vi.fn();
  const invoke = vi.fn();

  beforeEach(() => {
    invoke.mockReset();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:quanti-export"),
      revokeObjectURL: vi.fn()
    });
    vi.spyOn(document, "createElement").mockReturnValue({
      click,
      download: "",
      href: ""
    } as unknown as HTMLAnchorElement);
  });

  afterEach(() => {
    delete window.__TAURI__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    click.mockReset();
  });

  test("uses browser download outside Tauri", async () => {
    await expect(saveTextExport("report.csv", "name\nWidget")).resolves.toBe(true);

    expect(invoke).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
  });

  test("uses native text export in Tauri", async () => {
    invoke.mockResolvedValue("C:\\Exports\\report.csv");
    window.__TAURI__ = { core: { invoke } };

    await expect(saveTextExport("report.csv", "name\nWidget")).resolves.toBe(true);

    expect(invoke).toHaveBeenCalledWith("save_export_file", {
      fileName: "report.csv",
      contents: "name\nWidget"
    });
  });

  test("passes PDF bytes to the native binary export command", async () => {
    invoke.mockResolvedValue("/tmp/document.pdf");
    window.__TAURI__ = { core: { invoke } };
    const contents = new Uint8Array([37, 80, 68, 70, 45]).buffer;

    await expect(saveBinaryExport("document.pdf", contents, "application/pdf")).resolves.toBe(true);

    expect(invoke).toHaveBeenCalledWith("save_export_bytes", {
      fileName: "document.pdf",
      contents: [37, 80, 68, 70, 45]
    });
  });

  test("reads the complete approved JSON file through Tauri", async () => {
    invoke
      .mockResolvedValueOnce({ token: "approved-token", fileName: "data.json", size: 42 })
      .mockResolvedValueOnce({ fileName: "data.json", size: 42, contents: "{\"version\":1}" });
    window.__TAURI__ = { core: { invoke } };

    await expect(pickJsonImport()).resolves.toEqual({ fileName: "data.json", size: 42, contents: "{\"version\":1}" });
    expect(invoke).toHaveBeenNthCalledWith(1, "pick_import_file");
    expect(invoke).toHaveBeenNthCalledWith(2, "read_import_file", { token: "approved-token" });
  });
});
