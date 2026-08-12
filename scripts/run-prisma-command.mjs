import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const dbWorkspace = join(repoRoot, "packages/db");

const defaultEnv = {
  DATABASE_URL: `file:${join(repoRoot, ".quanti-data", "quanti.sqlite3")}`
};

const child = spawn(
  "pnpm",
  ["exec", "prisma", ...process.argv.slice(2)],
  {
    cwd: dbWorkspace,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? defaultEnv.DATABASE_URL
    }
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
