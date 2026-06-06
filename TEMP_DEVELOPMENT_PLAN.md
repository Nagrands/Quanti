# Quanti Development Plan

Temporary working plan for incremental ERP delivery. Update this file after each completed step so the team can keep a stable reference point.

Status legend:
- `[x]` completed
- `[ ]` planned
- `[~]` in progress

## Stages

1. `[x]` Monorepo foundation
   - Create `pnpm` workspace and `turbo` pipeline.
   - Add root TypeScript config and shared path aliases.
   - Create baseline packages: `apps/api`, `apps/desktop`, `packages/shared`, `packages/db`.
   - Add PostgreSQL local environment bootstrap files.
   - Verify foundation with workspace validation, smoke tests, and typecheck.

2. `[x]` Database foundation
   - Install and configure Prisma in `packages/db`.
   - Define initial PostgreSQL schema for core ERP entities and ledger tables.
   - Add first migration flow and Prisma client generation.
   - Add tests/checks for schema validity and DB bootstrap.

3. `[x]` Shared contracts foundation
   - Add shared enums, identifiers, DTOs, and status models in `packages/shared`.
   - Define document, payment, warehouse, and reporting contract boundaries.
   - Add tests for contract imports and type-level consistency.

4. `[x]` Backend application skeleton
   - Initialize NestJS application structure in `apps/api`.
   - Create baseline modules: `products`, `documents`, `stock`, `payments`, `reports`.
   - Add common error handling and validation boundaries.
   - Add bootstrap and module wiring tests.
   - Note: stage completed with bootstrap health surface and baseline module registration; domain logic starts in stage 5.

5. `[x]` Products and master data module
   - Implement products, warehouses, counterparties, and accounts CRUD foundations.
   - Keep business rules in services and API contracts in shared types.
   - Add service and controller tests.

6. `[x]` Stock engine
   - Implement `StockService` based only on `stock_movements`.
   - Add balance calculation and reservation validation rules.
   - Add integration tests for balance correctness and race-sensitive flows.

7. `[x]` Document engine
   - Implement draft, post, unpost, and repost flows.
   - Generate movements from documents with transaction safety.
   - Enforce double-post prevention and negative stock rules.
   - Add integration tests for lifecycle and rollback behavior.

8. `[x]` Finance engine
   - Implement payments, money ledger, and payment allocations.
   - Add derived debt calculation per counterparty.
   - Add integration tests for partial payments and allocation correctness.

9. `[x]` Reporting engine
   - Implement stock, turnover, date-bounded balance, sales, top products, cashflow, and debt reports.
   - Base reports on ledger tables first.
   - Add correctness tests for report aggregates.

10. `[x]` Desktop shell foundation
    - Initialize Tauri project inside `apps/desktop`.
    - Add safe native command boundaries for file and dialog operations.
    - Add shell/bootstrap checks.

11. `[x]` Frontend application foundation
    - Initialize React application structure in `apps/desktop`.
    - Add routing, layout, API client/query layer, and common UI patterns.
    - Add smoke tests for app bootstrap and route rendering.
    - Note: completed with Vite, React Router, TanStack Query, responsive ERP shell, API health state, SCSS layers, and Vitest/Testing Library coverage.

12. `[x]` Products UI
    - Build master-data screens for products, warehouses, counterparties, and accounts.
    - Add table workflows, forms, and validation feedback.
    - Add UI tests for create/edit flows.
    - Note: completed with shared table/form infrastructure, search, create/edit drawers, explicit deactivation, responsive behavior, and CRUD/error tests.

13. `[x]` Documents UI
    - Build document list and document form with editable rows.
    - Add explicit `draft` and `posted` status states.
    - Add UI tests for create, edit, post, and unpost flows.
    - Note: completed with client-side filters, lookup-backed draft forms, calculated line totals, read-only posted documents, and confirmed lifecycle actions.

14. `[x]` Payments UI
    - Build payments list and payment allocation workflows.
    - Add UI tests for incoming, outgoing, and partial allocation scenarios.
    - Note: completed with payment filters, debt context, partial document allocations, read-only posted/cancelled states, confirmed lifecycle actions, and responsive UI coverage.

15. `[x]` Reports UI
    - Build report filters, tables, and export-ready views.
    - Add UI tests for report loading and filter behavior.
    - Note: completed with seven typed report views, lookup-backed filters, explicit UTC date boundaries, CSV export, responsive tables, and loading/empty/error coverage.

16. `[ ]` PDF printing
    - Implement backend Puppeteer + Handlebars printing flow.
    - Add configurable templates and document print endpoint.
    - Add frontend print triggers and smoke tests for render flow.

17. `[ ]` Cross-platform hardening
    - Validate macOS and Windows behavior for desktop shell and critical workflows.
    - Review packaging, filesystem access, and platform-specific edge cases.
    - Add targeted regression checks where needed.

18. `[ ]` Release readiness
    - Review documentation, changelog, onboarding, and runbooks.
    - Run final end-to-end verification for core ERP workflows.
    - Prepare first stable milestone.

## Update Rule

After each completed stage:
- change the marker from `[ ]` to `[x]`
- add a short note if scope changed
- keep the next active stage clear before starting implementation
