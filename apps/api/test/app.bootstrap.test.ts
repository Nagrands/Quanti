import assert from "node:assert/strict";
import test from "node:test";

import { AppController } from "../src/app.controller";
import { createApiApplication } from "../src/bootstrap";

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

  await app.close();
});
