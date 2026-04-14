import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const dbWorkspace = join(repoRoot, "packages/db");

const defaultEnv = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/quanti",
  DIRECT_URL: "postgresql://postgres:postgres@localhost:5432/quanti"
};

const child = spawn(
  "pnpm",
  ["exec", "prisma", ...process.argv.slice(2)],
  {
    cwd: dbWorkspace,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? defaultEnv.DATABASE_URL,
      DIRECT_URL: process.env.DIRECT_URL ?? defaultEnv.DIRECT_URL
    }
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
