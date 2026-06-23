import { ensureBackupDir, backupPathFromArg, pgDumpToFile } from "./db-maintenance.mjs";

const outputPath = backupPathFromArg(process.argv[2]);

await ensureBackupDir();
await pgDumpToFile(outputPath);

console.log(`Database backup created: ${outputPath}`);
