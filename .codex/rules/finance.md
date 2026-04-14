# Finance Rules

Ledger rules:
- Incoming payments increase the money ledger.
- Outgoing payments decrease the money ledger.
- Money balance is derived from `money_movements`, not stored directly.
- Counterparty debt is derived, not stored as the source of truth.

Allocation rules:
- `payment_allocations` must support partial allocations.
- One payment may be allocated to multiple documents.
- A document may be settled by multiple payments.
- Allocation and money movement flows must remain consistent inside one transactional boundary when they change together.

Modeling rules:
- Do not add direct balance columns to accounts or counterparties as authoritative values.
- Financial reports and debt calculations must read from ledger and allocation data.
- Keep payment direction, status, and business references explicit in shared contracts and schema enums.
