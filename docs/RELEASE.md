# Release Runbook

## Scope

The upcoming `0.1.0` release is a developer milestone. It verifies the ERP workflows and
desktop bundles, while the API and PostgreSQL remain separately deployed services.
The API production process can be started with `pnpm --filter @quanti/api start`
after deployment dependencies and environment variables are installed.

## Verification

From a clean dependency installation:

```bash
pnpm install --frozen-lockfile
pnpm release:check
```

Run the core workflow against PostgreSQL:

```bash
pnpm db:setup
pnpm dev:api
pnpm demo:seed
```

Verify in the desktop UI:

1. API status changes to connected.
2. Master data lists contain the demo records.
3. The purchase and sale are posted.
4. Stock balance reflects 8 units.
5. The incoming payment is posted and partially allocated.
6. Reports load and CSV export succeeds.
7. Document PDF export opens a native save dialog.

The demo seed uses the current UTC month and validates stock, customer debt,
sales, and cashflow responses before reporting success.

## Packaging

Build local platform artifacts:

```bash
pnpm --filter @quanti/desktop tauri:build
```

CI builds macOS and Windows bundles from
`.github/workflows/desktop-cross-platform.yml` and uploads the bundle directories.

## Release Checklist

- Update versions in root, desktop, API, database, shared, and Tauri manifests.
- Update `CHANGELOG.md` with an absolute release date.
- Run `pnpm release:check`.
- Apply all Prisma migrations against a release-like PostgreSQL instance.
- Complete the core workflow verification above.
- Build and inspect macOS and Windows artifacts.
- Configure macOS signing/notarization and Windows code signing before public distribution.
- Keep the API bound to `127.0.0.1` for this milestone. Network deployment requires
  authentication, an explicit CORS policy, and a matching Tauri CSP.
- Configure `PUPPETEER_EXECUTABLE_PATH` when Chromium is not installed in a standard location.
- Confirm database backup and restore procedures with the deployment owner.
