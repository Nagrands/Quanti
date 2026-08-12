import { access, copyFile } from "node:fs/promises";
import path from "node:path";
import { databasePath, removeDatabaseSidecars, repoRoot } from "./sqlite-maintenance.mjs";

const inputArg = process.argv[2];

if (!inputArg) {
  console.error("Usage: pnpm db:restore -- <backup-file>");
  process.exit(1);
}

const inputPath = path.isAbsolute(inputArg) ? inputArg : path.join(repoRoot, inputArg);

await access(inputPath);
const target = databasePath();
await removeDatabaseSidecars(target);
await copyFile(inputPath, target);

console.log(`SQLite database restored from: ${inputPath}`);
