import { PrismaClient } from "@quanti/db";
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export const DATABASE_VERSION = 1;

interface RuntimeMigration {
  version: number;
  name: string;
  fileName: string;
}

const migrations: RuntimeMigration[] = [
  { version: 1, name: "autonomous_foundation", fileName: "0001_autonomous_foundation.sql" }
];

function databasePathFromUrl(value: string) {
  if (!value.startsWith("file:")) {
    throw new Error("Autonomous Quanti requires a file: SQLite DATABASE_URL.");
  }
  const filePath = value.slice("file:".length);
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

function migrationsDirectory() {
  const configured = process.env.QUANTI_MIGRATIONS_DIR?.trim();
  if (configured) return configured;
  return path.resolve(process.cwd(), "packages/db/prisma/sqlite-migrations");
}

async function existingFileSize(filePath: string) {
  try {
    return (await stat(filePath)).size;
  } catch {
    return 0;
  }
}

async function createBackup(databasePath: string) {
  const backupDirectory = path.join(path.dirname(databasePath), "backups");
  await mkdir(backupDirectory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.join(backupDirectory, `quanti-before-v${DATABASE_VERSION}-${stamp}.sqlite3`);
  await copyFile(databasePath, destination);
  return destination;
}

function splitSql(source: string) {
  return source
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export async function prepareRuntimeDatabase() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const databasePath = databasePathFromUrl(databaseUrl);
  await mkdir(path.dirname(databasePath), { recursive: true });
  const originalSize = await existingFileSize(databasePath);
  const prisma = new PrismaClient();

  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL");
    await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_QuantiMigration" (
        "version" INTEGER NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const applied = await prisma.$queryRawUnsafe<Array<{ version: number }>>(
      `SELECT "version" FROM "_QuantiMigration" ORDER BY "version" ASC`
    );
    const appliedVersions = new Set(applied.map((entry) => Number(entry.version)));
    const pending = migrations.filter((migration) => !appliedVersions.has(migration.version));
    if (pending.length === 0) return { databasePath, databaseVersion: DATABASE_VERSION, backupPath: null };

    let backupPath: string | null = null;
    if (originalSize > 0) {
      await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE)");
      backupPath = await createBackup(databasePath);
    }

    for (const migration of pending) {
      const source = await readFile(path.join(migrationsDirectory(), migration.fileName), "utf8");
      const statements = splitSql(source);
      await prisma.$transaction(async (tx) => {
        for (const statement of statements) await tx.$executeRawUnsafe(statement);
        await tx.$executeRawUnsafe(
          `INSERT INTO "_QuantiMigration" ("version", "name") VALUES (?, ?)`,
          migration.version,
          migration.name
        );
      });
    }

    return { databasePath, databaseVersion: DATABASE_VERSION, backupPath };
  } finally {
    await prisma.$disconnect();
  }
}
