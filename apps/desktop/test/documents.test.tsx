import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { DocumentsPage } from "../src/features/documents/DocumentsPage";
import { ApiError } from "../src/api/errors";
import {
  createDocument,
  createProduct,
  deleteDocument,
  downloadDocumentPdf,
  getDocumentLookups,
  getDocuments,
  getStockBalance,
  postDocument,
  printDocument,
  repostDocument,
  unpostDocument,
  updateDocument,
  updateProduct,
  updateProductAliases
} from "../src/features/documents/documents-api";
import { calculateAmount, sortDocumentLines, toDocumentPayload } from "../src/features/documents/document-model";
import { renderWithAppProviders } from "./render-app";

vi.mock("../src/features/documents/documents-api", () => ({
  getDocuments: vi.fn(),
  getStockBalance: vi.fn(),
  getDocumentLookups: vi.fn(),
  createDocument: vi.fn(),
  createProduct: vi.fn(),
  updateDocument: vi.fn(),
  updateProduct: vi.fn(),
  updateProductAliases: vi.fn(),
  deleteDocument: vi.fn(),
  printDocument: vi.fn(),
  downloadDocumentPdf: vi.fn(),
  postDocument: vi.fn(),
  unpostDocument: vi.fn(),
  repostDocument: vi.fn()
}));

const draft = {
  id: "document-1",
  number: "SO-001",
  type: "SALE" as const,
  status: "DRAFT" as const,
  documentDate: "2026-06-06T00:00:00.000Z",
  postedAt: null,
  notes: null,
  totalAmount: "20.00",
  warehouseId: "warehouse-1",
  sourceWarehouseId: null,
  destinationWarehouseId: null,
  counterpartyId: "counterparty-1",
  items: [{
    id: "item-1",
    lineNo: 1,
    productId: "product-1",
    unit: "pcs",
    unitFactor: "1.000000",
    quantity: "2.000",
    price: "10.00",
    amount: "20.00",
    warehouseId: null
  }]
};

const posted = {
  ...draft,
  id: "document-2",
  number: "PO-001",
  type: "PURCHASE" as const,
  status: "POSTED" as const,
  postedAt: "2026-06-06T10:00:00.000Z"
};

const lookups = {
  products: [
    {
      id: "product-1",
      sku: "SKU-1",
      name: "Widget",
      description: null,
      unit: "pcs",
      units: [],
      aliases: [],
      salePrice: "10.00",
      purchasePrice: "7.50",
      categoryId: null,
      categoryName: null,
      isActive: true,
      createdAt: "",
      updatedAt: ""
    },
    {
      id: "product-2",
      sku: "VEG-2",
      name: "Carrot",
      description: null,
      unit: "kg",
      units: [{ id: "unit-bunch", name: "bunch", conversionFactor: "0.100000" }],
      aliases: [],
      salePrice: "4.50",
      purchasePrice: "30.00",
      categoryId: "category-1",
      categoryName: "Vegetables",
      isActive: true,
      createdAt: "",
      updatedAt: ""
    }
  ],
  categories: [{ id: "category-1", code: "CAT-0001", name: "Vegetables", description: null, isActive: true, createdAt: "", updatedAt: "" }],
  warehouses: [{ id: "warehouse-1", code: "MAIN", name: "Main", isActive: true, createdAt: "", updatedAt: "" }],
  counterparties: [{ id: "counterparty-1", code: "C-1", name: "Acme", type: "CUSTOMER" as const, taxId: null, isActive: true, createdAt: "", updatedAt: "" }]
};

