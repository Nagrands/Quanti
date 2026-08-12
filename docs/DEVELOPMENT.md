# Development

## Requirements

- Node.js 22 or newer and pnpm 10
- stable Rust with `rustfmt` and `clippy`
- Tauri prerequisites for the host platform

Docker and PostgreSQL are needed only when exporting a legacy installation.

## First run

```bash
pnpm install
pnpm db:setup
```

`db:setup` generates Prisma Client and applies the dedicated SQLite migration
chain. The default development database is `.quanti-data/quanti.sqlite3`.
Existing `.env` files are not overwritten; replace an old PostgreSQL
`DATABASE_URL` only after exporting the legacy database to a full
`quanti-transfer` v1 package.

## Run modes

Browser development keeps the established fallback API URL:

```bash
pnpm dev
```

Components can also be started separately with `pnpm dev:api` and
`pnpm dev:desktop`. The native production-equivalent lifecycle is exercised by:

```bash
pnpm autonomous:prepare
pnpm dev:tauri
```

The installed build does not use port 3100. Tauri selects a free loopback port,
creates a random bearer token, starts the sidecar, waits for its protected
health check, and then shows the window.

Autonomous preparation resolves all bundled resources from
`TAURI_ENV_TARGET_TRIPLE`. This is required when producing an artifact for a
different CPU architecture than the current host.

## Database maintenance

```bash
pnpm db:backup
pnpm db:restore -- backups/manual.sqlite3
pnpm db:reset -- --force
pnpm db:studio
```

SQLite runs in WAL mode with foreign keys, a busy timeout, and serialized write
transactions. Migrations create a timestamped copy before changing an existing
database. Manual backup and log export are also available under Settings →
About and diagnostics.

`pnpm legacy:db:up` and `pnpm legacy:db:down` exist only for exporting a former
PostgreSQL installation. Docker is not part of the current application runtime.

## PDF

Autonomous preparation downloads the Puppeteer-pinned `chrome-headless-shell`
for the current platform and includes it as a private bundle resource. In
production the API accepts only `QUANTI_CHROMIUM_PATH` supplied by Tauri and
blocks external requests from print pages. Development can use an explicitly
configured or system Chromium.

## Troubleshooting

If startup fails, the recovery screen can retry, save the runtime log, or
restore the latest backup. The data path, schema version, application version,
manual backup, log export, and updater are available in diagnostics.

For a stale development API, stop the process and restart `pnpm dev:api`. After
schema changes run `pnpm db:generate && pnpm db:migrate`.

## Verification

```bash
pnpm check
pnpm release:check
```

The release check verifies version metadata, tests the workspace, builds all
packages, and runs the protected SQLite API workflow. If a locally installed
pnpm executable cannot verify its native binary, do not alter lockfiles or
package-manager configuration: run the installed package-level binaries for
focused validation and keep the clean GitHub Actions run as the aggregate gate.
