import { resolve } from "node:path";

process.env.DATABASE_URL ??= `file:${resolve(".quanti-data/quanti.sqlite3")}`;
process.env.QUANTI_MIGRATIONS_DIR ??= resolve("packages/db/prisma/sqlite-migrations");

const { prepareRuntimeDatabase } = await import("../apps/api/src/common/database/database-lifecycle.ts");
const result = await prepareRuntimeDatabase();
console.log(`SQLite schema v${result.databaseVersion} is ready at ${result.databasePath}.`);
if (result.backupPath) console.log(`Pre-migration backup: ${result.backupPath}`);
