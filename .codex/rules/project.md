# Quanti - Project Rules

Quanti is a cross-platform ERP desktop monorepo.

Canonical stack:
- Desktop shell: Tauri
- Frontend: React + TypeScript
- Backend: Node.js + NestJS
- ORM: Prisma
- Primary database: embedded SQLite
- Runtime: a loopback-only authenticated NestJS sidecar managed by Tauri
- PDF generation: Puppeteer + Handlebars

Canonical monorepo structure:
- `apps/api` -> NestJS backend
- `apps/desktop` -> Tauri desktop app with React frontend
- `packages/shared` -> shared DTOs, types, contracts, validation helpers
- `packages/db` -> Prisma schema, migrations, generated client, DB helpers

Runtime rules:
- Production bundles include the API sidecar, Prisma engine, SQLite migrations,
  and the Puppeteer-pinned Chromium build for the target architecture.
- Tauri owns sidecar startup, shutdown, authentication token, backup/recovery,
  and updater installation.
- PostgreSQL and Docker are legacy-export tooling only and must not become
  production runtime dependencies.

General rules:
- Follow the canonical monorepo layout unless the user explicitly requests a structural change.
- Do not introduce alternative framework branches for the same responsibility.
- Prefer extending existing modules and contracts over creating duplicates.
- Keep files small, focused, and ownership boundaries clear.
- Do not refactor unrelated areas without permission.
