# Quanti

Quanti is an autonomous, cross-platform ERP desktop application built with Tauri,
React, NestJS, Prisma, and SQLite. The installed application contains its API,
database engine, and pinned headless Chromium: users do not need Docker,
PostgreSQL, Node.js, Chrome, or a separately started service.

Quanti 0.1.0 supports master data, stock documents, payments,
ledger-based reports, transfer packages, local backups, recovery, updates, and
PDF document printing.

## Download and install

Stable installers are published on the repository's **Releases** page:

- signed and notarized DMG for macOS 12+ on Apple Silicon;
- signed and notarized DMG for macOS 12+ on Intel;
- signed MSI for 64-bit Windows, including the WebView2 bootstrapper.

Only install assets attached to a published stable release. Workflow artifacts
and draft releases are test outputs and are not user distributions.

## Data and migration

Open Quanti normally after installation. On first launch, import the full
`quanti-transfer` v1 JSON exported from the former PostgreSQL version, review
the preview, and confirm the atomic import. The original JSON is never modified.

Quanti stores `quanti.sqlite3`, backups, and runtime logs in the operating
system's per-user application data directory. Application updates never replace
that directory. Quanti checkpoints SQLite and creates a backup before installing
an update. Manual backup, restore, and log export are available in Diagnostics.

## Development

Requirements for contributors are Node.js 22+, pnpm 10, Rust, and the Tauri
platform prerequisites. Docker and PostgreSQL are optional legacy-export tools,
not application runtime dependencies.

```bash
pnpm install
pnpm db:setup
pnpm dev
```

Build the autonomous installer for the current platform:

```bash
pnpm --filter @quanti/desktop tauri:build
```

This prepares the target-specific Node sidecar, Prisma SQLite engine, and pinned
Chromium before Tauri creates the bundle. See
[Development](docs/DEVELOPMENT.md), [Release](docs/RELEASE.md), and
[Contributing](CONTRIBUTING.md).

## Project layout

- `apps/api` — embedded NestJS ERP API
- `apps/desktop` — React frontend and Tauri lifecycle owner
- `packages/db` — Prisma SQLite schema and migrations
- `packages/shared` — stable REST and transfer contracts

## Verification

```bash
pnpm check
pnpm release:check
```

Release history is tracked in [CHANGELOG.md](CHANGELOG.md).

## Security and license

Report vulnerabilities through GitHub private vulnerability reporting as
described in [SECURITY.md](SECURITY.md). Quanti is available under the
[MIT License](LICENSE).
