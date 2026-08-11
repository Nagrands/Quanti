import assert from "node:assert/strict";
import test from "node:test";
import { createTransferPackage } from "@quanti/shared";

import { TransferService } from "../src/modules/transfer/transfer.service";

const emptyMasterData = { categories: [], products: [], warehouses: [], counterparties: [], accounts: [] };

function prismaForPreview(existingCategoryCodes: string[] = []) {
  return {
    productCategory: { findMany: async () => existingCategoryCodes.map((code) => ({ code })) },
    product: { findMany: async () => [] },
    warehouse: { findMany: async () => [] },
    counterparty: { findMany: async () => [] },
    account: { findMany: async () => [] },
    document: { findMany: async () => [] },
    payment: { findMany: async () => [] }
  };
}

test("transfer preview identifies new records, conflicts, and duplicate natural keys", async () => {
  const service = new TransferService(prismaForPreview(["EXISTING"]) as never);
  const transferPackage = createTransferPackage("master-data", {
    ...emptyMasterData,
    categories: [
      { code: "NEW", name: "New", description: null, isActive: true },
      { code: "EXISTING", name: "Existing", description: null, isActive: true },
      { code: "NEW", name: "Duplicate", description: null, isActive: true }
    ]
  });

  const result = await service.preview(transferPackage);
  assert.deepEqual(result.entries.map((entry) => [entry.key, entry.status]), [
    ["NEW", "invalid"], ["EXISTING", "conflict"], ["NEW", "invalid"]
  ]);
});

test("master-data import applies update or skip choices in one transaction", async () => {
  const updates: string[] = [];
  const tx = {
    productCategory: {
      findUnique: async ({ where }: any) => ["UPDATE", "SKIP"].includes(where.code) ? { id: `category-${where.code}` } : null,
      upsert: async ({ where }: any) => { updates.push(where.code); }
    },
    warehouse: { findUnique: async () => null, upsert: async () => undefined },
    counterparty: { findUnique: async () => null, upsert: async () => undefined },
    account: { findUnique: async () => null, upsert: async () => undefined },
    product: { findUnique: async () => null, upsert: async () => undefined },
    productUnit: { deleteMany: async () => undefined, createMany: async () => undefined }
  };
  const prisma = {
    ...prismaForPreview(["UPDATE", "SKIP"]),
    $transaction: async (callback: (client: typeof tx) => Promise<void>) => callback(tx)
  };
  const service = new TransferService(prisma as never);
  const transferPackage = createTransferPackage("master-data", {
    ...emptyMasterData,
    categories: [
      { code: "UPDATE", name: "Updated", description: null, isActive: true },
      { code: "SKIP", name: "Skipped", description: null, isActive: true }
    ]
  });

  const result = await service.apply(transferPackage, { "category:UPDATE": "update", "category:SKIP": "skip" });
  assert.deepEqual(result, { created: 0, updated: 1, skipped: 1 });
  assert.deepEqual(updates, ["UPDATE"]);
});

test("master-data import preserves product reference prices", async () => {
  let productData: Record<string, unknown> | undefined;
  const tx = {
    productCategory: { findUnique: async () => null, upsert: async () => undefined },
    warehouse: { findUnique: async () => null, upsert: async () => undefined },
    counterparty: { findUnique: async () => null, upsert: async () => undefined },
    account: { findUnique: async () => null, upsert: async () => undefined },
    product: {
      findUnique: async () => null,
      upsert: async ({ create }: { create: Record<string, unknown> }) => {
        productData = create;
        return { id: "product-1" };
      }
    },
    productUnit: { deleteMany: async () => undefined, createMany: async () => undefined }
  };
  const prisma = {
    ...prismaForPreview(),
    $transaction: async (callback: (client: typeof tx) => Promise<void>) => callback(tx)
  };
  const service = new TransferService(prisma as never);
  const transferPackage = createTransferPackage("master-data", {
    ...emptyMasterData,
    products: [{
      sku: "SKU-1", name: "Widget", description: null, unit: "pcs", units: [],
      purchasePrice: "8.50", salePrice: "12.00", categoryCode: null, isActive: true
    }]
  });

  await service.apply(transferPackage, {});
  assert.equal(String(productData?.purchasePrice), "8.5");
  assert.equal(String(productData?.salePrice), "12");
});

