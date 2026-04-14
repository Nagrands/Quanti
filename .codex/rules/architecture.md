# Architecture Rules

Monorepo boundaries:
- `apps/desktop` owns UI, desktop shell wiring, and native integration calls.
- `apps/api` owns ERP business workflows, validation orchestration, and persistence-facing services.
- `packages/shared` is the only home for cross-layer DTOs, public contracts, shared enums, and shared types.
- `packages/db` is the only home for Prisma schema, migrations, generated client, and DB-level helpers.

Business logic placement:
- ERP business logic must live in backend services/modules.
- Controllers stay thin and must not contain posting, ledger, debt, or reporting logic.
- React components, hooks, and local stores must not implement ERP business rules.
- Tauri commands must not duplicate backend business logic.

Feature organization:
- Each new feature should be added vertically: backend module + shared contract + frontend feature.
- Prefer predictable ownership over wide shared utility layers.
- Keep modules small and explicit. Split files before they become monolithic.
- Frontend bootstrap should initialize modules and providers only. Feature behavior belongs in dedicated components, hooks, or services.

Do not:
- mix database rules into UI code
- couple the API to Tauri-specific UI behavior
- bypass shared contracts with ad hoc payloads
- put generated code or schema logic outside `packages/db`
