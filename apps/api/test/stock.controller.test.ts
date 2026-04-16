import assert from "node:assert/strict";
import test from "node:test";

import { StockController } from "../src/modules/stock/stock.controller";

test("stock controller delegates balance and reserve requests to service", async () => {
  const calls = {
    balance: [] as Array<[string, string]>,
    reserve: [] as Array<Record<string, string>>
  };

  const controller = new StockController({
    getBalance: async (productId: string, warehouseId: string) => {
      calls.balance.push([productId, warehouseId]);
      return { productId, warehouseId, quantity: "6.000" };
    },
    reserveStock: async (payload: Record<string, string>) => {
      calls.reserve.push(payload);
      return { ...payload, quantity: "6.000", allowed: true };
    }
  } as never);

  const balance = await controller.getBalance({
    productId: "product-1",
    warehouseId: "warehouse-1"
  });
  const reserve = await controller.reserve({
    productId: "product-1",
    warehouseId: "warehouse-1",
    requiredQuantity: "5.000"
  });

  assert.equal(balance.quantity, "6.000");
  assert.equal(reserve.allowed, true);
  assert.deepEqual(calls.balance, [["product-1", "warehouse-1"]]);
  assert.deepEqual(calls.reserve, [{
    productId: "product-1",
    warehouseId: "warehouse-1",
    requiredQuantity: "5.000"
  }]);
});