test("invalid transfer package is rejected before opening a transaction", async () => {
  let transactions = 0;
  const prisma = { ...prismaForPreview(), $transaction: async () => { transactions += 1; } };
  const service = new TransferService(prisma as never);
  await assert.rejects(() => service.apply({ format: "other" }, {}), /Invalid or unsupported/);
  assert.equal(transactions, 0);
});

test("preview reports unresolved document dependencies before apply", async () => {
  const service = new TransferService(prismaForPreview() as never);
  const transferPackage = createTransferPackage("documents", {
    masterData: emptyMasterData,
    documents: [{
      number: "SALE-1", type: "SALE", status: "DRAFT", documentDate: "2026-06-01T00:00:00.000Z", postedAt: null, notes: null,
      warehouseCode: "MISSING", sourceWarehouseCode: null, destinationWarehouseCode: null, counterpartyCode: null,
      items: [{ productSku: "NO-SKU", unit: "pcs", quantity: "1", price: "1", amount: "1", warehouseCode: null }]
    }]
  });
  const preview = await service.preview(transferPackage);
  assert.equal(preview.entries.find((entry) => entry.id === "document:SALE-1")?.status, "invalid");
});

test("posted document import rebuilds stock movements inside the import transaction", async () => {
  const movementBatches: unknown[] = [];
  const tx = {
    productCategory: { findUnique: async () => null, upsert: async () => undefined },
    warehouse: { findUnique: async ({ where }: any) => where.code === "MAIN" ? { id: "warehouse-1" } : null, upsert: async () => undefined },
    counterparty: { findUnique: async () => null, upsert: async () => undefined },
    account: { findUnique: async () => null, upsert: async () => undefined },
    product: { findUnique: async ({ where }: any) => where.sku === "SKU-1" ? { id: "product-1", unit: "pcs", units: [] } : null, upsert: async () => undefined },
    productUnit: { deleteMany: async () => undefined, createMany: async () => undefined },
    document: {
      findUnique: async () => null,
      create: async ({ data }: any) => ({ id: "document-1", ...data, warehouseId: "warehouse-1", sourceWarehouseId: null, destinationWarehouseId: null, items: [{ id: "item-1", productId: "product-1", warehouseId: null, quantity: { mul: () => ({ toString: () => "2", valueOf: () => 2 }) }, unitFactor: 1 }] }),
      update: async () => undefined
    },
    documentItem: { deleteMany: async () => undefined },
    stockMovement: { deleteMany: async () => undefined, findMany: async () => [], createMany: async ({ data }: any) => { movementBatches.push(data); } }
  };
  const prisma = {
    ...prismaForPreview(),
    product: { findMany: async () => [{ sku: "SKU-1" }] },
    warehouse: { findMany: async () => [{ code: "MAIN" }] },
    $transaction: async (callback: (client: typeof tx) => Promise<void>) => callback(tx)
  };
  const service = new TransferService(prisma as never);
  const transferPackage = createTransferPackage("documents", {
    masterData: emptyMasterData,
    documents: [{
      number: "PUR-1", type: "PURCHASE", status: "POSTED", documentDate: "2026-06-01T00:00:00.000Z", postedAt: "2026-06-02T00:00:00.000Z", notes: null,
      warehouseCode: "MAIN", sourceWarehouseCode: null, destinationWarehouseCode: null, counterpartyCode: null,
      items: [{ productSku: "SKU-1", unit: "pcs", quantity: "2", price: "5", amount: "10", warehouseCode: null }]
    }]
  });

  const result = await service.apply(transferPackage, {});
  assert.deepEqual(result, { created: 1, updated: 0, skipped: 0 });
  assert.equal(movementBatches.length, 1);
  assert.equal((movementBatches[0] as Array<{ direction: string }>)[0].direction, "IN");
});
