import type { ReportDefinition, ReportLookupMaps, ReportRows } from "./reports-model";

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
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
