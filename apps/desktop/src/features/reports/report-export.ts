import type { ReportDefinition, ReportLookupMaps, ReportRows } from "./reports-model";
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
