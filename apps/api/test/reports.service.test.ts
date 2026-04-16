import assert from "node:assert/strict";
import test from "node:test";

import { ReportsService } from "../src/modules/reports/reports.service";

function createReportsPrismaMock() {
  const queue = [
    [{ productId: "product-1", warehouseId: "warehouse-1", quantity: { toString: () => "8.000" } }],
    [{ productId: "product-1", warehouseId: "warehouse-1", incoming: { toString: () => "10.000" }, outgoing: { toString: () => "2.000" } }],
    [{ productId: "product-1", warehouseId: "warehouse-1", quantity: { toString: () => "8.000" } }],
    [{
      documentId: "document-1",
      documentDate: new Date("2026-04-16T00:00:00.000Z"),
      counterpartyId: "counterparty-1",
      productId: "product-1",
      quantity: { toString: () => "5.000" },
      amount: { toString: () => "150.00" }
    }],
    [{ productId: "product-1", quantity: { toString: () => "12.000" }, amount: { toString: () => "320.00" } }],
    [{
      movementDate: new Date("2026-04-16T10:00:00.000Z"),
      accountId: "account-1",
      counterpartyId: "counterparty-1",
      incoming: { toString: () => "150.00" },
      outgoing: { toString: () => "0.00" }
    }],
    [{
      counterpartyId: "counterparty-1",
      documentTotal: { toString: () => "150.00" },
      paidTotal: { toString: () => "100.00" },
      debtTotal: { toString: () => "50.00" }
    }]
  ];

  return {
    async $queryRaw() {
      return queue.shift() ?? [];
    }
  };
}

test("reports service maps stock, sales, cashflow, and debt aggregates", async () => {
  const service = new ReportsService(createReportsPrismaMock() as never);

  const stockBalance = await service.getStockBalance({ at: "2026-04-30T23:59:59.000Z" });
  const turnover = await service.getStockTurnover({
    from: "2026-04-01T00:00:00.000Z",
    to: "2026-04-30T23:59:59.000Z"
  });
  const balanceAtDate = await service.getBalanceAtDate({ at: "2026-04-30T23:59:59.000Z" });
  const sales = await service.getSalesReport({
    from: "2026-04-01T00:00:00.000Z",
    to: "2026-04-30T23:59:59.000Z"
  });
  const topProducts = await service.getTopProducts({
    from: "2026-04-01T00:00:00.000Z",
    to: "2026-04-30T23:59:59.000Z",
    limit: 5
  });
  const cashflow = await service.getCashflow({
    from: "2026-04-01T00:00:00.000Z",
    to: "2026-04-30T23:59:59.000Z"
  });
  const debts = await service.getCounterpartyDebtReport({ at: "2026-04-30T23:59:59.000Z" });

  assert.deepEqual(stockBalance, [{
    productId: "product-1",
    warehouseId: "warehouse-1",
    quantity: "8.000"
  }]);
  assert.deepEqual(turnover, [{
    productId: "product-1",
    warehouseId: "warehouse-1",
    incoming: "10.000",
    outgoing: "2.000"
  }]);
  assert.deepEqual(balanceAtDate, [{
    productId: "product-1",
    warehouseId: "warehouse-1",
    quantity: "8.000"
  }]);
  assert.deepEqual(sales, [{
    documentId: "document-1",
    documentDate: "2026-04-16T00:00:00.000Z",
    counterpartyId: "counterparty-1",
    productId: "product-1",
    quantity: "5.000",
    amount: "150.00"
  }]);
  assert.deepEqual(topProducts, [{
    productId: "product-1",
    quantity: "12.000",
    amount: "320.00"
  }]);
  assert.deepEqual(cashflow, [{
    movementDate: "2026-04-16T10:00:00.000Z",
    accountId: "account-1",
    counterpartyId: "counterparty-1",
    incoming: "150.00",
    outgoing: "0.00"
  }]);
  assert.deepEqual(debts, [{
    counterpartyId: "counterparty-1",
    documentTotal: "150.00",
    paidTotal: "100.00",
    debtTotal: "50.00"
  }]);
});
