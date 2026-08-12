import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const argumentsList = process.argv.slice(2);

function argumentValue(name) {
  const index = argumentsList.indexOf(name);
  return index === -1 ? undefined : argumentsList[index + 1];
}

async function read(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

async function readJson(relativePath) {
  return JSON.parse(await read(relativePath));
}

const rootPackage = await readJson("package.json");
const tag = argumentValue("--tag") ?? process.env.GITHUB_REF_NAME ?? `v${rootPackage.version}`;
assert.match(tag, /^v\d+\.\d+\.\d+$/, `Release tag must be semantic vX.Y.Z, received ${tag}.`);
const version = tag.slice(1);

const packageFiles = [
  "package.json",
  "apps/api/package.json",
  "apps/desktop/package.json",
  "packages/db/package.json",
  "packages/shared/package.json"
];

for (const file of packageFiles) {
  const manifest = await readJson(file);
  assert.equal(manifest.version, version, `${file} version must match ${tag}.`);
}

const tauriConfig = await readJson("apps/desktop/src-tauri/tauri.conf.json");
assert.equal(tauriConfig.version, version, `Tauri version must match ${tag}.`);

const cargoManifest = await read("apps/desktop/src-tauri/Cargo.toml");
const cargoVersion = cargoManifest.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
assert.equal(cargoVersion, version, `Cargo version must match ${tag}.`);

const changelog = await read("CHANGELOG.md");
const heading = new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`, "m");
const match = changelog.match(heading);
assert.ok(match, `CHANGELOG.md must contain a dated [${version}] release section.`);
const sectionStart = match.index;
const nextSection = changelog.indexOf("\n## ", sectionStart + match[0].length);
const releaseNotes = changelog.slice(sectionStart, nextSection === -1 ? undefined : nextSection).trim();

const buildDirectory = path.join(repoRoot, ".quanti-build");
await mkdir(buildDirectory, { recursive: true });
await writeFile(path.join(buildDirectory, "release-notes.md"), `${releaseNotes}\n`);

if (argumentsList.includes("--require-secrets")) {
  const requiredSecrets = [
    "TAURI_SIGNING_PRIVATE_KEY",
    "TAURI_SIGNING_PRIVATE_KEY_PASSWORD",
    "TAURI_UPDATER_PUBKEY"
  ];
  const missing = requiredSecrets.filter((name) => !process.env[name]?.trim());
  assert.deepEqual(missing, [], `Missing release secrets: ${missing.join(", ")}.`);
}

console.log(`Release metadata verified for ${tag}.`);
