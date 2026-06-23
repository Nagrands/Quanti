import { spawn } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
export const backupDir = path.join(repoRoot, "backups");
export const databaseName = "quanti";
export const postgresUser = "postgres";
export const postgresService = "postgres";

export const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: repoRoot,
    stdio: options.stdio ?? "inherit",
    shell: false,
    env: process.env
  });

  child.on("error", reject);
  child.on("close", (code) => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}.`));
  });
});

export const dockerCompose = (args, options) => run("docker", ["compose", ...args], options);

export const pnpm = (args, options) => run("pnpm", args, options);

export const timestamp = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "_",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join("");
};

export const ensureBackupDir = async () => {
  await mkdir(backupDir, { recursive: true });
};

export const backupPathFromArg = (arg) => {
  if (!arg) {
    return path.join(backupDir, `quanti_${timestamp()}.dump`);
  }

  return path.isAbsolute(arg) ? arg : path.join(repoRoot, arg);
};

export const pgDumpToFile = async (outputPath) => new Promise((resolve, reject) => {
  const output = createWriteStream(outputPath, { flags: "wx" });
  const child = spawn("docker", [
    "compose",
    "exec",
    "-T",
    postgresService,
    "pg_dump",
    "-U",
    postgresUser,
    "-d",
    databaseName,
    "-F",
    "c"
  ], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "inherit"],
    shell: false,
    env: process.env
  });

  child.stdout.pipe(output);

  child.on("error", reject);
  output.on("error", reject);

  child.on("close", async (code) => {
    output.end();

    if (code === 0) {
      resolve();
      return;
    }

    await rm(outputPath, { force: true });
    reject(new Error(`pg_dump failed with exit code ${code}.`));
  });
});

export const pgRestoreFromFile = async (inputPath) => new Promise((resolve, reject) => {
  const input = createReadStream(inputPath);
  const child = spawn("docker", [
    "compose",
    "exec",
    "-T",
    postgresService,
    "pg_restore",
    "-U",
    postgresUser,
    "-d",
    databaseName,
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges"
  ], {
    cwd: repoRoot,
    stdio: ["pipe", "inherit", "inherit"],
    shell: false,
    env: process.env
  });

  input.pipe(child.stdin);

  input.on("error", reject);
  child.on("error", reject);
  child.on("close", (code) => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(new Error(`pg_restore failed with exit code ${code}.`));
  });
});
