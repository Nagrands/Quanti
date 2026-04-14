# Frontend Rules

Frontend structure:
- Frontend UI lives in `apps/desktop` unless a shared package is explicitly justified.
- Use React + TypeScript for all UI code.
- Keep feature-specific UI code close to its feature.

ERP UI rules:
- Prefer table-first workflows for master data, documents, payments, and reports.
- Forms should use a controlled form layer with explicit validation boundaries.
- API access should go through a dedicated client or query layer, not directly from arbitrary components.
- Inline editing is allowed only when state transitions remain explicit and predictable.
- Keyboard-heavy workflows must remain consistent across similar tables and forms.

State and logic rules:
- Do not implement posting, ledger, debt, or report business rules in components.
- Document forms own row editing UX, local draft state, and validation feedback only.
- Posting and unposting actions must call backend workflows.
- UI states for `draft`, `posted`, and `unposted` must be explicit and visually consistent.

Do not:
- hide status changes behind implicit side effects
- mix desktop-native concerns into presentational components
- bypass shared DTOs for API payloads
