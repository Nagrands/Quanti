# Document Rules

Document lifecycle:
- Documents start as `draft`.
- Posting transitions a document from `draft` to `posted`.
- Unposting removes or reverses the accounting effect of a posted document.
- Reposting is a safe recompute flow, not a partial patch.

Posting rules:
- Posted documents are read-only unless they are explicitly unposted first.
- Posting generates ledger entries such as `stock_movements`.
- Prevent double posting at the service and data consistency levels.
- Negative stock prevention must be enforced according to project configuration.
- Posting and unposting must be rollback-safe.

Reposting rules:
- Reposting must use an explicit service flow.
- If dependent future documents need recalculation, chain reposting must be triggered from backend orchestration, not from UI-side loops.
- Do not allow ad hoc movement edits outside the document lifecycle.

Deletion rules:
- Draft documents may be deleted according to business rules.
- Deleting a posted document must not bypass the required unpost or reverse flow.
