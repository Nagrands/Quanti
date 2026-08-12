import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const indexPath = path.join(repoRoot, "packages/shared/src/index.ts");
const enumsPath = path.join(repoRoot, "packages/shared/src/enums.ts");
const documentsPath = path.join(repoRoot, "packages/shared/src/documents.ts");
const paymentsPath = path.join(repoRoot, "packages/shared/src/payments.ts");
const masterDataPath = path.join(repoRoot, "packages/shared/src/master-data.ts");

test("shared contracts export the expected modules", async () => {
  const indexContent = await readFile(indexPath, "utf8");

  assert.match(indexContent, /export \* from "\.\/identifiers"/);
  assert.match(indexContent, /export \* from "\.\/enums"/);
  assert.match(indexContent, /export \* from "\.\/documents"/);
  assert.match(indexContent, /export \* from "\.\/payments"/);
  assert.match(indexContent, /export \* from "\.\/reports"/);
  assert.match(indexContent, /export \* from "\.\/transfer"/);
});

test("shared contracts define ERP status and workflow DTOs", async () => {
  const [enumsContent, documentsContent, paymentsContent] = await Promise.all([
    readFile(enumsPath, "utf8"),
    readFile(documentsPath, "utf8"),
    readFile(paymentsPath, "utf8")
  ]);

  assert.match(enumsContent, /export const documentStatuses/);
  assert.match(enumsContent, /export const paymentStatuses/);
  assert.match(documentsContent, /export interface CreateDraftDocumentDto/);
  assert.match(documentsContent, /export interface PostDocumentCommand/);
  assert.match(paymentsContent, /export interface CreatePaymentDto/);
  assert.match(paymentsContent, /export interface CounterpartyDebtDto/);
});

test("shared product contracts expose units and reference prices", async () => {
  const masterDataContent = await readFile(masterDataPath, "utf8");
  const documentsContent = await readFile(documentsPath, "utf8");

  assert.match(masterDataContent, /export interface ProductUnitDto/);
  assert.match(masterDataContent, /salePrice: DecimalString \| null/);
  assert.match(masterDataContent, /purchasePrice: DecimalString \| null/);
  assert.match(documentsContent, /unitFactor: DecimalString/);
});
