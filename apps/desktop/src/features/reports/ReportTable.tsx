import type { ReportDefinition, ReportLookupMaps, ReportRows } from "./reports-model";

interface Props {
  definition: ReportDefinition;
  rows: ReportRows;
  lookups: ReportLookupMaps;
}

export function ReportTable({ definition, rows, lookups }: Props) {
  return (
    <div className="data-table-scroll">
      <table className="data-table report-table">
        <thead><tr>{definition.columns.map((column) => <th className={column.numeric ? "numeric" : ""} key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={`${definition.kind}-${index}`}>
          {definition.columns.map((column) => <td className={`${column.numeric ? "numeric" : ""} ${column.tone ? `report-value--${column.tone}` : ""}`} key={column.key}>{column.value(row, lookups)}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  );
}
