import { Controller, Get, Query } from "@nestjs/common";

import {
  CashflowReportRequest,
  CounterpartyDebtReportRequest,
  SalesReportRequest,
  StockBalanceReportRequest,
  StockTurnoverReportRequest,
  TopProductsReportRequest
} from "./dto/report-requests";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("stock-balance")
  getStockBalance(@Query() filter: StockBalanceReportRequest) {
    return this.reportsService.getStockBalance(filter);
  }

  @Get("stock-turnover")
  getStockTurnover(@Query() filter: StockTurnoverReportRequest) {
    return this.reportsService.getStockTurnover(filter);
  }

  @Get("balance-at-date")
  getBalanceAtDate(@Query() filter: StockBalanceReportRequest) {
    return this.reportsService.getBalanceAtDate(filter);
  }

  @Get("sales")
  getSalesReport(@Query() filter: SalesReportRequest) {
    return this.reportsService.getSalesReport(filter);
  }

  @Get("top-products")
  getTopProducts(@Query() filter: TopProductsReportRequest) {
    return this.reportsService.getTopProducts(filter);
  }

  @Get("cashflow")
  getCashflow(@Query() filter: CashflowReportRequest) {
    return this.reportsService.getCashflow(filter);
  }

  @Get("counterparty-debts")
  getCounterpartyDebtReport(@Query() filter: CounterpartyDebtReportRequest) {
    return this.reportsService.getCounterpartyDebtReport(filter);
  }
}
