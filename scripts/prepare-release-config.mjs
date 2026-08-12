import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const endpoint = process.env.QUANTI_UPDATE_ENDPOINT?.trim();
const publicKey = process.env.TAURI_UPDATER_PUBKEY?.trim();

if (!endpoint || !publicKey) {
  throw new Error("QUANTI_UPDATE_ENDPOINT and TAURI_UPDATER_PUBKEY are required for a signed release build.");
}

const config = {
  bundle: {
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
