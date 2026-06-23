import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

const readJson = async (relativePath) => {
  const filePath = path.join(repoRoot, relativePath);
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
};

test("workspace foundation files exist", async () => {
  const requiredFiles = [
    "package.json",
    "pnpm-workspace.yaml",
    "turbo.json",
    "tsconfig.base.json",
    ".env.example",
    "docker-compose.yml",
    "apps/api/package.json",
    "apps/desktop/package.json",
    "packages/shared/package.json",
    "packages/db/package.json",
    "packages/db/prisma/schema.prisma"
  ];

  for (const file of requiredFiles) {
    await assert.doesNotReject(() => access(path.join(repoRoot, file)));
  }
});

test("workspace packages use expected names", async () => {
  const rootPackage = await readJson("package.json");
  assert.equal(rootPackage.packageManager, "pnpm@10.0.0");

  const apiPackage = await readJson("apps/api/package.json");
  const desktopPackage = await readJson("apps/desktop/package.json");
  const sharedPackage = await readJson("packages/shared/package.json");
  const dbPackage = await readJson("packages/db/package.json");

  assert.equal(apiPackage.name, "@quanti/api");
  assert.equal(desktopPackage.name, "@quanti/desktop");
  assert.equal(sharedPackage.name, "@quanti/shared");
  assert.equal(dbPackage.name, "@quanti/db");
});

test("workspace TypeScript aliases avoid deprecated baseUrl", async () => {
  const tsconfig = await readJson("tsconfig.base.json");

  assert.equal(tsconfig.compilerOptions.baseUrl, undefined);
  assert.deepEqual(
    tsconfig.compilerOptions.paths["@quanti/shared"],
    ["./packages/shared/src/index.ts"]
  );
  assert.deepEqual(
    tsconfig.compilerOptions.paths["@quanti/db"],
    ["./packages/db/src/index.ts"]
  );
});
