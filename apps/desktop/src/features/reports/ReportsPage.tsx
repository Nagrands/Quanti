import { useQuery } from "@tanstack/react-query";
import { Download, Play } from "lucide-react";
import { useMemo, useState } from "react";

import { useI18n } from "../../i18n";
import { downloadReportCsv, reportToCsv } from "./report-export";
import { ReportTable } from "./ReportTable";
import { getReport, getReportLookups } from "./reports-api";
import {
  createReportFilters,
  getLocalizedReportDefinitions,
  toReportRequest,
  validateReportFilters,
  type ReportFilters,
  type ReportKind
} from "./reports-model";

const initialFilters = createReportFilters();

export function ReportsPage() {
  const { formatApiError, locale, t } = useI18n();
  const [kind, setKind] = useState<ReportKind>("stock-turnover");
  const [filters, setFilters] = useState<ReportFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(initialFilters);
  const [validationError, setValidationError] = useState("");
  const definitions = useMemo(() => getLocalizedReportDefinitions(t, locale), [locale, t]);
  const definition = definitions.find((item) => item.kind === kind) ?? definitions[0];
  const request = useMemo(() => toReportRequest(definition, appliedFilters), [definition, appliedFilters]);
  const lookupsQuery = useQuery({ queryKey: ["report-lookups"], queryFn: getReportLookups });
  const reportQuery = useQuery({
    queryKey: ["report", kind, request],
    queryFn: () => getReport(kind, request)
  });

  const lookupMaps = useMemo(() => ({
    products: new Map((lookupsQuery.data?.products ?? []).map((item) => [item.id, `${item.sku} · ${item.name}`])),
    productUnits: new Map((lookupsQuery.data?.products ?? []).map((item) => [
      item.id,
      [item.unit, ...(item.units ?? []).map((unit) => unit.name)].join(", ")
    ])),
    warehouses: new Map((lookupsQuery.data?.warehouses ?? []).map((item) => [item.id, `${item.code} · ${item.name}`])),
    counterparties: new Map((lookupsQuery.data?.counterparties ?? []).map((item) => [item.id, `${item.code} · ${item.name}`])),
    accounts: new Map((lookupsQuery.data?.accounts ?? []).map((item) => [item.id, `${item.code} · ${item.name}`]))
  }), [lookupsQuery.data]);
  const rows = reportQuery.data ?? [];

  function applyFilters() {
    const error = t(validateReportFilters(definition, filters));
    setValidationError(error);
    if (!error) setAppliedFilters({ ...filters });
  }

  function updateFilter(key: keyof ReportFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function exportCsv() {
    void downloadReportCsv(
      `quanti-${kind}-${new Date().toISOString().slice(0, 10)}.csv`,
      reportToCsv(definition, rows, lookupMaps)
    );
  }

  return (
    <section className="page reports-page" aria-labelledby="reports-title">
      <header className="page__header"><h1 id="reports-title">{t("Отчёты")}</h1></header>
      <nav className="section-tabs report-tabs" aria-label={t("Тип отчёта")}>
        {definitions.map((item) => <button className={`section-tabs__item ${item.kind === kind ? "section-tabs__item--active" : ""}`} aria-pressed={item.kind === kind} key={item.kind} onClick={() => { setKind(item.kind); setValidationError(""); }}>{item.label}</button>)}
      </nav>

      <div className="report-filters">
        {definition.dateMode === "range" ? <>
          <label>{t(definition.kind === "sales" || definition.kind === "top-products" ? "Проведено с" : "Дата с")}<input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} /></label>
          <label>{t(definition.kind === "sales" || definition.kind === "top-products" ? "Проведено по" : "Дата по")}<input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} /></label>
        </> : <label>{t(definition.dateMode === "at-optional" ? "На дату (необязательно)" : "На дату")}<input type="date" value={filters.at} onChange={(event) => updateFilter("at", event.target.value)} /></label>}
        {definition.filters.includes("warehouseId") ? <label>{t("Склад")}<select value={filters.warehouseId} onChange={(event) => updateFilter("warehouseId", event.target.value)}><option value="">{t("Все склады")}</option>{lookupsQuery.data?.warehouses.map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name}</option>)}</select></label> : null}
        {definition.filters.includes("productId") ? <label>{t("Товар")}<select value={filters.productId} onChange={(event) => updateFilter("productId", event.target.value)}><option value="">{t("Все товары")}</option>{lookupsQuery.data?.products.map((item) => <option value={item.id} key={item.id}>{item.sku} · {item.name}</option>)}</select></label> : null}
        {definition.filters.includes("accountId") ? <label>{t("Счёт")}<select value={filters.accountId} onChange={(event) => updateFilter("accountId", event.target.value)}><option value="">{t("Все счета")}</option>{lookupsQuery.data?.accounts.map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name}</option>)}</select></label> : null}
        {definition.filters.includes("counterpartyId") ? <label>{t("Контрагент")}<select value={filters.counterpartyId} onChange={(event) => updateFilter("counterpartyId", event.target.value)}><option value="">{t("Все контрагенты")}</option>{lookupsQuery.data?.counterparties.map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name}</option>)}</select></label> : null}
        {definition.filters.includes("limit") ? <label>{t("Лимит")}<input inputMode="numeric" value={filters.limit} onChange={(event) => updateFilter("limit", event.target.value)} /></label> : null}
        <div className="report-filters__actions">
          <button className="button button--primary" disabled={reportQuery.isFetching} onClick={applyFilters}><Play />{t(reportQuery.isFetching ? "Формирование…" : "Сформировать")}</button>
          <button className="button button--secondary" disabled={rows.length === 0} onClick={exportCsv}><Download />{t("Экспорт CSV")}</button>
        </div>
        {validationError ? <div className="form-alert report-filters__error" role="alert">{validationError}</div> : null}
      </div>

      <div className="data-table-frame report-results">
        {reportQuery.isPending ? <div className="table-state">{t("Загрузка отчёта…")}</div>
          : reportQuery.isError ? <div className="table-state table-state--error"><strong>{t("Не удалось загрузить отчёт.")}</strong><span>{formatApiError(reportQuery.error)}</span><button className="button button--secondary" onClick={() => void reportQuery.refetch()}>{t("Повторить")}</button></div>
          : rows.length === 0 ? <div className="table-state"><strong>{t("Нет данных")}</strong><span>{t("Измените фильтры и сформируйте отчёт повторно.")}</span></div>
          : <ReportTable definition={definition} rows={rows} lookups={lookupMaps} />}
      </div>
    </section>
  );
}
