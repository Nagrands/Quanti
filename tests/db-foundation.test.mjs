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
const productUnitsMigrationPath = path.join(
  repoRoot,
  "packages/db/prisma/migrations/0004_product_units_and_document_item_units/migration.sql"
);

test("database foundation files exist", async () => {
  await assert.doesNotReject(() => access(schemaPath));
  await assert.doesNotReject(() => access(migrationPath));
  await assert.doesNotReject(() => access(productUnitsMigrationPath));
});

test("schema defines core ERP and ledger models", async () => {
  const schema = await readFile(schemaPath, "utf8");

  for (const modelName of [
    "model Product",
    "model ProductCategory",
    "model ProductUnit",
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

test("product unit migration preserves document unit snapshots", async () => {
  const migration = await readFile(productUnitsMigrationPath, "utf8");

  assert.match(migration, /CREATE TABLE "ProductUnit"/);
  assert.match(migration, /ADD COLUMN "unit" TEXT/);
  assert.match(migration, /ADD COLUMN "unitFactor" DECIMAL\(18,6\)/);
  assert.match(migration, /UPDATE "DocumentItem"/);
});

test("initial migration captures ledger tables", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /CREATE TABLE "Product"/);
  assert.match(migration, /CREATE TABLE "StockMovement"/);
  assert.match(migration, /CREATE TABLE "MoneyMovement"/);
  assert.match(migration, /CREATE TABLE "PaymentAllocation"/);
});
