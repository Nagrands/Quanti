import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readJson = async (filePath) => {
  const content = await readFile(new URL(`../${filePath}`, import.meta.url), "utf8");
  return JSON.parse(content);
};

const rootPackage = await readJson("package.json");
assert.equal(rootPackage.private, true, "Root package.json must stay private.");
assert.equal(rootPackage.packageManager.startsWith("pnpm@"), true, "Root package manager must be pnpm.");

const workspaceYaml = await readFile(new URL("../pnpm-workspace.yaml", import.meta.url), "utf8");
assert.match(workspaceYaml, /apps\/\*/, "Workspace must include apps/*.");
assert.match(workspaceYaml, /packages\/\*/, "Workspace must include packages/*.");

const tsconfig = await readJson("tsconfig.base.json");
assert.equal(tsconfig.compilerOptions.baseUrl, ".", "Base tsconfig must use repo root as baseUrl.");
assert.ok(tsconfig.compilerOptions.paths["@quanti/shared"], "Shared path alias is required.");
assert.ok(tsconfig.compilerOptions.paths["@quanti/db"], "DB path alias is required.");

const packageNames = [
  "@quanti/api",
  "@quanti/desktop",
  "@quanti/shared",
  "@quanti/db"
];

for (const packageName of packageNames) {
  const packageJsonPath = packageName === "@quanti/api"
    ? "apps/api/package.json"
    : packageName === "@quanti/desktop"
      ? "apps/desktop/package.json"
      : packageName === "@quanti/shared"
        ? "packages/shared/package.json"
        : "packages/db/package.json";

  const pkg = await readJson(packageJsonPath);
  assert.equal(pkg.name, packageName, `Unexpected package name in ${packageJsonPath}.`);
  assert.ok(pkg.scripts?.typecheck, `${packageJsonPath} must expose a typecheck script.`);
}

console.log("Workspace validation passed.");
