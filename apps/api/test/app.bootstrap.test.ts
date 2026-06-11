import assert from "node:assert/strict";
import test from "node:test";

import { AppController } from "../src/app.controller";
import { createApiApplication, DEFAULT_DESKTOP_ORIGINS } from "../src/bootstrap";

test("api application bootstraps with health controller", async () => {
  process.env.NODE_ENV = "test";

  const app = await createApiApplication();

  await assert.doesNotReject(async () => {
    await app.init();
  });

  const healthController = new AppController({
    $queryRaw: async () => [{ "?column?": 1 }]
  } as never);

  assert.deepEqual(await healthController.getHealth(), {
    service: "quanti-api",
    status: "ok",
    database: "ok",
    modules: ["products", "documents", "stock", "payments", "reports"]
  });

  const unavailableController = new AppController({
    $queryRaw: async () => {
      throw new Error("database unavailable");
    }
  } as never);
  await assert.rejects(
    () => unavailableController.getHealth(),
    (error: unknown) => (
      typeof error === "object"
      && error !== null
      && "getStatus" in error
      && (error as { getStatus(): number }).getStatus() === 503
    )
  );

  assert.ok(DEFAULT_DESKTOP_ORIGINS.includes("http://localhost:1420"));
  assert.ok(DEFAULT_DESKTOP_ORIGINS.includes("tauri://localhost"));

  await app.close();
});
