import { access } from "node:fs/promises";
import path from "node:path";
import { pgRestoreFromFile, repoRoot } from "./db-maintenance.mjs";

const inputArg = process.argv[2];

if (!inputArg) {
  console.error("Usage: pnpm db:restore -- <backup-file>");
  process.exit(1);
}

const inputPath = path.isAbsolute(inputArg) ? inputArg : path.join(repoRoot, inputArg);

await access(inputPath);
await pgRestoreFromFile(inputPath);

console.log(`Database restored from: ${inputPath}`);
