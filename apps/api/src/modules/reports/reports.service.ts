import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@quanti/db";
import type {
  CashflowReportFilterDto,
  CashflowReportRowDto,
  CounterpartyDebtReportFilterDto,
  CounterpartyDebtReportRowDto,
  SalesReportFilterDto,
  SalesReportRowDto,
  StockBalanceReportFilterDto,
  StockBalanceReportRowDto,
  StockTurnoverReportFilterDto,
  StockTurnoverReportRowDto,
  TopProductsReportFilterDto,
  TopProductsReportRowDto
} from "@quanti/shared";

import { PrismaService } from "../../common/prisma/prisma.service";
import {
  toCashflowRowDto,
  toCounterpartyDebtReportRowDto,
  toSalesReportRowDto,
  toStockBalanceRowDto,
  toStockTurnoverRowDto,
  toTopProductsReportRowDto
} from "./report.mappers";

type StockBalanceRow = {
  productId: string;
  warehouseId: string;
  quantity: Prisma.Decimal | string | number;
};

type StockTurnoverRow = {
  productId: string;
  warehouseId: string;
  incoming: Prisma.Decimal | string | number;
  outgoing: Prisma.Decimal | string | number;
};

type CashflowRow = {
  movementDate: Date | string;
  accountId: string;
  counterpartyId: string | null;
  incoming: Prisma.Decimal | string | number;
  outgoing: Prisma.Decimal | string | number;
};

type SalesRow = {
  documentId: string;
  documentDate: Date | string;
  counterpartyId: string | null;
  productId: string;
  quantity: Prisma.Decimal | string | number;
  amount: Prisma.Decimal | string | number;
};

type TopProductsRow = {
  productId: string;
  quantity: Prisma.Decimal | string | number;
  amount: Prisma.Decimal | string | number;
};

type CounterpartyDebtRow = {
  counterpartyId: string;
  documentTotal: Prisma.Decimal | string | number;
  paidTotal: Prisma.Decimal | string | number;
  debtTotal: Prisma.Decimal | string | number;
};

@Injectable()
export class ReportsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getStockBalance(filter: StockBalanceReportFilterDto): Promise<StockBalanceReportRowDto[]> {
    const conditions = [
      Prisma.sql`sm."movementDate" <= ${new Date(filter.at)}`
    ];

    if (filter.warehouseId) {
      conditions.push(Prisma.sql`sm."warehouseId" = ${filter.warehouseId}`);
    }
    if (filter.productId) {
      conditions.push(Prisma.sql`sm."productId" = ${filter.productId}`);
    }

    const rows = await this.prisma.$queryRaw<StockBalanceRow[]>(Prisma.sql`
      SELECT
        sm."productId" AS "productId",
        sm."warehouseId" AS "warehouseId",
        SUM(CASE
          WHEN sm."direction" = 'IN' THEN sm."quantity"
          ELSE -sm."quantity"
        END) AS "quantity"
      FROM "StockMovement" sm
      WHERE ${this.joinConditions(conditions)}
      GROUP BY sm."productId", sm."warehouseId"
      ORDER BY sm."warehouseId" ASC, sm."productId" ASC
    `);

