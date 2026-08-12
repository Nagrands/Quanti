import { Browser, install } from "@puppeteer/browsers";
import { build } from "esbuild";
import { copyFile, cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromiumPlatform, pkgTarget } from "./autonomous-targets.mjs";

const repoRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const tauriRoot = path.join(repoRoot, "apps/desktop/src-tauri");
const binariesDirectory = path.join(tauriRoot, "binaries");
const resourcesDirectory = path.join(tauriRoot, "resources");
const prismaResources = path.join(resourcesDirectory, "prisma");
const chromiumResources = path.join(resourcesDirectory, "chromium");
const buildDirectory = path.join(repoRoot, ".quanti-build");
const apiRequire = createRequire(path.join(repoRoot, "apps/api/package.json"));

async function run(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repoRoot, stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}.`)));
  });
}

async function targetTriple() {
  if (process.env.TAURI_ENV_TARGET_TRIPLE) return process.env.TAURI_ENV_TARGET_TRIPLE;
  return await new Promise((resolve, reject) => {
    const child = spawn("rustc", ["--print", "host-tuple"], { cwd: repoRoot, stdio: ["ignore", "pipe", "inherit"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve(output.trim()) : reject(new Error(`rustc exited with ${code}.`)));
  });
}

async function generatedPrismaDirectory() {
  const store = path.join(repoRoot, "node_modules/.pnpm");
  const entries = await readdir(store);
  const client = entries.find((entry) => entry.startsWith("@prisma+client@"));
  if (!client) throw new Error("Generated Prisma Client was not found. Run pnpm db:generate.");
  return path.join(store, client, "node_modules/.prisma/client");
}

async function prepareSidecar(triple) {
  process.env.DATABASE_URL ??= `file:${path.join(buildDirectory, "build.sqlite3")}`;
  await run(path.join(repoRoot, "node_modules/.bin/prisma"), [
    "generate", "--schema", "packages/db/prisma/schema.prisma"
  ]);

  const prismaDirectory = await generatedPrismaDirectory();
  const bundlePath = path.join(buildDirectory, "quanti-api.cjs");
  await build({
    entryPoints: [path.join(repoRoot, "apps/api/src/main.ts")],
    outfile: bundlePath,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    external: ["@nestjs/microservices", "@nestjs/microservices/*", "@nestjs/websockets/*"],
    plugins: [{
      name: "quanti-prisma-client",
      setup(context) {
        context.onResolve({ filter: /^\.prisma\/client\/default$/ }, () => ({
          path: path.join(prismaDirectory, "default.js")
        }));
      }
    }]
  });

  await mkdir(binariesDirectory, { recursive: true });
  const extension = triple.includes("windows") ? ".exe" : "";
  const sidecarPath = path.join(binariesDirectory, `quanti-api-${triple}${extension}`);
  await run(path.join(repoRoot, "node_modules/.bin/pkg"), [
    bundlePath,
    "--targets", pkgTarget(triple),
    "--output", sidecarPath,
    "--compress", "GZip"
  ]);

  await rm(prismaResources, { recursive: true, force: true });
  await mkdir(prismaResources, { recursive: true });
  const engine = (await readdir(prismaDirectory)).find((entry) => entry.startsWith("libquery_engine-") && entry.endsWith(".node"));
  if (!engine) throw new Error("Native Prisma query engine was not generated.");
  await copyFile(path.join(prismaDirectory, engine), path.join(prismaResources, engine));
  await writeFile(path.join(prismaResources, ".gitkeep"), "");
}

async function prepareChromium(triple) {
  if (process.argv.includes("--skip-chromium")) return;
  const puppeteer = apiRequire("puppeteer-core");
  const buildId = puppeteer.PUPPETEER_REVISIONS["chrome-headless-shell"];
  const platform = chromiumPlatform(triple);
  const installed = await install({
    browser: Browser.CHROMEHEADLESSSHELL,
    buildId,
    cacheDir: path.join(buildDirectory, "chromium-cache"),
    platform,
    unpack: true
  });
  await rm(chromiumResources, { recursive: true, force: true });
  await mkdir(chromiumResources, { recursive: true });
  await cp(installed.path, path.join(chromiumResources, path.basename(installed.path)), { recursive: true });
  await writeFile(path.join(chromiumResources, ".gitkeep"), "");
}

await mkdir(buildDirectory, { recursive: true });
const triple = await targetTriple();
await prepareSidecar(triple);
await prepareChromium(triple);
console.log(`Autonomous runtime prepared for ${triple}.`);
