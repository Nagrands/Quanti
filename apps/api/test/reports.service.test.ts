import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "@quanti/db";

import { ReportsService } from "../src/modules/reports/reports.service";

type QueryCapture = {
  strings: string[];
  values: unknown[];
};

function createReportsPrismaMock() {
  const captures: QueryCapture[] = [];
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
    captures,
    async $queryRaw(query: Prisma.Sql) {
      captures.push({
        strings: [...query.strings],
        values: [...query.values]
      });

      return queue.shift() ?? [];
    }
  };
}

function queryText(capture: QueryCapture) {
  return capture.strings.join("__VALUE__");
}

function dateValues(capture: QueryCapture) {
  return capture.values.filter((value): value is Date => value instanceof Date);
}

test("reports service maps report aggregates into DTOs", async () => {
  const prisma = createReportsPrismaMock();
  const service = new ReportsService(prisma as never);

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

test("reports service builds ledger-aware SQL with explicit date cutoffs", async () => {
  const prisma = createReportsPrismaMock();
  const service = new ReportsService(prisma as never);

  await service.getStockBalance({ at: "2026-04-30T23:59:59.000Z", warehouseId: "warehouse-1" });
  await service.getStockTurnover({
    from: "2026-04-01T00:00:00.000Z",
    to: "2026-04-30T23:59:59.000Z",
    productId: "product-1"
  });
  await service.getBalanceAtDate({ at: "2026-04-30T23:59:59.000Z" });
  await service.getSalesReport({
    from: "2026-04-01T00:00:00.000Z",
    to: "2026-04-30T23:59:59.000Z",
    counterpartyId: "counterparty-1"
  });
  await service.getTopProducts({
    from: "2026-04-01T00:00:00.000Z",
    to: "2026-04-30T23:59:59.000Z",
    warehouseId: "warehouse-1",
    limit: 5
  });
  await service.getCashflow({
    from: "2026-04-01T00:00:00.000Z",
    to: "2026-04-30T23:59:59.000Z",
    accountId: "account-1"
  });
  await service.getCounterpartyDebtReport({
    at: "2026-04-30T23:59:59.000Z",
    counterpartyId: "counterparty-1"
  });

  assert.equal(prisma.captures.length, 7);

  const stockBalanceQuery = prisma.captures[0];
  assert.match(queryText(stockBalanceQuery), /FROM "StockMovement" sm/);
  assert.match(queryText(stockBalanceQuery), /sm\."movementDate" <= __VALUE__/);
  assert.match(queryText(stockBalanceQuery), /SUM\(CASE[\s\S]*sm\."direction" = 'IN'[\s\S]*ELSE -sm\."quantity"/);
  assert.deepEqual(
    dateValues(stockBalanceQuery).map((value) => value.toISOString()),
    ["2026-04-30T23:59:59.000Z"]
  );
  assert.ok(stockBalanceQuery.values.includes("warehouse-1"));

  const turnoverQuery = prisma.captures[1];
  assert.match(queryText(turnoverQuery), /FROM "StockMovement" sm/);
  assert.match(queryText(turnoverQuery), /sm\."movementDate" >= __VALUE__/);
  assert.match(queryText(turnoverQuery), /sm\."movementDate" <= __VALUE__/);
  assert.match(queryText(turnoverQuery), /SUM\(CASE WHEN sm\."direction" = 'IN' THEN sm\."quantity" ELSE 0 END\)/);
  assert.match(queryText(turnoverQuery), /SUM\(CASE WHEN sm\."direction" = 'OUT' THEN sm\."quantity" ELSE 0 END\)/);
  assert.deepEqual(
    dateValues(turnoverQuery).map((value) => value.toISOString()),
    ["2026-04-01T00:00:00.000Z", "2026-04-30T23:59:59.000Z"]
  );
  assert.ok(turnoverQuery.values.includes("product-1"));

  const salesQuery = prisma.captures[3];
  assert.match(queryText(salesQuery), /FROM "Document" d/);
  assert.match(queryText(salesQuery), /INNER JOIN "DocumentItem" di ON di\."documentId" = d\."id"/);
  assert.match(queryText(salesQuery), /d\."type" = 'SALE'/);
  assert.match(queryText(salesQuery), /d\."postedAt" >= __VALUE__/);
  assert.match(queryText(salesQuery), /d\."postedAt" <= __VALUE__/);
  assert.ok(salesQuery.values.includes("counterparty-1"));

  const topProductsQuery = prisma.captures[4];
  assert.match(queryText(topProductsQuery), /FROM "Document" d/);
  assert.match(queryText(topProductsQuery), /GROUP BY di\."productId"/);
  assert.match(queryText(topProductsQuery), /ORDER BY SUM\(di\."amount"\) DESC/);
  assert.match(queryText(topProductsQuery), /LIMIT __VALUE__/);
  assert.ok(topProductsQuery.values.includes("warehouse-1"));
  assert.ok(topProductsQuery.values.includes(5));

  const cashflowQuery = prisma.captures[5];
  assert.match(queryText(cashflowQuery), /FROM "MoneyMovement" mm/);
  assert.match(queryText(cashflowQuery), /mm\."movementDate" >= __VALUE__/);
  assert.match(queryText(cashflowQuery), /mm\."movementDate" <= __VALUE__/);
  assert.match(queryText(cashflowQuery), /GROUP BY mm\."movementDate", mm\."accountId", mm\."counterpartyId"/);
  assert.ok(cashflowQuery.values.includes("account-1"));

  const debtQuery = prisma.captures[6];
  assert.match(queryText(debtQuery), /FROM "Document" d/);
  assert.match(queryText(debtQuery), /FROM "PaymentAllocation" pa/);
  assert.match(queryText(debtQuery), /INNER JOIN "Payment" p ON p\."id" = pa\."paymentId"/);
  assert.match(queryText(debtQuery), /INNER JOIN "MoneyMovement" mm ON mm\."paymentId" = p\."id"/);
  assert.match(queryText(debtQuery), /d\."postedAt" <= __VALUE__/);
  assert.match(queryText(debtQuery), /mm\."movementDate" <= __VALUE__/);
  assert.ok(debtQuery.values.includes("counterparty-1"));
});
