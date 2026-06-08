import assert from "node:assert/strict";
import test from "node:test";

import { DocumentPrintService } from "../src/modules/printing/document-print.service";
import { PdfRenderException } from "../src/modules/printing/pdf-render.exception";
import { PrintTemplateRepository } from "../src/modules/printing/print-template.repository";

function decimal(value: string) {
  return { toString: () => value };
}

function createDocumentPrismaMock() {
  return {
    document: {
      async findUnique() {
        return {
          id: "document-1",
          number: "SO/001",
          type: "SALE",
          status: "POSTED",
          documentDate: new Date("2026-04-14T00:00:00.000Z"),
          notes: "Ship next week",
          totalAmount: decimal("150.00"),
          counterparty: { name: "Acme LLC" },
          warehouse: { name: "Main warehouse" },
          sourceWarehouse: null,
          destinationWarehouse: null,
          items: [{
            lineNo: 1,
            quantity: decimal("10.000"),
            price: decimal("15.00"),
            amount: decimal("150.00"),
            product: { sku: "SKU-001", name: "Widget", unit: "pcs" }
          }]
        };
      }
    }
  };
}

test("document print service renders Handlebars context through the PDF renderer", async () => {
  let html = "";
  const service = new DocumentPrintService(
    createDocumentPrismaMock() as never,
    { find: async () => ({
      id: "template-1",
      scope: "DOCUMENT",
      name: "Template",
      version: 3,
      html: "<h1>{{number}}</h1><p>{{items.0.productName}}</p>",
      styles: "body{font-family:Arial}"
    }) } as never,
    { render: async (value: string) => { html = value; return Buffer.from("%PDF-fake"); } }
  );

  const result = await service.render("document-1", 3);

  assert.equal(result.fileName, "SO-001.pdf");
  assert.equal(result.templateVersion, 3);
  assert.equal(result.content.toString(), "%PDF-fake");
  assert.match(html, /<style>body\{font-family:Arial\}<\/style>/);
  assert.match(html, /SO\/001/);
  assert.match(html, /Widget/);
});

test("document print service maps renderer failures to a stable PDF error", async () => {
  const service = new DocumentPrintService(
    createDocumentPrismaMock() as never,
    { find: async () => ({
      id: "template-1",
      scope: "DOCUMENT",
      name: "Template",
      version: 1,
      html: "<h1>{{number}}</h1>",
      styles: null
    }) } as never,
    { render: async () => { throw new Error("Chromium unavailable."); } }
  );

  await assert.rejects(
    () => service.render("document-1"),
    (error) => {
      assert.ok(error instanceof PdfRenderException);
      assert.deepEqual(error.getResponse(), {
        code: "PDF_RENDER_ERROR",
        message: "Chromium unavailable.",
        statusCode: 503
      });
      return true;
    }
  );
});

test("print template repository creates and returns the default document template", async () => {
  const calls: string[] = [];
  const prisma = {
    async $queryRaw() {
      calls.push("query");
      return calls.length === 1 ? [] : [{
        id: "default-document-template-v1",
        scope: "DOCUMENT",
        name: "Default document",
        version: 1,
        html: "<main></main>",
        styles: null
      }];
    },
    async $executeRaw() {
      calls.push("insert");
      return 1;
    }
  };
  const repository = new PrintTemplateRepository(prisma as never);

  const template = await repository.find("DOCUMENT");

  assert.equal(template.version, 1);
  assert.deepEqual(calls, ["query", "insert", "query"]);
});
