import assert from "node:assert/strict";
import test from "node:test";

import { AppModule, domainModules } from "../src/app.module";

test("app module registers all baseline ERP domain modules", () => {
  const imports = Reflect.getMetadata("imports", AppModule) as unknown[] | undefined;

  assert.ok(imports, "AppModule should register baseline domain modules.");
  assert.deepEqual(imports, [...domainModules]);
});
