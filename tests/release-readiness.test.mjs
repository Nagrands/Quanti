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

  for (const script of ["db:setup", "demo:seed", "dev:api", "dev:tauri", "release:check"]) {
    assert.equal(typeof rootPackage.scripts[script], "string", `Missing script ${script}.`);
  }

  assert.match(rootPackage.scripts["db:setup"], /setup-local-env/);
  assert.match(rootPackage.scripts["db:setup"], /--wait/);
  assert.match(rootPackage.scripts["release:check"], /api:smoke/);
  assert.match(apiPackage.scripts.dev, /--env-file-if-exists/);
  assert.equal(typeof apiPackage.scripts.start, "string");
  assert.equal(typeof apiPackage.dependencies.tsx, "string");
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
