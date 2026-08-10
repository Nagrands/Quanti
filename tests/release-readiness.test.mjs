import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

async function read(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

test("release onboarding and runbook files exist", async () => {
  for (const file of ["README.md", "CHANGELOG.md", "docs/DEVELOPMENT.md", "docs/RELEASE.md"]) {
    await assert.doesNotReject(() => access(path.join(repoRoot, file)));
  }
});

test("workspace exposes reproducible setup and release commands", async () => {
  const rootPackage = JSON.parse(await read("package.json"));
  const apiPackage = JSON.parse(await read("apps/api/package.json"));

  for (const script of [
    "db:backup",
    "db:reset",
    "db:restore",
    "db:setup",
    "db:studio",
    "demo:seed",
    "dev:api",
    "dev:tauri",
    "release:check"
  ]) {
    assert.equal(typeof rootPackage.scripts[script], "string", `Missing script ${script}.`);
  }

  assert.match(rootPackage.scripts["db:backup"], /db-backup\.mjs/);
  assert.match(rootPackage.scripts["db:reset"], /db-reset\.mjs/);
  assert.match(rootPackage.scripts["db:restore"], /db-restore\.mjs/);
  assert.match(rootPackage.scripts["db:setup"], /setup-local-env/);
  assert.match(rootPackage.scripts["db:setup"], /--wait/);
  assert.match(rootPackage.scripts["db:studio"], /prisma studio/);
  assert.match(rootPackage.scripts["release:check"], /api:smoke/);
  assert.match(apiPackage.scripts.dev, /--watch/);
  assert.match(apiPackage.scripts.dev, /--env-file-if-exists/);
  assert.equal(typeof apiPackage.scripts.start, "string");
  assert.equal(typeof apiPackage.dependencies.tsx, "string");
});

test("database maintenance scripts use explicit safe commands", async () => {
  const backupScript = await read("scripts/db-backup.mjs");
  const restoreScript = await read("scripts/db-restore.mjs");
  const resetScript = await read("scripts/db-reset.mjs");
  const adapterScript = await read("scripts/db-maintenance.mjs");

  assert.match(backupScript, /pgDumpToFile/);
  assert.match(restoreScript, /Usage: pnpm db:restore -- <backup-file>/);
  assert.match(restoreScript, /pgRestoreFromFile/);
  assert.match(resetScript, /--force/);
  assert.match(resetScript, /down", "--volumes/);
  assert.match(adapterScript, /pg_dump/);
  assert.match(adapterScript, /pg_restore/);
  assert.match(adapterScript, /shell: false/);
});

test("demo seed covers core ERP workflow through the API", async () => {
  const seed = await read("scripts/seed-demo-data.mjs");

  assert.match(seed, /\/products/);
  assert.match(seed, /\/warehouses/);
  assert.match(seed, /\/documents\/\$\{document\.id\}\/post/);
  assert.match(seed, /\/payments\/\$\{payment\.id\}\/post/);
  assert.match(seed, /Expected demo stock balance 8\.000/);
  assert.match(seed, /Expected demo customer debt 100\.00/);
  assert.match(seed, /current-period sales report/);
  assert.match(seed, /current-period cashflow report/);
});
