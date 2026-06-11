import { spawn } from "node:child_process";

const port = 3199;
const child = spawn(
  process.execPath,
  ["--env-file-if-exists=../../.env", "--import", "tsx", "src/main.ts"],
  {
    cwd: new URL("../apps/api/", import.meta.url),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port)
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
      response = await fetch(`http://127.0.0.1:${port}/health`);
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

  console.log(`API runtime smoke passed with health status ${response.status}.`);
} finally {
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
}
