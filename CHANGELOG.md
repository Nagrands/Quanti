# Changelog

All notable changes to Quanti are documented in this file.

## [Unreleased]

### Added

- Master data management for products, warehouses, counterparties, and accounts.
- Draft, post, unpost, and repost workflows for stock documents.
- Document stock warnings, transfer warehouse validation, and posting movement preview.
- Payment workflows, allocations, money movements, and counterparty debt.
- Ledger-based stock, sales, cashflow, top-product, and debt reports.
- PDF document printing with versioned database templates.
- React ERP workspace with API health status and responsive desktop layout.
- Switchable Russian and English localization for the ERP workspace, plus
  actionable structured stock error messages in document workflows.
- Master data filters, active/archive status badges, restore actions, and
  summary counters for products, warehouses, counterparties, and accounts.
- Database maintenance scripts for local backup, restore, reset, and Prisma Studio.
- Tauri file dialogs, validated import/export boundaries, and macOS/Windows bundles.
- Cross-platform CI packaging and PostgreSQL-backed release workflow checks.

### Known Limitations

- The packaged desktop client requires a separately deployed Quanti API and PostgreSQL.
- Installer signing and macOS notarization require release credentials and are not
  performed by the public CI workflow.
- Authentication, authorization, backup automation, and offline mode are outside
  the `0.1.0` milestone.
