import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { MasterDataPage } from "../src/features/master-data/MasterDataPage";
import {
  createMasterData,
  deactivateMasterData,
  getMasterData,
  restoreMasterData,
  updateMasterData
} from "../src/features/master-data/master-data-api";
import { renderWithAppProviders } from "./render-app";

vi.mock("../src/features/master-data/master-data-api", () => ({
  getMasterData: vi.fn(),
  createMasterData: vi.fn(),
  updateMasterData: vi.fn(),
  deactivateMasterData: vi.fn(),
  restoreMasterData: vi.fn()
}));

const product = {
  id: "product-1",
  sku: "PRD-001",
  name: "Desk lamp",
  unit: "pcs",
  description: "Adjustable lamp",
  isActive: true,
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z"
};

const archivedProduct = {
  ...product,
  id: "product-2",
  sku: "PRD-ARCH",
  name: "Archived lamp",
  isActive: false
};

describe("master data workspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(getMasterData).mockResolvedValue([product]);
    vi.mocked(createMasterData).mockResolvedValue(product);
    vi.mocked(updateMasterData).mockResolvedValue(product);
    vi.mocked(deactivateMasterData).mockResolvedValue(undefined);
    vi.mocked(restoreMasterData).mockResolvedValue(product);
  });

  test("loads products and filters active and archived rows", async () => {
    const user = userEvent.setup();
    vi.mocked(getMasterData).mockResolvedValue([product, archivedProduct]);
    renderWithAppProviders(<MasterDataPage />, "/products");

    expect(await screen.findByText("PRD-001")).toBeInTheDocument();
    expect(getMasterData).toHaveBeenCalledWith("products", true);
    expect(screen.queryByText("PRD-ARCH")).not.toBeInTheDocument();

    const summary = screen.getByLabelText("Сводка справочника");
    expect(within(summary).getByText("Всего")).toBeInTheDocument();
    expect(within(summary).getByText("Активные")).toBeInTheDocument();
    expect(within(summary).getByText("Архивные")).toBeInTheDocument();
    expect(within(summary).getAllByText("2")).toHaveLength(1);

    await user.selectOptions(screen.getByLabelText("Фильтр активности"), "archived");
    expect(await screen.findByText("PRD-ARCH")).toBeInTheDocument();
    expect(screen.queryByText("PRD-001")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Восстановить Archived lamp" }));
    const restoreDialog = screen.getByRole("dialog", { name: "Восстановить запись?" });
    await user.click(within(restoreDialog).getByRole("button", { name: "Восстановить" }));
    expect(restoreMasterData).toHaveBeenCalledWith("products", "product-2");

    await user.type(screen.getByPlaceholderText("Поиск товаров"), "missing");
    expect(screen.getByText("Совпадений не найдено")).toBeInTheDocument();
    expect(screen.getByText("Измените поисковый запрос или фильтр активности.")).toBeInTheDocument();
  });

  test("validates and creates a product", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<MasterDataPage />, "/products");
    await screen.findByText("PRD-001");

    await user.click(screen.getByRole("button", { name: "Создать" }));
    const drawer = screen.getByRole("complementary", { name: "Новая запись" });
    await user.click(within(drawer).getByRole("button", { name: "Создать" }));
    expect(within(drawer).getByText("Поле «SKU» обязательно.")).toBeInTheDocument();

    await user.type(within(drawer).getByLabelText("SKU *"), " PRD-002 ");
    await user.type(within(drawer).getByLabelText("Наименование *"), " Mouse ");
    await user.type(within(drawer).getByLabelText("Единица *"), " pcs ");
    await user.click(within(drawer).getByRole("button", { name: "Создать" }));

    expect(createMasterData).toHaveBeenCalledWith("products", {
      sku: "PRD-002",
      name: "Mouse",
      unit: "pcs",
      description: null
    });
  });

  test("edits and deactivates a product", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<MasterDataPage />, "/products");
    await screen.findByText("PRD-001");

    await user.click(screen.getByRole("button", { name: "Изменить Desk lamp" }));
    const drawer = screen.getByRole("complementary", { name: "Изменение записи" });
    const nameInput = within(drawer).getByLabelText("Наименование *");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated lamp");
    await user.click(within(drawer).getByRole("button", { name: "Сохранить" }));
    expect(updateMasterData).toHaveBeenCalledWith(
      "products",
      "product-1",
      expect.objectContaining({ name: "Updated lamp" })
    );

    await user.click(screen.getByRole("button", { name: "Деактивировать Desk lamp" }));
    const dialog = screen.getByRole("dialog", { name: "Деактивировать запись?" });
    await user.click(within(dialog).getByRole("button", { name: "Деактивировать" }));
    expect(deactivateMasterData).toHaveBeenCalledWith("products", "product-1");
  });

  test("switches to every master-data resource", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<MasterDataPage />, "/products");
    await screen.findByText("PRD-001");

    for (const tab of ["Склады", "Контрагенты", "Счета"]) {
      vi.mocked(getMasterData).mockResolvedValueOnce([]);
      await user.click(screen.getByRole("button", { name: tab }));
      expect(await screen.findByText("Записей пока нет")).toBeInTheDocument();
    }
  });

  test("localizes the master-data filters in English", async () => {
    window.localStorage.setItem("quanti.locale", "en");
    renderWithAppProviders(<MasterDataPage />, "/products");

    expect(await screen.findByText("PRD-001")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search products")).toBeInTheDocument();
    expect(screen.getByLabelText("Activity filter")).toHaveValue("active");
    const summary = screen.getByLabelText("Master data summary");
    expect(within(summary).getByText("Active")).toBeInTheDocument();
  });
});
