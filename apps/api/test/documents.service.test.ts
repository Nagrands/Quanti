import assert from "node:assert/strict";
import test from "node:test";

import { BadRequestException } from "@nestjs/common";
import { DocumentsService } from "../src/modules/documents/documents.service";

function createDocumentsPrismaMock() {
  const operations = {
    stockMovementCreateMany: [] as Array<Record<string, unknown>>,
    stockMovementDeleteMany: [] as Array<Record<string, unknown>>,
    documentStatusUpdates: [] as Array<Record<string, unknown>>,
    documentDeletes: [] as Array<Record<string, unknown>>,
    documentItemDeleteMany: [] as Array<Record<string, unknown>>
  };

  const draftDocument = {
    id: "document-1",
    number: "SO-0001",
    type: "SALE",
    status: "DRAFT",
    documentDate: new Date("2026-04-16T00:00:00.000Z"),
    postedAt: null,
    notes: null,
    totalAmount: 15_000n,
    warehouseId: "warehouse-1",
    sourceWarehouseId: null,
    destinationWarehouseId: null,
    counterpartyId: "counterparty-1",
    items: [{
      id: "item-1",
      documentId: "document-1",
      productId: "product-1",
      unit: "box",
      unitFactor: 2_000_000n,
      lineNo: 1,
      quantity: 5_000n,
      price: 3_000n,
      amount: 15_000n,
      warehouseId: null,
      createdAt: new Date("2026-04-16T00:00:00.000Z"),
      updatedAt: new Date("2026-04-16T00:00:00.000Z")
    }],
    createdAt: new Date("2026-04-16T00:00:00.000Z"),
    updatedAt: new Date("2026-04-16T00:00:00.000Z")
  };

  let currentDocument = { ...draftDocument };

  const tx = {
    document: {
      findUnique: async () => currentDocument,
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        ...currentDocument,
        ...data,
        items: draftDocument.items
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        operations.documentStatusUpdates.push(data);
        currentDocument = {
          ...currentDocument,
          ...data
        };
        return currentDocument;
      },
      delete: async ({ where }: { where: Record<string, unknown> }) => {
        operations.documentDeletes.push(where);
        return currentDocument;
      }
    },
    documentItem: {
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        operations.documentItemDeleteMany.push(where);
      },
      createMany: async () => undefined
    },
    stockMovement: {
      createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
        operations.stockMovementCreateMany.push({ data });
      },
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        operations.stockMovementDeleteMany.push(where);
      }
    }
  };

  return {
    operations,
    tx,
    document: tx.document,
    documentItem: tx.documentItem,
    stockMovement: tx.stockMovement,
    $transaction: async <T>(callback: (inner: typeof tx) => Promise<T>) => callback(tx),
    getDocument: () => currentDocument,
    setDocumentStatus(status: "DRAFT" | "POSTED") {
      currentDocument = {
        ...currentDocument,
        status,
        postedAt: status === "POSTED" ? new Date("2026-04-16T10:00:00.000Z") : null
      };
    }
  };
}

test("documents service posts a draft document and creates stock movements", async () => {
  const prisma = createDocumentsPrismaMock();
  const stockService = {
    assertAvailableStock: async () => ({
      productId: "product-1",
      warehouseId: "warehouse-1",
      quantity: "10.000"
    })
  };
  const service = new DocumentsService(prisma as never, stockService as never);

  const result = await service.post("document-1", "2026-04-16T10:00:00.000Z");

  assert.equal(result.status, "POSTED");
  assert.equal(prisma.operations.stockMovementCreateMany.length, 1);
  assert.deepEqual(
    (prisma.operations.stockMovementCreateMany[0].data as Array<{ quantity: bigint }>)[0].quantity,
    10_000n
  );
  assert.deepEqual(prisma.operations.documentStatusUpdates.at(-1), {
    status: "POSTED",
    postedAt: new Date("2026-04-16T10:00:00.000Z")
  });
});

test("documents service prevents double posting", async () => {
  const prisma = createDocumentsPrismaMock();
  prisma.setDocumentStatus("POSTED");
  const service = new DocumentsService(prisma as never, { assertAvailableStock: async () => undefined } as never);

  await assert.rejects(() => service.post("document-1"), (error: unknown) => error instanceof BadRequestException);
});

test("documents service unposts posted documents and removes movements", async () => {
  const prisma = createDocumentsPrismaMock();
  prisma.setDocumentStatus("POSTED");
  const service = new DocumentsService(prisma as never, { assertAvailableStock: async () => undefined } as never);

  const result = await service.unpost("document-1");

  assert.equal(result.status, "DRAFT");
  assert.deepEqual(prisma.operations.stockMovementDeleteMany.at(-1), { documentId: "document-1" });
});

test("documents service reposts by deleting old movements and creating new ones", async () => {
  const prisma = createDocumentsPrismaMock();
  prisma.setDocumentStatus("POSTED");
  const stockService = {
    assertAvailableStock: async () => ({
      productId: "product-1",
      warehouseId: "warehouse-1",
      quantity: "10.000"
    })
  };
  const service = new DocumentsService(prisma as never, stockService as never);

  const result = await service.repost({
    id: "document-1",
    postedAt: "2026-04-16T11:00:00.000Z"
  });

  assert.equal(result.status, "POSTED");
  assert.equal(prisma.operations.stockMovementDeleteMany.length, 1);
  assert.equal(prisma.operations.stockMovementCreateMany.length, 1);
});

test("documents service rejects units that are not configured for the product", async () => {
  const tx = {
    product: {
      findMany: async () => [{
        id: "product-1",
        unit: "kg",
        isActive: true,
        units: []
      }]
    },
    document: {
      create: async () => {
        throw new Error("Document must not be created.");
      }
    }
  };
  const prisma = {
    $transaction: async <T>(callback: (client: typeof tx) => Promise<T>) => callback(tx)
  };
  const service = new DocumentsService(
    prisma as never,
    { assertAvailableStock: async () => undefined } as never
  );

  await assert.rejects(() => service.createDraft({
    number: "PUR-202606-0001",
    type: "PURCHASE",
    documentDate: "2026-06-24T00:00:00.000Z",
    warehouseId: "warehouse-1",
    items: [{
      productId: "product-1",
      unit: "bunch",
      quantity: "1.000",
      price: "10.00",
      amount: "10.00"
    }]
  }), (error: unknown) => error instanceof BadRequestException);
});
