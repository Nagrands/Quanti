# Database Rules

ERP source-of-truth rules:
- Never store stock balance as the authoritative source of truth.
- Never store money balance as the authoritative source of truth.
- Stock must be derived from `stock_movements`.
- Money must be derived from `money_movements`.
- All business state changes must flow through documents or payments.

Allowed exception:
- `stock_balances` may exist only as a rebuildable cache or optimization layer.
- Cached balances must never become the only source for correctness checks.

Prisma and schema rules:
- Prisma schema and migrations live only in `packages/db`.
- Use explicit relations and explicit enum types for statuses, directions, and document categories.
- Include audit metadata on mutable domain entities.
- Use soft delete only when semantics, filters, and restoration rules are defined up front.
- Avoid denormalized totals unless they are clearly marked as caches with rebuild strategy.

Write-path rules:
- All critical write paths must be transaction-safe.
- Use row-level locking or equivalent coordination for operations that can race on the same business records.
- Validation for stock and money consistency must run inside the same transactional flow as the write.
- Rebuild and reporting optimizations must not weaken correctness guarantees.
