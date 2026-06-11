# Quanti

Quanti is a cross-platform ERP desktop application built with Tauri, React, NestJS,
Prisma, and PostgreSQL.

The upcoming `0.1.0` milestone supports master data, stock documents, payments, ledger-based
reports, and PDF document printing. The desktop application currently connects to
a separately running Quanti API and PostgreSQL database.

## Requirements

- Node.js 22 or newer
- pnpm 10
- Docker Desktop or another PostgreSQL 16 instance
- Rust toolchain and Tauri prerequisites for native desktop development

## Quick Start

```bash
pnpm install
pnpm db:setup
pnpm dev
```

`db:setup` creates a local `.env` from `.env.example` when it does not exist and
waits until PostgreSQL is ready before applying migrations.
Open `http://localhost:1420`. The API health endpoint is available at
`http://localhost:3100/health`.

To populate a repeatable demo workflow, keep the API running and execute:

```bash
pnpm demo:seed
```

For the native desktop window, run the API and Tauri in separate terminals:

```bash
pnpm dev:api
pnpm dev:tauri
```

See [Development](docs/DEVELOPMENT.md) for setup and troubleshooting and
[Release](docs/RELEASE.md) for verification and packaging.

## Project Layout

- `apps/api` - NestJS ERP backend
- `apps/desktop` - React frontend and Tauri shell
- `packages/db` - Prisma schema and migrations
- `packages/shared` - shared API contracts

## Verification

```bash
pnpm check
pnpm release:check
```

Release history is tracked in [CHANGELOG.md](CHANGELOG.md).
