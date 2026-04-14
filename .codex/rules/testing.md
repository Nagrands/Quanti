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

When the repo gains concrete scripts:
- Map required checks to actual commands and keep this file updated.