describe("documents workspace", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-06-06T10:00:00.000Z"));
    vi.mocked(getDocuments).mockResolvedValue([draft, posted]);
    vi.mocked(getStockBalance).mockResolvedValue({
      productId: "product-1",
      warehouseId: "warehouse-1",
      quantity: "8.000"
    });
    vi.mocked(getDocumentLookups).mockResolvedValue(lookups);
    vi.mocked(createDocument).mockResolvedValue(draft);
    vi.mocked(createProduct).mockResolvedValue(lookups.products[0]);
    vi.mocked(updateProduct).mockImplementation(async (id, payload) => ({
      ...lookups.products.find((product) => product.id === id)!,
      ...payload,
      categoryName: payload.categoryId === "category-1" ? "Vegetables" : null,
      units: (payload.units ?? []).map((unit, index) => ({ id: `updated-unit-${index}`, ...unit })),
      updatedAt: "2026-06-06T11:00:00.000Z"
    }));
    vi.mocked(updateProductAliases).mockImplementation(async (id, aliases) => ({
      ...lookups.products.find((product) => product.id === id)!, aliases
    }));
    vi.mocked(updateDocument).mockResolvedValue(draft);
    vi.mocked(deleteDocument).mockResolvedValue(undefined);
    vi.mocked(printDocument).mockResolvedValue({
      data: new TextEncoder().encode("%PDF-test").buffer,
      contentType: "application/pdf",
      fileName: "SO-001.pdf"
    });
    vi.mocked(postDocument).mockResolvedValue(posted);
    vi.mocked(unpostDocument).mockResolvedValue(draft);
    vi.mocked(repostDocument).mockResolvedValue(posted);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("renders and filters draft and posted documents", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<DocumentsPage />, "/documents");

    expect(await screen.findByText("SO-001")).toBeInTheDocument();
    expect(screen.getByText("PO-001")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Фильтр по статусу"), "POSTED");
    expect(screen.queryByText("SO-001")).not.toBeInTheDocument();
    expect(screen.getByText("PO-001")).toBeInTheDocument();
  });

  test("creates a draft with calculated line amount", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("SO-001");
    await user.click(screen.getByRole("button", { name: "Новый документ" }));

    const drawer = screen.getByRole("dialog", { name: "Новый документ" });
    const number = within(drawer).getByLabelText("Номер");
    expect(number).toHaveValue("SALE-202606-0001");
    await user.selectOptions(within(drawer).getByLabelText("Тип"), "PURCHASE");
    expect(number).toHaveValue("PUR-202606-0001");
    await user.selectOptions(within(drawer).getByLabelText("Тип"), "SALE");
    expect(number).toHaveValue("SALE-202606-0001");
    await user.clear(number);
    await user.type(number, "SO-002");
    await user.selectOptions(within(drawer).getByLabelText("Склад"), "warehouse-1");
    const product = within(drawer).getByRole("combobox", { name: "Товар" });
    await user.click(product);
    await user.click(within(drawer).getByRole("option", { name: "SKU-1 · Widget" }));
    const quantity = within(drawer).getByLabelText("Количество");
    const price = within(drawer).getByLabelText("Цена");
    await user.clear(quantity);
    await user.type(quantity, "2");
    await user.clear(price);
    await user.type(price, "12.50");
    expect(within(drawer).getAllByText("25.00")).toHaveLength(2);
    await user.click(within(drawer).getByRole("button", { name: "Сохранить черновик" }));

    expect(createDocument).toHaveBeenCalledWith(expect.objectContaining({
      number: "SO-002",
      warehouseId: "warehouse-1",
      items: [expect.objectContaining({ unit: "pcs", quantity: "2.000", price: "12.50", amount: "25.00" })]
    }));
  });

  test("increments the automatic number after creating a draft", async () => {
    const user = userEvent.setup();
    vi.mocked(createDocument).mockResolvedValueOnce({
      ...draft,
      id: "document-3",
      number: "PUR-202606-0001",
      type: "PURCHASE"
    });
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("SO-001");
    await user.click(screen.getByRole("button", { name: "Новый документ" }));

    let drawer = screen.getByRole("dialog", { name: "Новый документ" });
    await user.selectOptions(within(drawer).getByLabelText("Тип"), "PURCHASE");
    await user.selectOptions(within(drawer).getByLabelText("Склад"), "warehouse-1");
    const product = within(drawer).getByRole("combobox", { name: "Товар" });
    await user.click(product);
    await user.click(within(drawer).getByRole("option", { name: "SKU-1 · Widget" }));
    await user.click(within(drawer).getByRole("button", { name: "Сохранить черновик" }));

    expect(await screen.findByText("PUR-202606-0001")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Новый документ" }));
    drawer = screen.getByRole("dialog", { name: "Новый документ" });
    await user.selectOptions(within(drawer).getByLabelText("Тип"), "PURCHASE");
    expect(within(drawer).getByLabelText("Номер")).toHaveValue("PUR-202606-0002");
  });

  test("uses the reference price and recalculates it for the selected unit", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("SO-001");
    await user.click(screen.getByRole("button", { name: "Новый документ" }));

    const drawer = screen.getByRole("dialog", { name: "Новый документ" });
    const product = within(drawer).getByRole("combobox", { name: "Товар" });
    await user.click(product);
    await user.click(within(drawer).getByRole("option", { name: "VEG-2 · Carrot" }));

    expect(within(drawer).getByLabelText("Единица")).toHaveValue("kg");
    expect(within(drawer).getByLabelText("Цена")).toHaveValue("4.50");
    await user.selectOptions(within(drawer).getByLabelText("Единица"), "bunch");
    expect(within(drawer).getByLabelText("Цена")).toHaveValue("0.45");

    await user.selectOptions(within(drawer).getByLabelText("Тип"), "PURCHASE");
    expect(within(drawer).getByLabelText("Цена")).toHaveValue("3.00");
    await user.clear(within(drawer).getByLabelText("Цена"));
    await user.type(within(drawer).getByLabelText("Цена"), "99");
    await user.selectOptions(within(drawer).getByLabelText("Тип"), "RETURN_IN");
    expect(within(drawer).getByLabelText("Цена")).toHaveValue("0.45");

    const priceSort = within(drawer).getByRole("button", { name: "Сортировать по колонке Цена" });
    await user.click(priceSort);
    expect(priceSort.closest("[role=columnheader]")).toHaveAttribute("aria-sort", "ascending");
    await user.clear(within(drawer).getByLabelText("Цена"));
    await user.type(within(drawer).getByLabelText("Цена"), "1");
    expect(priceSort.closest("[role=columnheader]")).toHaveAttribute("aria-sort", "none");
  });

  test("imports a pasted list into an unsaved purchase draft", async () => {
    const user = userEvent.setup();
    const createCallsBeforeImport = vi.mocked(createDocument).mock.calls.length;
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("SO-001");

    await user.click(screen.getByRole("button", { name: "Импортировать список закупки" }));
    const dialog = screen.getByRole("dialog", { name: "Импорт списка закупки" });
    await user.type(within(dialog).getByLabelText("Текст списка закупки"), "Widget 2\nWidget 3");
    await user.click(within(dialog).getByRole("button", { name: "Разобрать список" }));
    expect(within(dialog).getAllByText("Готово")).toHaveLength(2);
    expect(within(dialog).getByText("После объединения: 1")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Перенести в закупку" }));

    const drawer = screen.getByRole("dialog", { name: "Новый документ" });
    expect(within(drawer).getByLabelText("Тип")).toHaveValue("PURCHASE");
    expect(within(drawer).getByRole("combobox", { name: "Товар" })).toHaveValue("SKU-1 · Widget");
    expect(within(drawer).getByLabelText("Количество")).toHaveValue("5");
    expect(within(drawer).getByLabelText("Цена")).toHaveValue("7.50");
    expect(createDocument).toHaveBeenCalledTimes(createCallsBeforeImport);
  });

  test("warns about insufficient stock while editing a sale draft", async () => {
    const user = userEvent.setup();
    vi.mocked(getStockBalance).mockResolvedValue({
      productId: "product-1",
      warehouseId: "warehouse-1",
      quantity: "1.000"
    });
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("SO-001");
    await user.click(screen.getByRole("button", { name: "Новый документ" }));

    const drawer = screen.getByRole("dialog", { name: "Новый документ" });
    const number = within(drawer).getByLabelText("Номер");
    await user.clear(number);
    await user.type(number, "SO-003");
    await user.selectOptions(within(drawer).getByLabelText("Склад"), "warehouse-1");
    const product = within(drawer).getByRole("combobox", { name: "Товар" });
    await user.click(product);
    await user.click(within(drawer).getByRole("option", { name: "SKU-1 · Widget" }));
    const quantity = within(drawer).getByLabelText("Количество");
    await user.clear(quantity);
    await user.type(quantity, "2");

    const alert = await within(drawer).findByRole("alert");
    expect(alert).toHaveTextContent("Недостаточно остатков для проведения");
    expect(alert).toHaveTextContent("SKU-1 · Widget");
    expect(alert).toHaveTextContent("доступно 1.000, требуется 2.000");
  });

  test("rejects transfer drafts with identical source and destination warehouses", async () => {
    const user = userEvent.setup();
    const transferLookups = {
      ...lookups,
      warehouses: [
        ...lookups.warehouses,
        { id: "warehouse-2", code: "RES", name: "Reserve", isActive: true, createdAt: "", updatedAt: "" }
      ]
    };
    vi.mocked(getDocumentLookups).mockResolvedValue(transferLookups);
    vi.mocked(createDocument).mockClear();
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("SO-001");
    await user.click(screen.getByRole("button", { name: "Новый документ" }));

    const drawer = screen.getByRole("dialog", { name: "Новый документ" });
    const number = within(drawer).getByLabelText("Номер");
    await user.clear(number);
    await user.type(number, "TR-002");
    await user.selectOptions(within(drawer).getByLabelText("Тип"), "TRANSFER");
    await user.selectOptions(within(drawer).getByLabelText("Склад-отправитель"), "warehouse-1");
    await user.selectOptions(within(drawer).getByLabelText("Склад-получатель"), "warehouse-1");
    const product = within(drawer).getByRole("combobox", { name: "Товар" });
    await user.click(product);
    await user.click(within(drawer).getByRole("option", { name: "SKU-1 · Widget" }));
    await user.click(within(drawer).getByRole("button", { name: "Сохранить черновик" }));

    expect(within(drawer).getAllByText("Склад-отправитель и склад-получатель должны отличаться.")).not.toHaveLength(0);
    expect(createDocument).not.toHaveBeenCalled();
  });

  test("opens posted documents read-only and confirms lifecycle actions", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("PO-001");

    await user.click(screen.getByRole("button", { name: "Открыть" }));
    const drawer = screen.getByRole("dialog", { name: "Документ" });
    expect(within(drawer).queryByRole("button", { name: "Сохранить черновик" })).not.toBeInTheDocument();
    await user.click(within(drawer).getByRole("button", { name: "Закрыть документ" }));

    await user.click(screen.getByRole("button", { name: "Отменить проведение" }));
    await user.click(within(screen.getByRole("dialog", { name: "Отменить проведение?" })).getByRole("button", { name: "Отменить проведение" }));
    expect(unpostDocument).toHaveBeenCalledWith("document-2");
  });

  test("sorts a posted document locally without updating it", async () => {
    const user = userEvent.setup();
    const updatesBeforeSort = vi.mocked(updateDocument).mock.calls.length;
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("PO-001");
    await user.click(screen.getByRole("button", { name: "Открыть" }));
    const drawer = screen.getByRole("dialog", { name: "Документ" });
    const sortButton = within(drawer).getByRole("button", { name: "Сортировать по колонке Товар" });
    await user.click(sortButton);
    expect(sortButton.closest("[role=columnheader]")).toHaveAttribute("aria-sort", "ascending");
    await user.click(sortButton);
    expect(sortButton.closest("[role=columnheader]")).toHaveAttribute("aria-sort", "descending");
    expect(updateDocument).toHaveBeenCalledTimes(updatesBeforeSort);
  });

  test("searches products by SKU and name and supports keyboard selection", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("SO-001");
    await user.click(screen.getByRole("button", { name: "Новый документ" }));

    const drawer = screen.getByRole("dialog", { name: "Новый документ" });
    const product = within(drawer).getByRole("combobox", { name: "Товар" });
    expect(product).toHaveAttribute("aria-expanded", "false");
    await user.click(product);
    expect(product).toHaveAttribute("aria-expanded", "true");
    expect(within(drawer).getByRole("listbox", { name: "Результаты поиска товаров" })).toBeInTheDocument();

    await user.type(product, "veg-2");
    expect(within(drawer).getByRole("option", { name: "VEG-2 · Carrot" })).toBeInTheDocument();
    expect(within(drawer).queryByRole("option", { name: "SKU-1 · Widget" })).not.toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");

    expect(product).toHaveValue("VEG-2 · Carrot");
    expect(product).toHaveAttribute("aria-expanded", "false");
  });

  test("opens product editing from search results without selecting or losing the document draft", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("SO-001");
    await user.click(screen.getByRole("button", { name: "Новый документ" }));

    const drawer = screen.getByRole("dialog", { name: "Новый документ" });
    const productInput = within(drawer).getByRole("combobox", { name: "Товар" });
    const number = within(drawer).getByLabelText("Номер");
    await user.clear(number);
    await user.type(number, "CUSTOM-DRAFT");
    await user.click(productInput);
    await user.click(within(drawer).getByRole("button", { name: "Изменить товар Carrot" }));

    const editor = screen.getByRole("dialog", { name: "Изменение записи" });
    expect(within(editor).getByLabelText("Наименование *")).toHaveValue("Carrot");
    expect(productInput).toHaveValue("");
    await user.click(within(editor).getByRole("button", { name: "Отмена" }));
    expect(within(drawer).getByLabelText("Номер")).toHaveValue("CUSTOM-DRAFT");
    expect(productInput).toHaveValue("");
  });

  test("edits a selected product and resets a removed unit to the updated base unit", async () => {
    const user = userEvent.setup();
    const updatedCarrot = {
      ...lookups.products[1],
      name: "Carrot updated",
      units: [],
      salePrice: "5.00",
      updatedAt: "2026-06-06T11:00:00.000Z"
    };
    vi.mocked(updateProduct).mockResolvedValue(updatedCarrot);
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("SO-001");
    await user.click(screen.getByRole("button", { name: "Новый документ" }));

    const drawer = screen.getByRole("dialog", { name: "Новый документ" });
    const productInput = within(drawer).getByRole("combobox", { name: "Товар" });
    await user.click(productInput);
    await user.click(within(drawer).getByRole("option", { name: "VEG-2 · Carrot" }));
    await user.selectOptions(within(drawer).getByLabelText("Единица"), "bunch");
    expect(within(drawer).getByLabelText("Цена")).toHaveValue("0.45");

    await user.click(within(drawer).getByRole("button", { name: "Изменить товар Carrot" }));
    const editor = screen.getByRole("dialog", { name: "Изменение записи" });
    const name = within(editor).getByLabelText("Наименование *");
    await user.clear(name);
    await user.type(name, "Carrot updated");
    await user.click(within(editor).getByRole("button", { name: "Удалить единицу bunch" }));
    await user.click(within(editor).getByRole("button", { name: "Сохранить" }));

    expect(updateProduct).toHaveBeenCalledWith("product-2", expect.objectContaining({
      name: "Carrot updated",
      units: []
    }));
    expect(await within(drawer).findByRole("combobox", { name: "Товар" })).toHaveValue("VEG-2 · Carrot updated");
    expect(within(drawer).getByLabelText("Единица")).toHaveValue("kg");
    expect(within(drawer).getByLabelText("Цена")).toHaveValue("5.00");
  });

  test("does not expose product editing in a read-only document", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("PO-001");
    await user.click(screen.getByRole("button", { name: "Открыть" }));

    const drawer = screen.getByRole("dialog", { name: "Документ" });
    expect(within(drawer).queryByRole("button", { name: "Изменить товар Widget" })).not.toBeInTheDocument();
  });

  test("shows an empty product search and creates a product for the current line", async () => {
    const user = userEvent.setup();
    const createdProduct = {
      id: "product-3",
      sku: "PRD-0001",
      name: "Tomato",
      description: null,
      unit: "kg",
      units: [],
      aliases: [],
      salePrice: "12.00",
      purchasePrice: "8.00",
      categoryId: "category-1",
      categoryName: "Vegetables",
      isActive: true,
      createdAt: "",
      updatedAt: ""
    };
    vi.mocked(createProduct).mockResolvedValue(createdProduct);
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("SO-001");
    await user.click(screen.getByRole("button", { name: "Новый документ" }));

    const drawer = screen.getByRole("dialog", { name: "Новый документ" });
    const product = within(drawer).getByRole("combobox", { name: "Товар" });
    await user.type(product, "missing");
    expect(within(drawer).getByText("Товары не найдены")).toHaveAttribute("role", "status");
    await user.click(within(drawer).getByRole("button", { name: "Создать новый товар" }));

    const dialog = screen.getByRole("dialog", { name: "Новый товар" });
    expect(within(dialog).getByLabelText("SKU")).toHaveValue("PRD-0001");
    await user.type(within(dialog).getByLabelText("Наименование"), "Tomato");
    await user.type(within(dialog).getByLabelText("Единица"), "kg");
    await user.type(within(dialog).getByLabelText("Цена закупки"), "8.00");
    await user.type(within(dialog).getByLabelText("Цена продажи"), "12.00");
    await user.selectOptions(within(dialog).getByLabelText("Категория"), "category-1");
    await user.click(within(dialog).getByRole("button", { name: "Создать и выбрать" }));

    expect(createProduct).toHaveBeenCalledWith({
      sku: "PRD-0001",
      name: "Tomato",
      unit: "kg",
      purchasePrice: "8.00",
      salePrice: "12.00",
      categoryId: "category-1",
      description: null
    });
    expect(await within(drawer).findByRole("combobox", { name: "Товар" })).toHaveValue("PRD-0001 · Tomato");
    expect(within(drawer).getByLabelText("Единица")).toHaveValue("kg");
    expect(within(drawer).getByLabelText("Цена")).toHaveValue("12.00");
    expect(screen.queryByRole("dialog", { name: "Новый товар" })).not.toBeInTheDocument();
  });

  test("explains insufficient stock with product and warehouse names", async () => {
    const user = userEvent.setup();
    vi.mocked(postDocument).mockRejectedValue(new ApiError(400, "INSUFFICIENT_STOCK", "Insufficient stock.", {
      productId: "product-1",
      warehouseId: "warehouse-1",
      availableQuantity: "2.000",
      requiredQuantity: "5.000"
    }));
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("SO-001");

    await user.click(screen.getByRole("button", { name: "Провести" }));
    const dialog = screen.getByRole("dialog", { name: "Провести документ?" });
    expect(within(dialog).getByLabelText("Предварительный просмотр движений")).toHaveTextContent("Расход");
    expect(within(dialog).getByLabelText("Предварительный просмотр движений")).toHaveTextContent("SKU-1 · Widget");
    expect(within(dialog).getByLabelText("Предварительный просмотр движений")).toHaveTextContent("MAIN · Main");
    await user.click(within(dialog).getByRole("button", { name: "Провести" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("SKU-1 · Widget");
    expect(screen.getByRole("alert")).toHaveTextContent("MAIN · Main");
    expect(screen.getByRole("alert")).toHaveTextContent("Доступно: 2.000, требуется: 5.000");
    expect(screen.getByRole("alert")).toHaveTextContent("проведите поступление или уменьшите количество продажи");
  });

  test("calculates deterministic decimal payload values", () => {
    expect(calculateAmount("1.5", "10")).toBe("15.00");
    expect(toDocumentPayload({
      number: " TR-1 ",
      type: "TRANSFER",
      documentDate: "2026-06-06",
      notes: "",
      warehouseId: "",
      sourceWarehouseId: "warehouse-1",
      destinationWarehouseId: "warehouse-2",
      counterpartyId: "",
      items: [{ key: "1", productId: "product-1", unit: "pcs", unitFactor: "1", quantity: "1.5", price: "10", warehouseId: "" }]
    })).toEqual(expect.objectContaining({
      number: "TR-1",
      notes: null,
      items: [expect.objectContaining({ unit: "pcs", quantity: "1.500", price: "10.00", amount: "15.00" })]
    }));
  });

  test("sorts document lines stably and keeps invalid values at the end", () => {
    const items = [
      { key: "empty", productId: "", unit: "", unitFactor: "1", quantity: "", price: "", warehouseId: "" },
      { key: "carrot-1", productId: "product-2", unit: "kg", unitFactor: "1", quantity: "2", price: "4", warehouseId: "" },
      { key: "widget", productId: "product-1", unit: "pcs", unitFactor: "1", quantity: "10", price: "3", warehouseId: "" },
      { key: "carrot-2", productId: "product-2", unit: "kg", unitFactor: "1", quantity: "2", price: "5", warehouseId: "" }
    ];

    expect(sortDocumentLines(items, lookups.products, "product", "ascending").map((item) => item.key))
      .toEqual(["carrot-1", "carrot-2", "widget", "empty"]);
    expect(sortDocumentLines(items, lookups.products, "quantity", "descending").map((item) => item.key))
      .toEqual(["widget", "carrot-1", "carrot-2", "empty"]);
    expect(toDocumentPayload({
      number: "PUR-1", type: "PURCHASE", documentDate: "2026-06-06", notes: "", warehouseId: "warehouse-1",
      sourceWarehouseId: "", destinationWarehouseId: "", counterpartyId: "",
      items: sortDocumentLines(items.slice(1), lookups.products, "product", "ascending")
    }).items.map((item) => item.productId)).toEqual(["product-2", "product-2", "product-1"]);
  });

  test("generates and downloads a document PDF", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<DocumentsPage />, "/documents");
    const row = await screen.findByRole("row", { name: /SO-001/ });

    await user.click(within(row).getByRole("button", { name: "Печать" }));

    expect(printDocument).toHaveBeenCalledWith("document-1");
    expect(downloadDocumentPdf).toHaveBeenCalledWith(expect.anything(), "SO-001.pdf");
    expect(vi.mocked(downloadDocumentPdf).mock.calls[0]?.[0].byteLength).toBeGreaterThan(0);
  });
});
