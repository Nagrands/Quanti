# Testing Rules

General rules:
- Update tests whenever business behavior or user-visible behavior changes.
- Prefer focused tests near the affected domain rather than broad accidental coverage.

Minimum validation by change type:
- Ledger, posting, stock, and payment logic -> unit tests plus integration tests
- API contract changes -> DTO, validation, and error-shape tests
- Reporting changes -> query or service tests for correctness of aggregates
- UI workflow changes -> smoke tests for critical document, table, or payment flows

Critical invariants that must be tested:
- no negative stock violations where enforcement is enabled
- no double posting
- rollback safety on failed critical transactions
- consistent derived balances and debts after writes
- reposting does not leave orphaned or duplicated movements

Release validation:
- Run `pnpm check` and `pnpm release:check` in clean CI with Node.js 22 and pnpm 10.
- When local pnpm verification is blocked, use installed direct binaries for
  focused tests/typechecks and state that the aggregate command remains a CI gate.
- Validate macOS arm64, macOS x64, and Windows x64 bundles separately; unit and
  host-platform tests do not prove packaged behavior on another platform.
- A stable release also requires installed-app, signature, notarization, backup,
  PDF, and updater smoke tests.
