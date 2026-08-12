import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const port = 3199;
const runtimeDirectory = await mkdtemp(path.join(tmpdir(), "quanti-api-smoke-"));
const sessionToken = "quanti-smoke-session-token";
let importChild;
const child = spawn(
  process.execPath,
  ["--env-file-if-exists=../../.env", "--import", "tsx", "src/main.ts"],
  {
    cwd: new URL("../apps/api/", import.meta.url),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      DATABASE_URL: `file:${path.join(runtimeDirectory, "quanti.sqlite3")}`,
      QUANTI_MIGRATIONS_DIR: path.join(process.cwd(), "packages/db/prisma/sqlite-migrations"),
      QUANTI_SESSION_TOKEN: sessionToken
    },
    stdio: ["ignore", "pipe", "pipe"]
  }
);

let output = "";
child.stdout.on("data", (chunk) => {
  output += chunk;
});
child.stderr.on("data", (chunk) => {
  output += chunk;
});

try {
  const deadline = Date.now() + 10_000;
  let response;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Quanti API exited before accepting requests.\n${output}`);
    }

    try {
      response = await fetch(`http://127.0.0.1:${port}/health`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  if (!response) {
    throw new Error(`Quanti API did not accept requests within 10 seconds.\n${output}`);
  }

  const body = await response.json();
  if (response.status !== 200 && response.status !== 503) {
    throw new Error(`Unexpected health response ${response.status}: ${JSON.stringify(body)}`);
  }

  if (response.status === 200 && (body.status !== "ok" || body.database !== "ok")) {
    throw new Error(`Unexpected ready health payload: ${JSON.stringify(body)}`);
  }

  if (response.status === 503 && body?.error?.code !== "DATABASE_UNAVAILABLE") {
    throw new Error(`Unexpected unavailable health payload: ${JSON.stringify(body)}`);
  }
  const unauthorized = await fetch(`http://127.0.0.1:${port}/health`);
  if (unauthorized.status !== 401) throw new Error(`Expected protected health to return 401, received ${unauthorized.status}.`);

  await new Promise((resolve, reject) => {
    const smoke = spawn(process.execPath, [path.join(process.cwd(), "scripts/seed-demo-data.mjs")], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        QUANTI_API_BASE_URL: `http://127.0.0.1:${port}`,
        QUANTI_SESSION_TOKEN: sessionToken
      },
      stdio: "inherit"
    });
    smoke.on("error", reject);
    smoke.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`ERP workflow smoke exited with ${code}.`)));
  });

  const headers = { Authorization: `Bearer ${sessionToken}` };
  const transferResponse = await fetch(`http://127.0.0.1:${port}/transfer/payments/export`, { headers });
  if (!transferResponse.ok) throw new Error(`Transfer export failed with ${transferResponse.status}.`);
  const transferPackage = await transferResponse.json();

  const importPort = 3200;
  const importToken = "quanti-import-smoke-session-token";
  let importOutput = "";
  importChild = spawn(process.execPath, ["--import", "tsx", "src/main.ts"], {
    cwd: new URL("../apps/api/", import.meta.url),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(importPort),
      DATABASE_URL: `file:${path.join(runtimeDirectory, "imported.sqlite3")}`,
      QUANTI_MIGRATIONS_DIR: path.join(process.cwd(), "packages/db/prisma/sqlite-migrations"),
      QUANTI_SESSION_TOKEN: importToken
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  importChild.stdout.on("data", (chunk) => { importOutput += chunk; });
  importChild.stderr.on("data", (chunk) => { importOutput += chunk; });
  const importDeadline = Date.now() + 10_000;
  while (Date.now() < importDeadline) {
    if (importChild.exitCode !== null) throw new Error(`Import API exited early.\n${importOutput}`);
    try {
      const ready = await fetch(`http://127.0.0.1:${importPort}/health`, { headers: { Authorization: `Bearer ${importToken}` } });
      if (ready.ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  const importHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${importToken}` };
  const preview = await fetch(`http://127.0.0.1:${importPort}/transfer/import/preview`, {
    method: "POST", headers: importHeaders, body: JSON.stringify({ package: transferPackage })
  });
  if (!preview.ok) throw new Error(`Transfer preview failed: ${await preview.text()}`);
  const apply = await fetch(`http://127.0.0.1:${importPort}/transfer/import/apply`, {
    method: "POST", headers: importHeaders, body: JSON.stringify({ package: transferPackage, resolutions: {} })
  });
  if (!apply.ok) throw new Error(`Transfer apply failed: ${await apply.text()}`);
  const importedExport = await fetch(`http://127.0.0.1:${importPort}/transfer/payments/export`, {
    headers: { Authorization: `Bearer ${importToken}` }
  });
  const importedPackage = await importedExport.json();
  if (JSON.stringify(importedPackage.payload) !== JSON.stringify(transferPackage.payload)) {
    throw new Error("Transfer round-trip changed the exported ERP payload.");
  }

  console.log(`API runtime smoke passed with protected health, complete ERP workflow, and transfer v1 round-trip.`);
} finally {
  if (importChild && importChild.exitCode === null) importChild.kill("SIGTERM");
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }

    child.once("exit", resolve);
    setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 2_000).unref();
  });
  await rm(runtimeDirectory, { recursive: true, force: true });
}
