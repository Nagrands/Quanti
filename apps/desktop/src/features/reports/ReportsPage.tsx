import { useQuery } from "@tanstack/react-query";
import { Download, Play } from "lucide-react";
import { useMemo, useState } from "react";

import { ApiError } from "../../api/errors";
import { downloadReportCsv, reportToCsv } from "./report-export";
import { ReportTable } from "./ReportTable";
import { getReport, getReportLookups } from "./reports-api";
import {
  createReportFilters,
  reportDefinitions,
  toReportRequest,
  validateReportFilters,
  type ReportFilters,
  type ReportKind
} from "./reports-model";

const initialFilters = createReportFilters();

export function ReportsPage() {
  const [kind, setKind] = useState<ReportKind>("stock-turnover");
  const [filters, setFilters] = useState<ReportFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(initialFilters);
  const [validationError, setValidationError] = useState("");
  const definition = reportDefinitions.find((item) => item.kind === kind) ?? reportDefinitions[0];
  const request = useMemo(() => toReportRequest(definition, appliedFilters), [definition, appliedFilters]);
  const lookupsQuery = useQuery({ queryKey: ["report-lookups"], queryFn: getReportLookups });
  const reportQuery = useQuery({
    queryKey: ["report", kind, request],
    queryFn: () => getReport(kind, request)
  });

  const lookupMaps = useMemo(() => ({
    products: new Map((lookupsQuery.data?.products ?? []).map((item) => [item.id, `${item.sku} · ${item.name}`])),
    warehouses: new Map((lookupsQuery.data?.warehouses ?? []).map((item) => [item.id, `${item.code} · ${item.name}`])),
    counterparties: new Map((lookupsQuery.data?.counterparties ?? []).map((item) => [item.id, `${item.code} · ${item.name}`])),
    accounts: new Map((lookupsQuery.data?.accounts ?? []).map((item) => [item.id, `${item.code} · ${item.name}`]))
  }), [lookupsQuery.data]);
  const rows = reportQuery.data ?? [];

  function applyFilters() {
    const error = validateReportFilters(definition, filters);
    setValidationError(error);
    if (!error) setAppliedFilters({ ...filters });
  }

  function updateFilter(key: keyof ReportFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function exportCsv() {
    downloadReportCsv(
      `quanti-${kind}-${new Date().toISOString().slice(0, 10)}.csv`,
      reportToCsv(definition, rows, lookupMaps)
    );
  }

  return (
    <section className="page reports-page" aria-labelledby="reports-title">
      <header className="page__header"><h1 id="reports-title">Reports</h1></header>
      <nav className="section-tabs report-tabs" aria-label="Report type">
        {reportDefinitions.map((item) => <button className={`section-tabs__item ${item.kind === kind ? "section-tabs__item--active" : ""}`} aria-pressed={item.kind === kind} key={item.kind} onClick={() => { setKind(item.kind); setValidationError(""); }}>{item.label}</button>)}
      </nav>

      <div className="report-filters">
        {definition.dateMode === "range" ? <>
          <label>{definition.kind === "sales" || definition.kind === "top-products" ? "Posting from" : "From date"}<input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} /></label>
          <label>{definition.kind === "sales" || definition.kind === "top-products" ? "Posting to" : "To date"}<input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} /></label>
        </> : <label>{definition.dateMode === "at-optional" ? "At date (optional)" : "At date"}<input type="date" value={filters.at} onChange={(event) => updateFilter("at", event.target.value)} /></label>}
        {definition.filters.includes("warehouseId") ? <label>Warehouse<select value={filters.warehouseId} onChange={(event) => updateFilter("warehouseId", event.target.value)}><option value="">All warehouses</option>{lookupsQuery.data?.warehouses.map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name}</option>)}</select></label> : null}
        {definition.filters.includes("productId") ? <label>Product<select value={filters.productId} onChange={(event) => updateFilter("productId", event.target.value)}><option value="">All products</option>{lookupsQuery.data?.products.map((item) => <option value={item.id} key={item.id}>{item.sku} · {item.name}</option>)}</select></label> : null}
        {definition.filters.includes("accountId") ? <label>Account<select value={filters.accountId} onChange={(event) => updateFilter("accountId", event.target.value)}><option value="">All accounts</option>{lookupsQuery.data?.accounts.map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name}</option>)}</select></label> : null}
        {definition.filters.includes("counterpartyId") ? <label>Counterparty<select value={filters.counterpartyId} onChange={(event) => updateFilter("counterpartyId", event.target.value)}><option value="">All counterparties</option>{lookupsQuery.data?.counterparties.map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name}</option>)}</select></label> : null}
        {definition.filters.includes("limit") ? <label>Limit<input inputMode="numeric" value={filters.limit} onChange={(event) => updateFilter("limit", event.target.value)} /></label> : null}
        <div className="report-filters__actions">
          <button className="button button--primary" disabled={reportQuery.isFetching} onClick={applyFilters}><Play />{reportQuery.isFetching ? "Running…" : "Run report"}</button>
          <button className="button button--secondary" disabled={rows.length === 0} onClick={exportCsv}><Download />Export CSV</button>
        </div>
        {validationError ? <div className="form-alert report-filters__error" role="alert">{validationError}</div> : null}
      </div>

      <div className="data-table-frame report-results">
        {reportQuery.isPending ? <div className="table-state">Loading report data…</div>
          : reportQuery.isError ? <div className="table-state table-state--error"><strong>Unable to load report.</strong><span>{reportQuery.error instanceof ApiError ? reportQuery.error.message : "Try again."}</span><button className="button button--secondary" onClick={() => void reportQuery.refetch()}>Retry</button></div>
          : rows.length === 0 ? <div className="table-state"><strong>No report data</strong><span>Adjust the filters and run the report again.</span></div>
          : <ReportTable definition={definition} rows={rows} lookups={lookupMaps} />}
      </div>
    </section>
  );
}
