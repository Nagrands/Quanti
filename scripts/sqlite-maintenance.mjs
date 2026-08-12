import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

try { process.loadEnvFile(path.join(repoRoot, ".env")); } catch {}

export function databasePath() {
  const value = process.env.DATABASE_URL ?? `file:${path.join(repoRoot, ".quanti-data", "quanti.sqlite3")}`;
  if (!value.startsWith("file:")) throw new Error("DATABASE_URL must point to a SQLite file.");
  const resolved = value.slice(5);
  return path.isAbsolute(resolved) ? resolved : path.resolve(repoRoot, resolved);
}

export async function ensureBackupDir() {
  const directory = path.join(repoRoot, "backups");
  await mkdir(directory, { recursive: true });
  return directory;
}

export async function checkpointDatabase() {
  const { DatabaseSync } = await import("node:sqlite");
  const database = new DatabaseSync(databasePath());
  try {
    database.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  } finally {
    database.close();
  }
}

export async function removeDatabaseSidecars(target = databasePath()) {
  for (const suffix of ["-wal", "-shm"]) {
    try {
      await unlink(`${target}${suffix}`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}
