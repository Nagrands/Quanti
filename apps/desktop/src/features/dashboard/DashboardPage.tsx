import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { useI18n } from "../../i18n";
import { getDashboardData } from "./dashboard-api";
import { createDashboardSummary } from "./dashboard-model";

export function DashboardPage() {
  const { documentStatusLabels, documentTypeLabels, formatApiError, formatDate, locale, paymentDirectionLabels, paymentStatusLabels, t } = useI18n();
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData()
  });
  const summary = dashboardQuery.data ? createDashboardSummary(dashboardQuery.data) : null;
  const money = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <section className="page dashboard-page" aria-labelledby="dashboard-title">
      <header className="page__header">
        <p className="page__eyebrow">{t("Обзор")}</p>
        <h1 id="dashboard-title">{t("Главная")}</h1>
      </header>

      {dashboardQuery.isPending ? (
        <div className="workspace-panel workspace-panel--compact" role="status">{t("Загрузка главной…")}</div>
      ) : dashboardQuery.isError ? (
        <div className="workspace-panel workspace-panel--compact" role="alert">
          <div className="workspace-panel__content">
            <h2>{t("Не удалось загрузить главную")}</h2>
            <p>{formatApiError(dashboardQuery.error)}</p>
            <button type="button" className="button button--secondary" onClick={() => void dashboardQuery.refetch()}>{t("Повторить")}</button>
          </div>
        </div>
      ) : summary ? (
        <>
          <section className="dashboard-actions" aria-label={t("Быстрые действия")}>
            <Link className="dashboard-action" to="/documents">{t("Создать продажу")}</Link>
            <Link className="dashboard-action" to="/documents">{t("Создать закупку")}</Link>
            <Link className="dashboard-action" to="/payments">{t("Создать платёж")}</Link>
            <Link className="dashboard-action" to="/products">{t("Создать товар")}</Link>
          </section>

          <section className="dashboard-kpis" aria-label={t("Ключевые показатели")}>
            <article className="dashboard-card">
              <span>{t("Продажи за месяц")}</span>
              <strong>{money.format(summary.postedSalesTotal)}</strong>
            </article>
            <article className="dashboard-card">
              <span>{t("Входящие оплаты за месяц")}</span>
              <strong>{money.format(summary.incomingPaymentsTotal)}</strong>
            </article>
            <article className="dashboard-card dashboard-card--warning">
              <span>{t("Открытая задолженность")}</span>
              <strong>{money.format(summary.openDebtTotal)}</strong>
            </article>
            <article className="dashboard-card">
              <span>{t("Черновики документов")}</span>
              <strong>{summary.draftDocumentsCount}</strong>
            </article>
          </section>

          <div className="dashboard-grid">
            <section className="dashboard-panel">
              <header>
                <h2>{t("Последние документы")}</h2>
                <Link to="/documents">{t("Открыть")}</Link>
              </header>
              {summary.latestDocuments.length === 0 ? <p className="dashboard-empty">{t("Документов пока нет")}</p> : (
                <div className="dashboard-list">
                  {summary.latestDocuments.map((document) => (
                    <div className="dashboard-list__row" key={document.id}>
                      <div>
                        <strong>{document.number}</strong>
                        <span>{documentTypeLabels[document.type]} · {formatDate(document.documentDate)}</span>
                      </div>
                      <span className={`status-label status-label--${document.status.toLowerCase()}`}>{documentStatusLabels[document.status]}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-panel">
              <header>
                <h2>{t("Последние платежи")}</h2>
                <Link to="/payments">{t("Открыть")}</Link>
              </header>
              {summary.latestPayments.length === 0 ? <p className="dashboard-empty">{t("Платежей пока нет")}</p> : (
                <div className="dashboard-list">
                  {summary.latestPayments.map((payment) => (
                    <div className="dashboard-list__row" key={payment.id}>
                      <div>
                        <strong>{payment.number}</strong>
                        <span>{paymentDirectionLabels[payment.direction]} · {formatDate(payment.paymentDate)}</span>
                      </div>
                      <span>{paymentStatusLabels[payment.status]} · {payment.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-panel">
              <header>
                <h2>{t("Низкие остатки")}</h2>
                <Link to="/reports">{t("Отчёты")}</Link>
              </header>
              {summary.lowStockRows.length === 0 ? <p className="dashboard-empty">{t("Критичных остатков нет")}</p> : (
                <div className="dashboard-list">
                  {summary.lowStockRows.map((row) => (
                    <div className="dashboard-list__row" key={row.key}>
                      <div>
                        <strong>{row.productLabel}</strong>
                        <span>{row.warehouseLabel}</span>
                      </div>
                      <span>{row.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-panel">
              <header>
                <h2>{t("Долги контрагентов")}</h2>
                <Link to="/reports">{t("Отчёты")}</Link>
              </header>
              {summary.debtRows.length === 0 ? <p className="dashboard-empty">{t("Открытых долгов нет")}</p> : (
                <div className="dashboard-list">
                  {summary.debtRows.map((row) => (
                    <div className="dashboard-list__row" key={row.key}>
                      <div>
                        <strong>{row.counterpartyLabel}</strong>
                        <span>{t("Задолженность")}</span>
                      </div>
                      <span>{row.debtTotal}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
