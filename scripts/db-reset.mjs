import { constants } from "node:fs";
import { access, copyFile } from "node:fs/promises";
import { dockerCompose, pnpm } from "./db-maintenance.mjs";

const hasForce = process.argv.includes("--force");

if (!hasForce) {
  console.error("This deletes the local PostgreSQL Docker volume.");
  console.error("Run: pnpm db:reset -- --force");
  process.exit(1);
}

const envUrl = new URL("../.env", import.meta.url);
const exampleUrl = new URL("../.env.example", import.meta.url);

try {
  await access(envUrl, constants.F_OK);
  console.log("Using existing .env file.");
} catch {
  await copyFile(exampleUrl, envUrl);
  console.log("Created .env from .env.example.");
}

await dockerCompose(["down", "--volumes"]);
await dockerCompose(["up", "-d", "--wait", "postgres"]);
await pnpm(["db:generate"]);
await pnpm(["db:migrate"]);

console.log("Local database reset complete.");
