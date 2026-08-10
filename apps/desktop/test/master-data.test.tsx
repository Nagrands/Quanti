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
  units: [{ id: "unit-pack", name: "pack", conversionFactor: "10.000000" }],
  lastSalePrice: "25.00",
  lastSaleUnit: "pack",
  lastPurchasePrice: "18.00",
  lastPurchaseUnit: "pack",
  description: "Adjustable lamp",
  categoryId: "category-1",
  categoryName: "Lighting",
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

const secondProduct = {
  ...product,
  id: "product-2",
  sku: "PRD-010",
  name: "Apple lamp",
  updatedAt: "2026-06-03T10:00:00.000Z"
};

const thirdProduct = {
  ...product,
  id: "product-3",
  sku: "PRD-002",
  name: "Cable lamp",
  updatedAt: "2026-06-02T10:00:00.000Z"
};

const category = {
  id: "category-1",
  code: "LIGHT",
  name: "Lighting",
  description: "Lighting products",
  isActive: true,
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z"
};

function firstCellValues() {
  return within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);
}

describe("master data workspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(getMasterData).mockImplementation(async (resource) =>
      resource === "product-categories" ? [category] : [product]
    );
    vi.mocked(createMasterData).mockResolvedValue(product);
    vi.mocked(updateMasterData).mockResolvedValue(product);
    vi.mocked(deactivateMasterData).mockResolvedValue(undefined);
    vi.mocked(restoreMasterData).mockResolvedValue(product);
  });

  test("loads products and filters active and archived rows", async () => {
    const user = userEvent.setup();
    vi.mocked(getMasterData).mockImplementation(async (resource) =>
      resource === "product-categories" ? [category] : [product, archivedProduct]
    );
    renderWithAppProviders(<MasterDataPage />, "/products");

    expect(await screen.findByText(/PRD-001/)).toBeInTheDocument();
    expect(getMasterData).toHaveBeenCalledWith("products", true);
    expect(screen.queryByText(/PRD-ARCH/)).not.toBeInTheDocument();

    const summary = screen.getByLabelText("Сводка справочника");
    expect(within(summary).getByText("Всего")).toBeInTheDocument();
    expect(within(summary).getByText("Активные")).toBeInTheDocument();
    expect(within(summary).getByText("Архивные")).toBeInTheDocument();
    expect(within(summary).getAllByText("2")).toHaveLength(1);

    await user.selectOptions(screen.getByLabelText("Фильтр активности"), "archived");
    expect(await screen.findByText(/PRD-ARCH/)).toBeInTheDocument();
    expect(screen.queryByText(/PRD-001/)).not.toBeInTheDocument();

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
    await screen.findByText(/PRD-001/);

    await user.click(screen.getByRole("button", { name: "Создать" }));
    const drawer = screen.getByRole("complementary", { name: "Новая запись" });
    await user.click(within(drawer).getByRole("button", { name: "Создать" }));
    expect(within(drawer).getByText("Поле «Наименование» обязательно.")).toBeInTheDocument();

    const sku = within(drawer).getByLabelText("SKU *");
    expect(sku).toHaveValue("PRD-0002");
    await user.clear(sku);
    await user.type(sku, " PRD-003 ");
    await user.type(within(drawer).getByLabelText("Наименование *"), " Mouse ");
    await user.selectOptions(within(drawer).getByLabelText("Категория"), "category-1");
    await user.type(within(drawer).getByLabelText("Базовая единица *"), " pcs ");
    await user.click(within(drawer).getByRole("button", { name: "Добавить единицу" }));
    await user.type(within(drawer).getByLabelText("Название единицы"), " pack ");
    const factor = within(drawer).getByLabelText("Коэффициент пересчёта");
    await user.clear(factor);
    await user.type(factor, "10");
    await user.click(within(drawer).getByRole("button", { name: "Создать" }));

    expect(createMasterData).toHaveBeenCalledWith("products", {
      sku: "PRD-003",
      name: "Mouse",
      categoryId: "category-1",
      unit: "pcs",
      units: [{ name: "pack", conversionFactor: "10" }],
      description: null
    });
  });

  test("shows remembered prices and edits additional product units", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<MasterDataPage />, "/products");

    expect(await screen.findByText(/Продажа: 25.00 \/ pack/)).toBeInTheDocument();
    expect(screen.getByText(/Закупка: 18.00 \/ pack/)).toBeInTheDocument();
    expect(screen.getByText(/pack × 10.000000/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Изменить Desk lamp" }));
    const drawer = screen.getByRole("complementary", { name: "Изменение записи" });
    expect(within(drawer).getByLabelText("Название единицы")).toHaveValue("pack");
    const factor = within(drawer).getByLabelText("Коэффициент пересчёта");
    await user.clear(factor);
    await user.type(factor, "12");
    await user.click(within(drawer).getByRole("button", { name: "Сохранить" }));

    expect(updateMasterData).toHaveBeenCalledWith(
      "products",
      "product-1",
      expect.objectContaining({
        units: [{ name: "pack", conversionFactor: "12" }]
      })
    );
  });

  test("edits and deactivates a product", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<MasterDataPage />, "/products");
    await screen.findByText(/PRD-001/);

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
    await screen.findByText(/PRD-001/);

    for (const tab of ["Категории товаров", "Склады", "Контрагенты", "Счета"]) {
      vi.mocked(getMasterData).mockResolvedValueOnce([]);
      await user.click(screen.getByRole("button", { name: tab }));
      expect(await screen.findByText("Записей пока нет")).toBeInTheDocument();
    }
  });

  test("sorts products by name and update date in both directions", async () => {
    const user = userEvent.setup();
    vi.mocked(getMasterData).mockImplementation(async (resource) =>
      resource === "product-categories" ? [category] : [product, secondProduct, thirdProduct]
    );
    renderWithAppProviders(<MasterDataPage />, "/products");
    await screen.findByText(/PRD-001/);

    expect(firstCellValues()).toEqual([
      expect.stringContaining("Desk lamp"),
      expect.stringContaining("Apple lamp"),
      expect.stringContaining("Cable lamp")
    ]);

    const productSort = screen.getByRole("button", { name: "Сортировать Товар по возрастанию" });
    await user.click(productSort);
    expect(screen.getByRole("columnheader", { name: /Товар/ })).toHaveAttribute("aria-sort", "ascending");
    expect(firstCellValues()).toEqual([
      expect.stringContaining("Apple lamp"),
      expect.stringContaining("Cable lamp"),
      expect.stringContaining("Desk lamp")
    ]);

    await user.click(screen.getByRole("button", { name: "Сортировать Товар по убыванию" }));
    expect(firstCellValues()).toEqual([
      expect.stringContaining("Desk lamp"),
      expect.stringContaining("Cable lamp"),
      expect.stringContaining("Apple lamp")
    ]);

    await user.click(screen.getByRole("button", { name: "Сортировать Изменено по возрастанию" }));
    expect(firstCellValues()).toEqual([
      expect.stringContaining("Desk lamp"),
      expect.stringContaining("Cable lamp"),
      expect.stringContaining("Apple lamp")
    ]);
    await user.click(screen.getByRole("button", { name: "Сортировать Изменено по убыванию" }));
    expect(firstCellValues()).toEqual([
      expect.stringContaining("Apple lamp"),
      expect.stringContaining("Cable lamp"),
      expect.stringContaining("Desk lamp")
    ]);
  });

  test("uses natural code order with filters and remembers sorting per resource", async () => {
    const user = userEvent.setup();
    const warehouses = [
      { ...category, id: "warehouse-10", code: "WH-10", name: "Zulu" },
      { ...category, id: "warehouse-2", code: "WH-2", name: "Alpha" },
      { ...category, id: "warehouse-1", code: "WH-1", name: "Beta" }
    ];
    vi.mocked(getMasterData).mockImplementation(async (resource) => {
      if (resource === "product-categories") return [category];
      if (resource === "warehouses") return warehouses;
      return [product, secondProduct, archivedProduct];
    });
    renderWithAppProviders(<MasterDataPage />, "/products");
    await screen.findByText(/PRD-001/);

    await user.click(screen.getByRole("button", { name: "Сортировать Товар по возрастанию" }));
    await user.type(screen.getByPlaceholderText("Поиск товаров"), "lamp");
    expect(firstCellValues()).toEqual([
      expect.stringContaining("Apple lamp"),
      expect.stringContaining("Desk lamp")
    ]);

    await user.click(screen.getByRole("button", { name: "Склады" }));
    await screen.findByText("WH-10");
    await user.click(screen.getByRole("button", { name: "Сортировать Код по возрастанию" }));
    expect(firstCellValues()).toEqual(["WH-1", "WH-2", "WH-10"]);
    await user.click(screen.getByRole("button", { name: "Сортировать Код по убыванию" }));
    expect(firstCellValues()).toEqual(["WH-10", "WH-2", "WH-1"]);

    await user.click(screen.getByRole("button", { name: "Товары" }));
    expect(screen.getByRole("columnheader", { name: /Товар/ })).toHaveAttribute("aria-sort", "ascending");
    expect(firstCellValues()).toEqual([
      expect.stringContaining("Apple lamp"),
      expect.stringContaining("Desk lamp")
    ]);
  });

  test("localizes the master-data filters in English", async () => {
    window.localStorage.setItem("quanti.locale", "en");
    renderWithAppProviders(<MasterDataPage />, "/products");

    expect(await screen.findByText(/PRD-001/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search products")).toBeInTheDocument();
    expect(screen.getByLabelText("Activity filter")).toHaveValue("active");
    const summary = screen.getByLabelText("Master data summary");
    expect(within(summary).getByText("Active")).toBeInTheDocument();
    const sortButton = screen.getByRole("button", { name: "Sort Product ascending" });
    await userEvent.click(sortButton);
    expect(screen.getByRole("columnheader", { name: /Product/ })).toHaveAttribute("aria-sort", "ascending");
  });
});
