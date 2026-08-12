# Release runbook

Stable Quanti releases are created as GitHub draft releases. A maintainer must
complete every manual gate below before making the draft public.

## Verification

```bash
pnpm install --frozen-lockfile
pnpm release:verify
pnpm release:check
pnpm --filter @quanti/desktop tauri:build
```

CI tests the real SQLite API workflow, desktop UI, Rust lifecycle, macOS bundle,
and Windows bundle. The installer must then be tested on clean offline machines
without Docker, Node.js, PostgreSQL, Chrome, or an existing Quanti data folder.

Verify first launch/import, restart, occupied ports, second-instance focus,
sidecar failure, schema backup, damaged-database recovery, PDF output, and
update installation. Compare PostgreSQL export and SQLite import counts,
posted documents, payments, movements, stock balances, and debts.

## Signed release configuration

Tag builds use `.github/workflows/release-desktop.yml`. Configure these GitHub
Actions secrets:

- `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, and
  `TAURI_UPDATER_PUBKEY` for signed updater artifacts;
- `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`,
  `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID`
  for Developer ID signing and notarization;
- `WINDOWS_CERTIFICATE_PFX` (base64) and `WINDOWS_CERTIFICATE_PASSWORD` for MSI
  Authenticode signing.

`QUANTI_UPDATE_ENDPOINT` is not a secret. The workflow derives it from the
current public repository as:

```text
https://github.com/<owner>/<repository>/releases/latest/download/latest.json
```

`prepare-release-config.mjs` refuses to create updater artifacts without that
endpoint and a public verification key. The updater verifies the signed payload,
downloads it, checkpoints and backs up SQLite, stops the sidecar, and only then
installs and restarts. The database lives outside the application bundle.

## Draft release workflow

1. Confirm all manifests and the dated changelog section use `0.1.0`.
2. Push the annotated `v0.1.0` tag only after normal CI passes on `main`.
3. The release preflight validates metadata and secrets, then creates or updates
   a draft release using the changelog section as its notes.
4. The matrix builds macOS arm64, macOS x64, and Windows x64. It uploads DMG/MSI,
   updater archives, signatures, and `latest.json` to the draft.
5. Never publish a draft merely because the workflow succeeded.

## Checklist

- Export the production PostgreSQL database to an unchanged full
  `quanti-transfer` v1 JSON before distributing the autonomous version.
- Update versions in root, desktop, API, database, shared, and Tauri manifests.
- Update `CHANGELOG.md` with an absolute release date.
- Run `pnpm release:check` and inspect all generated artifacts.
- Confirm both DMGs with `codesign`, `spctl`, and `stapler`; mount and launch them
  on clean Apple Silicon and Intel machines.
- Confirm the MSI Authenticode signature, install/uninstall it on clean 64-bit
  Windows, and verify the bundled WebView2 bootstrapper path.
- Verify `latest.json` references every updater archive with the matching `.sig`.
- Complete installed-app smoke while offline: first launch, restart, occupied
  ports, second-instance focus, migration import, backup/restore, damaged database
  recovery, and PDF generation without external Node.js or Chrome.
- Exercise updater installation from a lower signed test build and confirm the
  database backup exists before publishing the draft.
