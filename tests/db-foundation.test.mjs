import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const schemaPath = path.join(repoRoot, "packages/db/prisma/schema.prisma");
const migrationPath = path.join(
  repoRoot,
  "packages/db/prisma/migrations/0001_init/migration.sql"
);

test("database foundation files exist", async () => {
  await assert.doesNotReject(() => access(schemaPath));
  await assert.doesNotReject(() => access(migrationPath));
});

test("schema defines core ERP and ledger models", async () => {
  const schema = await readFile(schemaPath, "utf8");

  for (const modelName of [
    "model Product",
    "model ProductCategory",
    "model Warehouse",
    "model Counterparty",
    "model Document",
    "model DocumentItem",
    "model StockMovement",
    "model Account",
    "model Payment",
    "model PaymentAllocation",
    "model MoneyMovement",
    "model AuditLog"
  ]) {
    assert.match(schema, new RegExp(modelName), `Missing ${modelName} in schema.`);
  }

  assert.match(schema, /enum DocumentStatus/, "DocumentStatus enum is required.");
  assert.match(schema, /enum PaymentStatus/, "PaymentStatus enum is required.");
  assert.match(schema, /model StockBalance/, "StockBalance cache model should be explicitly modeled.");
  assert.match(schema, /categoryId\s+String\?/, "Product category relation should be optional.");
});

test("initial migration captures ledger tables", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /CREATE TABLE "Product"/);
  assert.match(migration, /CREATE TABLE "StockMovement"/);
  assert.match(migration, /CREATE TABLE "MoneyMovement"/);
  assert.match(migration, /CREATE TABLE "PaymentAllocation"/);
});
