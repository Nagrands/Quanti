# Quanti - Project Rules

Quanti is a cross-platform ERP desktop monorepo.

Canonical stack:
- Desktop shell: Tauri
- Frontend: React + TypeScript
- Backend: Node.js + NestJS
- ORM: Prisma
- Primary database: PostgreSQL
- Optional offline database: SQLite, only as an explicit offline layer
- PDF generation: Puppeteer + Handlebars

Canonical monorepo structure:
- `apps/api` -> NestJS backend
- `apps/desktop` -> Tauri desktop app with React frontend
- `packages/shared` -> shared DTOs, types, contracts, validation helpers
- `packages/db` -> Prisma schema, migrations, generated client, DB helpers

General rules:
- Follow the canonical monorepo layout unless the user explicitly requests a structural change.
- Do not introduce alternative framework branches for the same responsibility.
- Prefer extending existing modules and contracts over creating duplicates.
- Keep files small, focused, and ownership boundaries clear.
- Do not refactor unrelated areas without permission.
