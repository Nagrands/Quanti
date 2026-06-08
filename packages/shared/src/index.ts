export const workspaceName = "quanti";

export * from "./identifiers";
export * from "./enums";
export * from "./master-data";
export * from "./documents";
export * from "./payments";
export * from "./printing";
export * from "./reports";
export * from "./stock";

export interface ReportContracts {
  stockBalanceFilter: import("./reports").StockBalanceReportFilterDto;
  stockTurnoverFilter: import("./reports").StockTurnoverReportFilterDto;
  cashflowFilter: import("./reports").CashflowReportFilterDto;
}
