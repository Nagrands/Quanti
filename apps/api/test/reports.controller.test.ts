import assert from "node:assert/strict";
import test from "node:test";

import { ReportsController } from "../src/modules/reports/reports.controller";

test("reports controller delegates all report endpoints", async () => {
  const calls = {
    stockBalance: [] as Array<Record<string, unknown>>,
    stockTurnover: [] as Array<Record<string, unknown>>,
    balanceAtDate: [] as Array<Record<string, unknown>>,
    sales: [] as Array<Record<string, unknown>>,
    topProducts: [] as Array<Record<string, unknown>>,
    cashflow: [] as Array<Record<string, unknown>>,
    debts: [] as Array<Record<string, unknown>>
  };

  const controller = new ReportsController({
    getStockBalance: async (filter: Record<string, unknown>) => {
      calls.stockBalance.push(filter);
      return [];
    },
    getStockTurnover: async (filter: Record<string, unknown>) => {
      calls.stockTurnover.push(filter);
      return [];
    },
    getBalanceAtDate: async (filter: Record<string, unknown>) => {
      calls.balanceAtDate.push(filter);
      return [];
    },
    getSalesReport: async (filter: Record<string, unknown>) => {
      calls.sales.push(filter);
      return [];
    },
    getTopProducts: async (filter: Record<string, unknown>) => {
      calls.topProducts.push(filter);
      return [];
    },
    getCashflow: async (filter: Record<string, unknown>) => {
      calls.cashflow.push(filter);
      return [];
    },
    getCounterpartyDebtReport: async (filter: Record<string, unknown>) => {
      calls.debts.push(filter);
      return [];
    }
  } as never);

  await controller.getStockBalance({ at: "2026-04-16T00:00:00.000Z" });
  await controller.getStockTurnover({
    from: "2026-04-01T00:00:00.000Z",
    to: "2026-04-30T23:59:59.000Z"
  });
  await controller.getBalanceAtDate({ at: "2026-04-16T00:00:00.000Z" });
  await controller.getSalesReport({
    from: "2026-04-01T00:00:00.000Z",
    to: "2026-04-30T23:59:59.000Z"
  });
  await controller.getTopProducts({
    from: "2026-04-01T00:00:00.000Z",
    to: "2026-04-30T23:59:59.000Z",
    limit: 10
  });
  await controller.getCashflow({
    from: "2026-04-01T00:00:00.000Z",
    to: "2026-04-30T23:59:59.000Z"
  });
  await controller.getCounterpartyDebtReport({ at: "2026-04-30T23:59:59.000Z" });

  assert.equal(calls.stockBalance.length, 1);
  assert.equal(calls.stockTurnover.length, 1);
  assert.equal(calls.balanceAtDate.length, 1);
  assert.equal(calls.sales.length, 1);
  assert.equal(calls.topProducts.length, 1);
  assert.equal(calls.cashflow.length, 1);
  assert.equal(calls.debts.length, 1);
});
