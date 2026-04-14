# Workflow Rules

Quanti uses the D.O.C.S. delivery cycle:
- `D - Discover`
- `O - Organize`
- `C - Check`
- `S - Share`

Discover
- Define the business problem in one or two sentences.
- Identify affected areas before editing: `db`, `documents`, `stock`, `finance`, `reports`, `desktop`, `ui`, `shared`.
- Confirm which domain invariants may be affected.

Organize
- Limit the change scope before implementation.
- Define the planned validation steps up front.
- Identify transaction, locking, reporting, and cross-layer risks early.
- Use agents when the task benefits from parallel exploration or clearly separated implementation ownership.
- Prefer reversible, modular changes over broad rewrites.

Check
- Run targeted tests and build checks for the touched area.
- Verify critical ERP invariants for affected workflows.
- Review the diff for boundary violations between UI, API, DB, and desktop layers.
- Until the scaffold exists, define expected checks conceptually and replace them with concrete commands later.

Share
- Update project docs when workflow, architecture, or contracts change.
- Keep `.codex/rules` synchronized with actual engineering practice.
- Summarize what changed, how it was checked, and any remaining limits.
