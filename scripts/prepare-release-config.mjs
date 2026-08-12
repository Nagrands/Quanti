import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const endpoint = process.env.QUANTI_UPDATE_ENDPOINT?.trim();
const publicKey = process.env.TAURI_UPDATER_PUBKEY?.trim();
const target = process.env.TAURI_ENV_TARGET_TRIPLE?.trim();

if (!endpoint || !publicKey || !target) {
  throw new Error(
    "QUANTI_UPDATE_ENDPOINT, TAURI_UPDATER_PUBKEY, and TAURI_ENV_TARGET_TRIPLE are required for a signed release build."
  );
}

const bundleTargets = target.includes("apple-darwin") ? ["app", "dmg"] : target.includes("windows-msvc") ? ["msi"] : null;
if (!bundleTargets) {
  throw new Error(`Unsupported release target: ${target}.`);
}

const config = {
  bundle: {
    targets: bundleTargets,
    externalBin: ["binaries/quanti-api"],
    resources: {
      "../../../packages/db/prisma/sqlite-migrations/": "migrations/",
      "resources/chromium/": "chromium/",
      "resources/prisma/": "prisma/"
    },
    createUpdaterArtifacts: true,
    macOS: {
      signingIdentity: null
    },
    windows: {
      certificateThumbprint: null
    }
  },
  plugins: {
    updater: {
      endpoints: [endpoint],
      pubkey: publicKey
    }
  }
};

const buildDirectory = path.join(repoRoot, ".quanti-build");
await mkdir(buildDirectory, { recursive: true });
await writeFile(path.join(buildDirectory, "tauri.release.conf.json"), JSON.stringify(config, null, 2));
console.log("Updater release configuration prepared without OS code signing.");
