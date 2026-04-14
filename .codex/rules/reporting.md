# Reporting Rules

Reporting source rules:
- Reports must aggregate from ledger tables first.
- Stock reports should read from `stock_movements`.
- Finance reports should read from `money_movements` and allocation data.
- Direct document aggregation is allowed only when the ledger does not represent the required business question.

Baseline report expectations:
- stock balance
- stock turnover
- balance at date
- sales report
- top products
- cashflow
- debt by counterparty

Query rules:
- Date-bounded reports must define their time cutoff explicitly.
- Keep incoming and outgoing flows explicit in report logic.
- Add indexes, caches, or materialized views only as optimization layers.
- Optimizations must have a rebuild or invalidation strategy and must not replace ledger truth.
