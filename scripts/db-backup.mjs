import { copyFile } from "node:fs/promises";
import path from "node:path";
import { checkpointDatabase, databasePath, ensureBackupDir, repoRoot } from "./sqlite-maintenance.mjs";

const backupDirectory = await ensureBackupDir();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const requested = process.argv[2];
const outputPath = requested
  ? (path.isAbsolute(requested) ? requested : path.join(repoRoot, requested))
  : path.join(backupDirectory, `quanti_${stamp}.sqlite3`);

await checkpointDatabase();
await copyFile(databasePath(), outputPath);

console.log(`SQLite backup created: ${outputPath}`);
