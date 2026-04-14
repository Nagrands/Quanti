import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = "/Users/nagrand/Develop/Quanti";
const indexPath = path.join(repoRoot, "packages/shared/src/index.ts");
const enumsPath = path.join(repoRoot, "packages/shared/src/enums.ts");
const documentsPath = path.join(repoRoot, "packages/shared/src/documents.ts");
const paymentsPath = path.join(repoRoot, "packages/shared/src/payments.ts");

test("shared contracts export the expected modules", async () => {
  const indexContent = await readFile(indexPath, "utf8");

  assert.match(indexContent, /export \* from "\.\/identifiers"/);
  assert.match(indexContent, /export \* from "\.\/enums"/);
  assert.match(indexContent, /export \* from "\.\/documents"/);
  assert.match(indexContent, /export \* from "\.\/payments"/);
  assert.match(indexContent, /export \* from "\.\/reports"/);
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
