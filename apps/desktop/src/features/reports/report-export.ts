import { createTransferPackage, type ReportSnapshotTransferPayload } from "@quanti/shared";
import type { Locale } from "../../i18n";
import type { ReportDefinition, ReportFilters, ReportLookupMaps, ReportRows } from "./reports-model";
import { saveTextExport } from "../../tauri-shell";

function csvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

export function reportToCsv(definition: ReportDefinition, rows: ReportRows, lookups: ReportLookupMaps) {
  const header = definition.columns.map((column) => csvCell(column.label)).join(",");
  const body = rows.map((row) => definition.columns
    .map((column) => csvCell(column.value(row, lookups)))
    .join(","));

  return [header, ...body].join("\n");
}

export function downloadReportCsv(fileName: string, contents: string) {
  return saveTextExport(fileName, contents);
}

export function reportToSnapshot(
  definition: ReportDefinition,
  filters: ReportFilters,
  rows: ReportRows,
  lookups: ReportLookupMaps,
  locale: Locale
) {
  const labels = locale === "ru"
    ? { from: "Дата с", to: "Дата по", at: "На дату", warehouseId: "Склад", productId: "Товар", accountId: "Счёт", counterpartyId: "Контрагент", limit: "Лимит" }
    : { from: "From date", to: "To date", at: "At date", warehouseId: "Warehouse", productId: "Product", accountId: "Account", counterpartyId: "Counterparty", limit: "Limit" };
  const displayValues: Partial<Record<keyof ReportFilters, Map<string, string>>> = {
    warehouseId: lookups.warehouses,
    productId: lookups.products,
    accountId: lookups.accounts,
    counterpartyId: lookups.counterparties
  };
  const payload: ReportSnapshotTransferPayload = {
    kind: definition.kind,
    title: definition.label,
    locale,
    filters: Object.entries(filters)
      .filter(([, value]) => value !== "")
      .map(([key, value]) => {
        const typedKey = key as keyof ReportFilters;
        return { label: labels[typedKey], value: displayValues[typedKey]?.get(value) ?? value };
      }),
    columns: definition.columns.map((column) => ({ key: column.key, label: column.label })),
    rows: rows.map((row) => Object.fromEntries(definition.columns.map((column) => [column.key, column.value(row, lookups)])))
  };
  return createTransferPackage("report-snapshot", payload);
}