    return rows.map(toStockBalanceRowDto);
  }

  async getStockTurnover(filter: StockTurnoverReportFilterDto): Promise<StockTurnoverReportRowDto[]> {
    const conditions = [
      Prisma.sql`sm."movementDate" >= ${new Date(filter.from)}`,
      Prisma.sql`sm."movementDate" <= ${new Date(filter.to)}`
    ];

    if (filter.warehouseId) {
      conditions.push(Prisma.sql`sm."warehouseId" = ${filter.warehouseId}`);
    }
    if (filter.productId) {
      conditions.push(Prisma.sql`sm."productId" = ${filter.productId}`);
    }

    const rows = await this.prisma.$queryRaw<StockTurnoverRow[]>(Prisma.sql`
      SELECT
        sm."productId" AS "productId",
        sm."warehouseId" AS "warehouseId",
        SUM(CASE WHEN sm."direction" = 'IN' THEN sm."quantity" ELSE 0 END) AS "incoming",
        SUM(CASE WHEN sm."direction" = 'OUT' THEN sm."quantity" ELSE 0 END) AS "outgoing"
      FROM "StockMovement" sm
      WHERE ${this.joinConditions(conditions)}
      GROUP BY sm."productId", sm."warehouseId"
      ORDER BY sm."warehouseId" ASC, sm."productId" ASC
    `);

    return rows.map(toStockTurnoverRowDto);
  }

  async getBalanceAtDate(filter: StockBalanceReportFilterDto): Promise<StockBalanceReportRowDto[]> {
    return this.getStockBalance(filter);
  }

  async getSalesReport(filter: SalesReportFilterDto): Promise<SalesReportRowDto[]> {
    const conditions = [
      Prisma.sql`d."status" = 'POSTED'`,
      Prisma.sql`d."type" = 'SALE'`,
      Prisma.sql`d."postedAt" >= ${new Date(filter.from)}`,
      Prisma.sql`d."postedAt" <= ${new Date(filter.to)}`
    ];

    if (filter.counterpartyId) {
      conditions.push(Prisma.sql`d."counterpartyId" = ${filter.counterpartyId}`);
    }
    if (filter.productId) {
      conditions.push(Prisma.sql`di."productId" = ${filter.productId}`);
    }

    const rows = await this.prisma.$queryRaw<SalesRow[]>(Prisma.sql`
      SELECT
        d."id" AS "documentId",
        d."documentDate" AS "documentDate",
        d."counterpartyId" AS "counterpartyId",
        di."productId" AS "productId",
        SUM(di."quantity") AS "quantity",
        SUM(di."amount") AS "amount"
      FROM "Document" d
      INNER JOIN "DocumentItem" di ON di."documentId" = d."id"
      WHERE ${this.joinConditions(conditions)}
      GROUP BY d."id", d."documentDate", d."counterpartyId", di."productId"
      ORDER BY d."documentDate" ASC, d."id" ASC
    `);

    return rows.map(toSalesReportRowDto);
  }

  async getTopProducts(filter: TopProductsReportFilterDto): Promise<TopProductsReportRowDto[]> {
    const conditions = [
      Prisma.sql`d."status" = 'POSTED'`,
      Prisma.sql`d."type" = 'SALE'`,
      Prisma.sql`d."postedAt" >= ${new Date(filter.from)}`,
      Prisma.sql`d."postedAt" <= ${new Date(filter.to)}`
    ];

    if (filter.warehouseId) {
      conditions.push(Prisma.sql`COALESCE(di."warehouseId", d."warehouseId") = ${filter.warehouseId}`);
    }

    const limit = filter.limit ?? 10;

    const rows = await this.prisma.$queryRaw<TopProductsRow[]>(Prisma.sql`
      SELECT
        di."productId" AS "productId",
        SUM(di."quantity") AS "quantity",
        SUM(di."amount") AS "amount"
      FROM "Document" d
      INNER JOIN "DocumentItem" di ON di."documentId" = d."id"
      WHERE ${this.joinConditions(conditions)}
      GROUP BY di."productId"
      ORDER BY SUM(di."amount") DESC, di."productId" ASC
      LIMIT ${limit}
    `);

    return rows.map(toTopProductsReportRowDto);
  }

  async getCashflow(filter: CashflowReportFilterDto): Promise<CashflowReportRowDto[]> {
    const conditions = [
      Prisma.sql`mm."movementDate" >= ${new Date(filter.from)}`,
      Prisma.sql`mm."movementDate" <= ${new Date(filter.to)}`
    ];

    if (filter.accountId) {
      conditions.push(Prisma.sql`mm."accountId" = ${filter.accountId}`);
    }
    if (filter.counterpartyId) {
      conditions.push(Prisma.sql`mm."counterpartyId" = ${filter.counterpartyId}`);
    }

    const rows = await this.prisma.$queryRaw<CashflowRow[]>(Prisma.sql`
      SELECT
        mm."movementDate" AS "movementDate",
        mm."accountId" AS "accountId",
        mm."counterpartyId" AS "counterpartyId",
        SUM(CASE WHEN mm."direction" = 'IN' THEN mm."amount" ELSE 0 END) AS "incoming",
        SUM(CASE WHEN mm."direction" = 'OUT' THEN mm."amount" ELSE 0 END) AS "outgoing"
      FROM "MoneyMovement" mm
      WHERE ${this.joinConditions(conditions)}
      GROUP BY mm."movementDate", mm."accountId", mm."counterpartyId"
      ORDER BY mm."movementDate" ASC, mm."accountId" ASC
    `);

    return rows.map(toCashflowRowDto);
  }

  async getCounterpartyDebtReport(
    filter: CounterpartyDebtReportFilterDto
  ): Promise<CounterpartyDebtReportRowDto[]> {
    const documentConditions = [
      Prisma.sql`d."status" = 'POSTED'`,
      Prisma.sql`d."counterpartyId" IS NOT NULL`
    ];
    const allocationConditions = [
      Prisma.sql`p."status" = 'POSTED'`,
      Prisma.sql`p."counterpartyId" IS NOT NULL`
    ];

    if (filter.at) {
      documentConditions.push(Prisma.sql`d."postedAt" <= ${new Date(filter.at)}`);
      allocationConditions.push(Prisma.sql`mm."movementDate" <= ${new Date(filter.at)}`);
    }
    if (filter.counterpartyId) {
      documentConditions.push(Prisma.sql`d."counterpartyId" = ${filter.counterpartyId}`);
      allocationConditions.push(Prisma.sql`p."counterpartyId" = ${filter.counterpartyId}`);
    }

    const rows = await this.prisma.$queryRaw<CounterpartyDebtRow[]>(Prisma.sql`
      WITH posted_documents AS (
        SELECT
          d."counterpartyId" AS "counterpartyId",
          COALESCE(SUM(d."totalAmount"), 0) AS "documentTotal"
        FROM "Document" d
        WHERE ${this.joinConditions(documentConditions)}
        GROUP BY d."counterpartyId"
      ),
      posted_allocations AS (
        SELECT
          p."counterpartyId" AS "counterpartyId",
          COALESCE(SUM(pa."amount"), 0) AS "paidTotal"
        FROM "PaymentAllocation" pa
        INNER JOIN "Payment" p ON p."id" = pa."paymentId"
        INNER JOIN "MoneyMovement" mm ON mm."paymentId" = p."id"
        WHERE ${this.joinConditions(allocationConditions)}
        GROUP BY p."counterpartyId"
      ),
      counterparties AS (
        SELECT "counterpartyId" FROM posted_documents
        UNION
        SELECT "counterpartyId" FROM posted_allocations
      )
      SELECT
        c."counterpartyId" AS "counterpartyId",
        COALESCE(d."documentTotal", 0) AS "documentTotal",
        COALESCE(a."paidTotal", 0) AS "paidTotal",
        COALESCE(d."documentTotal", 0) - COALESCE(a."paidTotal", 0) AS "debtTotal"
      FROM counterparties c
      LEFT JOIN posted_documents d ON d."counterpartyId" = c."counterpartyId"
      LEFT JOIN posted_allocations a ON a."counterpartyId" = c."counterpartyId"
      ORDER BY c."counterpartyId" ASC
    `);

    return rows.map(toCounterpartyDebtReportRowDto);
  }

  private joinConditions(conditions: Prisma.Sql[]) {
    return conditions.slice(1).reduce(
      (sql, condition) => Prisma.sql`${sql} AND ${condition}`,
      conditions[0] ?? Prisma.sql`1 = 1`
    );
  }
}
