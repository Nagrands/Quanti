import assert from "node:assert/strict";
import test from "node:test";

import { BadRequestException } from "@nestjs/common";

import { StockService } from "../src/modules/stock/stock.service";

function createStockPrismaMock() {
  const operations = {
    lockCalls: [] as unknown[],
    transactionCalls: 0
  };

  const movements = [
    { direction: "IN", quantity: 10_000n },
    { direction: "OUT", quantity: 4_000n }
  ];

  const tx = {
    stockMovement: {
      findMany: async () => movements
    }
  };

  return {
    operations,
    tx,
    stockMovement: tx.stockMovement,
    $transaction: async <T>(callback: (inner: typeof tx) => Promise<T>) => {
      operations.transactionCalls += 1;
      return callback(tx);
    }
  };
}

test("stock service computes balance only from stock movements", async () => {
  const prisma = createStockPrismaMock();
  const service = new StockService(prisma as never);

  const balance = await service.getBalance("product-1", "warehouse-1");

  assert.deepEqual(balance, {
    productId: "product-1",
    warehouseId: "warehouse-1",
    quantity: "6.000"
  });
});

test("stock service validates reservation inside a SQLite transaction", async () => {
  const prisma = createStockPrismaMock();
  const service = new StockService(prisma as never);

  const result = await service.reserveStock({
    productId: "product-1",
    warehouseId: "warehouse-1",
    requiredQuantity: "5.000"
  });

  assert.equal(result.allowed, true);
  assert.equal(result.availableQuantity, "6.000");
  assert.equal(result.quantity, "6.000");
  assert.equal(result.requiredQuantity, "5.000");
  assert.equal(prisma.operations.transactionCalls, 1);
  assert.equal(prisma.operations.lockCalls.length, 0);
});

test("stock service rejects reservation when stock is insufficient", async () => {
  const prisma = createStockPrismaMock();
  const service = new StockService(prisma as never);

  await assert.rejects(
    () =>
      service.reserveStock({
        productId: "product-1",
        warehouseId: "warehouse-1",
        requiredQuantity: "7.000"
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.deepEqual(error.getResponse(), {
        code: "INSUFFICIENT_STOCK",
        message: "Insufficient stock.",
        details: {
          productId: "product-1",
          warehouseId: "warehouse-1",
          availableQuantity: "6.000",
          requiredQuantity: "7.000"
        }
      });

      return true;
    }
  );
});
