import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromiumPlatform, pkgTarget } from "../scripts/autonomous-targets.mjs";

const repoRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

async function read(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

test("release onboarding, license, and security files exist", async () => {
  for (const file of [
    "README.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "SECURITY.md",
    "docs/DEVELOPMENT.md",
    "docs/RELEASE.md"
  ]) {
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
    "release:check",
    "release:verify"
  ]) {
    assert.equal(typeof rootPackage.scripts[script], "string", `Missing script ${script}.`);
  }

  assert.match(rootPackage.scripts["db:backup"], /db-backup\.mjs/);
  assert.match(rootPackage.scripts["db:reset"], /db-reset\.mjs/);
  assert.match(rootPackage.scripts["db:restore"], /db-restore\.mjs/);
  assert.match(rootPackage.scripts["db:setup"], /setup-local-env/);
  assert.match(rootPackage.scripts["db:setup"], /db:migrate/);
  assert.match(rootPackage.scripts["autonomous:prepare"], /prepare-autonomous-runtime/);
  assert.match(rootPackage.scripts["db:studio"], /prisma studio/);
  assert.match(rootPackage.scripts["release:check"], /api:smoke/);
  assert.match(rootPackage.scripts["release:check"], /release:verify/);
  assert.match(apiPackage.scripts.dev, /--watch/);
  assert.match(apiPackage.scripts.dev, /--env-file-if-exists/);
  assert.equal(typeof apiPackage.scripts.start, "string");
  assert.equal(typeof apiPackage.dependencies.tsx, "string");
});

test("release metadata is synchronized for v0.1.0", () => {
  const valid = spawnSync(process.execPath, ["scripts/verify-release.mjs", "--tag", "v0.1.0"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /Release metadata verified for v0\.1\.0/);

  const invalid = spawnSync(process.execPath, ["scripts/verify-release.mjs", "--tag", "v9.9.9"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.notEqual(invalid.status, 0);
});

test("release preflight requires updater signing secrets only", () => {
  const environment = {
    ...process.env,
    TAURI_SIGNING_PRIVATE_KEY: "test-private-key",
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "test-password",
    TAURI_UPDATER_PUBKEY: "test-public-key"
  };
  const valid = spawnSync(
    process.execPath,
    ["scripts/verify-release.mjs", "--tag", "v0.1.0", "--require-secrets"],
    { cwd: repoRoot, encoding: "utf8", env: environment }
  );
  assert.equal(valid.status, 0, valid.stderr);

  delete environment.TAURI_UPDATER_PUBKEY;
  const missing = spawnSync(
    process.execPath,
    ["scripts/verify-release.mjs", "--tag", "v0.1.0", "--require-secrets"],
    { cwd: repoRoot, encoding: "utf8", env: environment }
  );
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /TAURI_UPDATER_PUBKEY/);
});

test("generated release config signs updater artifacts without OS identities", () => {
  const endpoint = "https://github.com/Nagrands/Quanti/releases/latest/download/latest.json";
  const publicKey = "test-public-key";
  const generated = spawnSync(process.execPath, ["scripts/prepare-release-config.mjs"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      QUANTI_UPDATE_ENDPOINT: endpoint,
      TAURI_UPDATER_PUBKEY: publicKey
    }
  });
  assert.equal(generated.status, 0, generated.stderr);

  const config = JSON.parse(
    spawnSync(
      process.execPath,
      ["-e", "process.stdout.write(require('node:fs').readFileSync('.quanti-build/tauri.release.conf.json', 'utf8'))"],
      { cwd: repoRoot, encoding: "utf8" }
    ).stdout
  );
  assert.equal(config.bundle.createUpdaterArtifacts, true);
  assert.equal(config.bundle.macOS.signingIdentity, null);
  assert.equal(config.bundle.windows.certificateThumbprint, null);
  assert.deepEqual(config.plugins.updater.endpoints, [endpoint]);
  assert.equal(config.plugins.updater.pubkey, publicKey);
});

test("autonomous resources match every release target", () => {
  assert.equal(pkgTarget("aarch64-apple-darwin"), "node22-macos-arm64");
  assert.equal(pkgTarget("x86_64-apple-darwin"), "node22-macos-x64");
  assert.equal(pkgTarget("x86_64-pc-windows-msvc"), "node22-win-x64");
  assert.equal(chromiumPlatform("aarch64-apple-darwin"), "mac_arm");
  assert.equal(chromiumPlatform("x86_64-apple-darwin"), "mac");
  assert.equal(chromiumPlatform("x86_64-pc-windows-msvc"), "win64");
  assert.throws(() => chromiumPlatform("unsupported-target"), /Unsupported Chromium target/);
});

test("GitHub workflows pin actions and keep stable releases as drafts", async () => {
  const ci = await read(".github/workflows/desktop-cross-platform.yml");
  const release = await read(".github/workflows/release-desktop.yml");
  const actions = `${ci}\n${release}`.match(/^\s*- uses: ([^\s#]+)/gm) ?? [];

  assert.ok(actions.length > 0);
  for (const action of actions) {
    assert.match(action, /@[0-9a-f]{40}$/);
  }
  assert.match(release, /releaseDraft: true/);
  assert.match(release, /uploadUpdaterJson: true/);
  assert.match(release, /uploadUpdaterSignatures: true/);
  assert.match(release, /releases\/latest\/download\/latest\.json/);
  assert.match(release, /SHA256SUMS/);
  assert.match(release, /max-parallel: 1/);
  assert.match(release, /darwin-aarch64/);
  assert.match(release, /darwin-x86_64/);
  assert.match(release, /windows-x86_64/);
  assert.match(release, /Authority=Developer ID Application/);
  assert.match(release, /Get-AuthenticodeSignature/);
  assert.match(release, /NotSigned/);
  assert.doesNotMatch(release, /secrets\.QUANTI_UPDATE_ENDPOINT/);
  assert.doesNotMatch(release, /APPLE_|WINDOWS_CERTIFICATE|Import-PfxCertificate|Signed desktop release/);
  assert.match(ci, /macos-15-intel/);
  assert.match(ci, /prepare-autonomous-runtime\.mjs/);
  assert.match(ci, /exec tauri build .*--target \$\{\{ matrix\.target \}\}/);
  assert.doesNotMatch(ci, /rg 'postgresql:\/\/\|localhost:5432' apps packages/);
});

test("database maintenance scripts use explicit safe commands", async () => {
  const backupScript = await read("scripts/db-backup.mjs");
  const restoreScript = await read("scripts/db-restore.mjs");
  const resetScript = await read("scripts/db-reset.mjs");
  const adapterScript = await read("scripts/sqlite-maintenance.mjs");

  assert.match(backupScript, /copyFile/);
  assert.match(backupScript, /sqlite3/);
  assert.match(restoreScript, /Usage: pnpm db:restore -- <backup-file>/);
  assert.match(restoreScript, /copyFile/);
  assert.match(resetScript, /--force/);
  assert.match(resetScript, /-wal/);
  assert.match(adapterScript, /DATABASE_URL must point to a SQLite file/);
  assert.doesNotMatch(adapterScript, /pg_dump|pg_restore|docker/);
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
