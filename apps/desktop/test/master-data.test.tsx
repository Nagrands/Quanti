import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { MasterDataPage } from "../src/features/master-data/MasterDataPage";
import {
  createMasterData,
  deactivateMasterData,
  getMasterData,
  updateMasterData
} from "../src/features/master-data/master-data-api";
import { renderWithAppProviders } from "./render-app";

vi.mock("../src/features/master-data/master-data-api", () => ({
  getMasterData: vi.fn(),
  createMasterData: vi.fn(),
  updateMasterData: vi.fn(),
  deactivateMasterData: vi.fn()
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

describe("master data workspace", () => {
  beforeEach(() => {
    vi.mocked(getMasterData).mockResolvedValue([product]);
    vi.mocked(createMasterData).mockResolvedValue(product);
    vi.mocked(updateMasterData).mockResolvedValue(product);
    vi.mocked(deactivateMasterData).mockResolvedValue(undefined);
  });

  test("loads products and filters the table", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<MasterDataPage />, "/products");

    expect(await screen.findByText("PRD-001")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Search products"), "missing");
    expect(screen.getByText("No matching records")).toBeInTheDocument();
  });

  test("validates and creates a product", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<MasterDataPage />, "/products");
    await screen.findByText("PRD-001");

    await user.click(screen.getByRole("button", { name: "New product" }));
    const drawer = screen.getByRole("complementary", { name: "New product" });
    await user.click(within(drawer).getByRole("button", { name: "Create product" }));
    expect(within(drawer).getByText("SKU is required.")).toBeInTheDocument();

    await user.type(within(drawer).getByLabelText("SKU *"), " PRD-002 ");
    await user.type(within(drawer).getByLabelText("Name *"), " Mouse ");
    await user.type(within(drawer).getByLabelText("Unit *"), " pcs ");
    await user.click(within(drawer).getByRole("button", { name: "Create product" }));

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

    await user.click(screen.getByRole("button", { name: "Edit Desk lamp" }));
    const drawer = screen.getByRole("complementary", { name: "Edit product" });
    const nameInput = within(drawer).getByLabelText("Name *");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated lamp");
    await user.click(within(drawer).getByRole("button", { name: "Save changes" }));
    expect(updateMasterData).toHaveBeenCalledWith(
      "products",
      "product-1",
      expect.objectContaining({ name: "Updated lamp" })
    );

    await user.click(screen.getByRole("button", { name: "Deactivate Desk lamp" }));
    const dialog = screen.getByRole("dialog", { name: "Deactivate product?" });
    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    expect(deactivateMasterData).toHaveBeenCalledWith("products", "product-1");
  });

  test("switches to every master-data resource", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<MasterDataPage />, "/products");
    await screen.findByText("PRD-001");

    for (const tab of ["Warehouses", "Counterparties", "Accounts"]) {
      vi.mocked(getMasterData).mockResolvedValueOnce([]);
      await user.click(screen.getByRole("button", { name: tab }));
      expect(await screen.findByText(`No ${tab.toLocaleLowerCase()} yet`)).toBeInTheDocument();
    }
  });
});
