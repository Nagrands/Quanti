export const workspaceName = "quanti";

export * from "./identifiers";
export * from "./enums";
export * from "./master-data";
export * from "./documents";
export * from "./payments";
export * from "./reports";

export interface ReportContracts {
  stockBalanceFilter: import("./reports").StockBalanceReportFilterDto;
}
