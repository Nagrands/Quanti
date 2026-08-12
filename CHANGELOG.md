# Changelog

All notable changes to Quanti are documented in this file.

## [Unreleased]

## [0.1.0] - 2026-08-12

### Added

- Master data management for products, warehouses, counterparties, and accounts.
- Product categories with product grouping in master data.
- Draft, post, unpost, and repost workflows for stock documents.
- Document stock warnings, transfer warehouse validation, and posting movement preview.
- Editable auto-filled document numbers, product SKU values, and master-data codes.
- Searchable product selection and quick product creation inside document lines.
- Persistent light, dark, and system interface themes.
- Sequential draft document numbering, product unit conversions, and remembered sale and purchase prices.
- API development mode now restarts after backend changes, preventing stale API contracts from breaking product units and price columns.
- Payment workflows, allocations, money movements, and counterparty debt.
- Ledger-based stock, sales, cashflow, top-product, and debt reports.
- PDF document printing with versioned database templates.
- React ERP workspace with API health status and responsive desktop layout.
- Functional dashboard with monthly KPIs, recent activity, low-stock warnings,
  counterparty debts, and quick actions.
- Switchable Russian and English localization for the ERP workspace, plus
  actionable structured stock error messages in document workflows.
- Master data filters, active/archive status badges, restore actions, and
  summary counters for products, warehouses, counterparties, and accounts.
- Database maintenance scripts for local backup, restore, reset, and Prisma Studio.
- Tauri file dialogs, validated import/export boundaries, and macOS/Windows bundles.
- Autonomous Tauri runtime with a protected loopback API, embedded SQLite,
  target-specific Prisma and Chromium resources, recovery diagnostics, and
  single-instance behavior.
- Atomic PostgreSQL-to-SQLite transfer import with preview and per-record conflict
  decisions, plus local backup and restore workflows.
- Signed macOS arm64/x64 and Windows x64 draft-release automation with signed
  updater artifacts and a GitHub Releases `latest.json` manifest.
- Cross-platform CI for the SQLite ERP workflow and autonomous desktop bundles.

### Known limitations

- The first autonomous release requires a full `quanti-transfer` v1 export to
  migrate an existing PostgreSQL installation; it does not read PostgreSQL data
  directly.
- Stable installers require project-owned Apple, Windows, and Tauri signing
  credentials that are not included in the repository.
- Network multi-user deployment, accounts, and role-based access control are
  outside the 0.1.0 desktop scope.
- Publishing remains a manual release gate after clean-machine installation,
  signing, recovery, PDF, and updater smoke tests.
