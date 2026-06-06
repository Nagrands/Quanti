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

  assert.deepEqual(app.get(AppController).getHealth(), {
    service: "quanti-api",
    status: "ok",
    modules: ["products", "documents", "stock", "payments", "reports"]
  });

  assert.ok(DEFAULT_DESKTOP_ORIGINS.includes("http://localhost:1420"));
  assert.ok(DEFAULT_DESKTOP_ORIGINS.includes("tauri://localhost"));

  await app.close();
});
