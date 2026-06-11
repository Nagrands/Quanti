import { constants } from "node:fs";
import { access, copyFile } from "node:fs/promises";

const envUrl = new URL("../.env", import.meta.url);
const exampleUrl = new URL("../.env.example", import.meta.url);

try {
  await access(envUrl, constants.F_OK);
  console.log("Using existing .env file.");
} catch {
  await copyFile(exampleUrl, envUrl);
  console.log("Created .env from .env.example.");
}
