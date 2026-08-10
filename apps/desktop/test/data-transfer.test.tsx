import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createTransferPackage } from "@quanti/shared";

import { DataTransferControls } from "../src/features/transfer/DataTransferControls";
import * as transferApi from "../src/features/transfer/transfer-api";
import * as shell from "../src/tauri-shell";
import { renderWithAppProviders } from "./render-app";

vi.mock("../src/features/transfer/transfer-api");
vi.mock("../src/tauri-shell");

const packageData = createTransferPackage("master-data", {
  categories: [{ code: "LIGHT", name: "Lighting", description: null, isActive: true }],
  products: [], warehouses: [], counterparties: [], accounts: []
});

describe("data transfer controls", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(transferApi.exportSection).mockResolvedValue(packageData);
    vi.mocked(shell.saveTextExport).mockResolvedValue(true);
    vi.mocked(shell.pickJsonImport).mockResolvedValue({ fileName: "master.json", size: 100, contents: JSON.stringify(packageData) });
    vi.mocked(transferApi.previewImport).mockResolvedValue({
      section: "master-data",
      entries: [{ id: "category:LIGHT", entityType: "category", key: "LIGHT", status: "conflict", defaultResolution: "skip" }]
    });
    vi.mocked(transferApi.applyImport).mockResolvedValue({ created: 0, updated: 1, skipped: 0 });
  });

  test("exports a versioned JSON package", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<DataTransferControls section="master-data" onImported={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Экспорт" }));
    expect(transferApi.exportSection).toHaveBeenCalledWith("master-data");
    expect(shell.saveTextExport).toHaveBeenCalledWith(expect.stringMatching(/quanti-master-data-.*\.json/), expect.stringContaining('"version": 1'));
  });

  test("previews conflicts, applies per-record resolution, and reports totals", async () => {
    const user = userEvent.setup();
    const imported = vi.fn();
    renderWithAppProviders(<DataTransferControls section="master-data" onImported={imported} />);
    await user.click(screen.getByRole("button", { name: "Импорт" }));
    const dialog = await screen.findByRole("dialog", { name: "Предпросмотр импорта" });
    await user.selectOptions(within(dialog).getByRole("combobox", { name: "Решение для LIGHT" }), "update");
    await user.click(within(dialog).getByRole("button", { name: "Импортировать" }));
    expect(transferApi.applyImport).toHaveBeenCalledWith(packageData, { "category:LIGHT": "update" });
    expect(imported).toHaveBeenCalledOnce();
    expect(await screen.findByRole("status")).toHaveTextContent("создано 0, обновлено 1, пропущено 0");
  });

  test("treats a cancelled file picker as a no-op", async () => {
    vi.mocked(shell.pickJsonImport).mockResolvedValue(null);
    const user = userEvent.setup();
    renderWithAppProviders(<DataTransferControls section="master-data" onImported={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Импорт" }));
    expect(transferApi.previewImport).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
