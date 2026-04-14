import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const schemaPath = join(repoRoot, "packages/db/prisma/schema.prisma");
const outputPath = join(repoRoot, "packages/db/prisma/migrations/0001_init/migration.sql");
const defaultEnv = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/quanti",
  DIRECT_URL: "postgresql://postgres:postgres@localhost:5432/quanti"
};

const { stdout } = await execFileAsync(
  "pnpm",
  [
    "--filter",
    "@quanti/db",
    "exec",
    "prisma",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datamodel",
    schemaPath,
    "--script"
  ],
  {
    cwd: repoRoot,
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? defaultEnv.DATABASE_URL,
      DIRECT_URL: process.env.DIRECT_URL ?? defaultEnv.DIRECT_URL
    }
  }
);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, stdout, "utf8");
console.log(`Initial migration written to ${outputPath}`);
