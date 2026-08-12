# Contributing to Quanti

Quanti uses Node.js 22+, pnpm 10, Rust, and the Tauri platform prerequisites.
Read [Development](docs/DEVELOPMENT.md) before making a change.

1. Create a focused branch and keep unrelated working-tree changes intact.
2. Preserve the ownership boundaries between desktop, API, shared contracts,
   and database packages.
3. Add or update focused tests for every behavior change.
4. Run `pnpm check`, then `pnpm release:check` for release-affecting work.
5. Use a Conventional Commit title such as `fix(desktop): restore local runtime`.

Do not commit generated sidecars, Chromium/Prisma binaries, databases, backups,
logs, environment files, or signing credentials. Security reports belong in
GitHub private vulnerability reporting rather than public issues.
