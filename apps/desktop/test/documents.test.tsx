import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { DocumentsPage } from "../src/features/documents/DocumentsPage";
import {
  createDocument,
  deleteDocument,
  downloadDocumentPdf,
  getDocumentLookups,
  getDocuments,
  postDocument,
  printDocument,
  repostDocument,
  unpostDocument,
  updateDocument
} from "../src/features/documents/documents-api";
import { calculateAmount, toDocumentPayload } from "../src/features/documents/document-model";
import { renderWithAppProviders } from "./render-app";

vi.mock("../src/features/documents/documents-api", () => ({
  getDocuments: vi.fn(),
  getDocumentLookups: vi.fn(),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
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
  products: [{ id: "product-1", sku: "SKU-1", name: "Widget", description: null, unit: "pcs", isActive: true, createdAt: "", updatedAt: "" }],
  warehouses: [{ id: "warehouse-1", code: "MAIN", name: "Main", isActive: true, createdAt: "", updatedAt: "" }],
  counterparties: [{ id: "counterparty-1", code: "C-1", name: "Acme", type: "CUSTOMER" as const, taxId: null, isActive: true, createdAt: "", updatedAt: "" }]
};

describe("documents workspace", () => {
  beforeEach(() => {
    vi.mocked(getDocuments).mockResolvedValue([draft, posted]);
    vi.mocked(getDocumentLookups).mockResolvedValue(lookups);
    vi.mocked(createDocument).mockResolvedValue(draft);
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

  test("renders and filters draft and posted documents", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<DocumentsPage />, "/documents");

    expect(await screen.findByText("SO-001")).toBeInTheDocument();
    expect(screen.getByText("PO-001")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Status filter"), "POSTED");
    expect(screen.queryByText("SO-001")).not.toBeInTheDocument();
    expect(screen.getByText("PO-001")).toBeInTheDocument();
  });

  test("creates a draft with calculated line amount", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("SO-001");
    await user.click(screen.getByRole("button", { name: "New document" }));

    const drawer = screen.getByRole("complementary", { name: "New document" });
    await user.type(within(drawer).getByLabelText("Number"), "SO-002");
    await user.selectOptions(within(drawer).getByLabelText("Warehouse"), "warehouse-1");
    await user.selectOptions(within(drawer).getByLabelText("Product"), "product-1");
    const quantity = within(drawer).getByLabelText("Quantity");
    const price = within(drawer).getByLabelText("Price");
    await user.clear(quantity);
    await user.type(quantity, "2");
    await user.clear(price);
    await user.type(price, "12.50");
    expect(within(drawer).getAllByText("25.00")).toHaveLength(2);
    await user.click(within(drawer).getByRole("button", { name: "Save draft" }));

    expect(createDocument).toHaveBeenCalledWith(expect.objectContaining({
      number: "SO-002",
      warehouseId: "warehouse-1",
      items: [expect.objectContaining({ quantity: "2.000", price: "12.50", amount: "25.00" })]
    }));
  });

  test("opens posted documents read-only and confirms lifecycle actions", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<DocumentsPage />, "/documents");
    await screen.findByText("PO-001");

    await user.click(screen.getByRole("button", { name: "View" }));
    const drawer = screen.getByRole("complementary", { name: "Document details" });
    expect(within(drawer).queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
    await user.click(within(drawer).getByRole("button", { name: "Close document" }));

    await user.click(screen.getByRole("button", { name: "Unpost" }));
    await user.click(within(screen.getByRole("dialog", { name: "Unpost document?" })).getByRole("button", { name: "Confirm" }));
    expect(unpostDocument).toHaveBeenCalledWith("document-2");
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
      items: [{ key: "1", productId: "product-1", quantity: "1.5", price: "10", warehouseId: "" }]
    })).toEqual(expect.objectContaining({
      number: "TR-1",
      notes: null,
      items: [expect.objectContaining({ quantity: "1.500", price: "10.00", amount: "15.00" })]
    }));
  });

  test("generates and downloads a document PDF", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<DocumentsPage />, "/documents");
    const row = await screen.findByRole("row", { name: /SO-001/ });

    await user.click(within(row).getByRole("button", { name: "Print" }));

    expect(printDocument).toHaveBeenCalledWith("document-1");
    expect(downloadDocumentPdf).toHaveBeenCalledWith(expect.anything(), "SO-001.pdf");
    expect(vi.mocked(downloadDocumentPdf).mock.calls[0]?.[0].byteLength).toBeGreaterThan(0);
  });
});
