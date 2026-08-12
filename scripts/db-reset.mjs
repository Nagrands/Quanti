import { unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { databasePath, repoRoot } from "./sqlite-maintenance.mjs";

const hasForce = process.argv.includes("--force");

if (!hasForce) {
  console.error("This deletes the local SQLite database.");
  console.error("Run: pnpm db:reset -- --force");
  process.exit(1);
}

const target = databasePath();
for (const suffix of ["", "-wal", "-shm"]) {
  try { await unlink(`${target}${suffix}`); } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ["--import", "tsx", "scripts/migrate-sqlite-runtime.mjs"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env
  });
  child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Migration exited with ${code}.`)));
});

console.log("Local SQLite database reset complete.");
