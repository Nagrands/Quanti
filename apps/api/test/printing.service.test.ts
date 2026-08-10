import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultDocumentTemplateV1,
  defaultDocumentTemplateV2
} from "../src/modules/printing/default-document-template";
import { DocumentPrintService } from "../src/modules/printing/document-print.service";
import { PdfRenderException } from "../src/modules/printing/pdf-render.exception";
import { PrintTemplateRepository } from "../src/modules/printing/print-template.repository";

function decimal(value: string) {
  return { toString: () => value };
}

function createDocumentPrismaMock(type = "SALE") {
  return {
    document: {
      async findUnique() {
        return {
          id: "document-1",
          number: type === "SALE" ? "SALE-202607-0002" : "TRF/001",
          type,
          status: "POSTED",
          documentDate: new Date("2026-07-01T00:00:00.000Z"),
          notes: "Ship next week",
          totalAmount: decimal("150.00"),
          counterparty: { name: "Acme LLC" },
          warehouse: { name: "Main warehouse" },
          sourceWarehouse: type === "TRANSFER" ? { name: "Склад Север" } : null,
          destinationWarehouse: type === "TRANSFER" ? { name: "Склад Юг" } : null,
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

async function renderDefaultTemplate(type = "SALE") {
  let html = "";
  const service = new DocumentPrintService(
    createDocumentPrismaMock(type) as never,
    { find: async () => defaultDocumentTemplateV2 } as never,
    { render: async (value: string) => { html = value; return Buffer.from("%PDF-fake"); } }
  );

  await service.render("document-1");
  return html;
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

  assert.equal(result.fileName, "SALE-202607-0002.pdf");
  assert.equal(result.templateVersion, 3);
  assert.equal(result.content.toString(), "%PDF-fake");
  assert.match(html, /<style>body\{font-family:Arial\}<\/style>/);
  assert.match(html, /SALE-202607-0002/);
  assert.match(html, /Widget/);
});

test("default v2 sale template is Russian and omits SKU, status, branding, and warehouse", async () => {
  const html = await renderDefaultTemplate("SALE");

  assert.match(html, /<h1>Продажа<\/h1>/);
  assert.match(html, /1 июл\. 2026 г\./);
  assert.doesNotMatch(html, /QUANTI ERP/i);
  assert.doesNotMatch(html, /POSTED/);
  assert.doesNotMatch(html, /Main warehouse/);
  assert.doesNotMatch(html, /SKU-001/);
  assert.doesNotMatch(html, />Артикул</);

  const product = html.indexOf(">Товар<");
  const quantity = html.indexOf(">Количество<");
  const unit = html.indexOf(">Ед. изм.<");
  const price = html.indexOf(">Цена<");
  const amount = html.indexOf(">Сумма<");
  assert.ok(product < quantity && quantity < unit && unit < price && price < amount);
  assert.match(html, /footer \{ display: flex; justify-content: flex-end;/);
});

test("default v2 transfer template keeps SKU and source and destination warehouses", async () => {
  const html = await renderDefaultTemplate("TRANSFER");

  assert.match(html, /<h1>Перемещение<\/h1>/);
  assert.match(html, />Артикул</);
  assert.match(html, /SKU-001/);
  assert.match(html, /Склад-отправитель/);
  assert.match(html, /Склад Север/);
  assert.match(html, /Склад-получатель/);
  assert.match(html, /Склад Юг/);
  assert.doesNotMatch(html, /Main warehouse/);

  const sku = html.indexOf(">Артикул<");
  const product = html.indexOf(">Товар<");
  const quantity = html.indexOf(">Количество<");
  const unit = html.indexOf(">Ед. изм.<");
  assert.ok(sku < product && product < quantity && quantity < unit);
});

test("default v2 template provides Russian titles for every document type", async () => {
  const titles = {
    SALE: "Продажа",
    PURCHASE: "Закупка",
    TRANSFER: "Перемещение",
    STOCK_ADJUSTMENT: "Корректировка остатков",
    RETURN_IN: "Возврат от покупателя",
    RETURN_OUT: "Возврат поставщику"
  };

  for (const [type, title] of Object.entries(titles)) {
    const html = await renderDefaultTemplate(type);
    assert.match(html, new RegExp(`<h1>${title}</h1>`));
  }
});

test("explicit v1 rendering keeps the legacy form", async () => {
  let html = "";
  const requestedVersions: Array<number | undefined> = [];
  const service = new DocumentPrintService(
    createDocumentPrismaMock() as never,
    {
      find: async (_scope: string, version?: number) => {
        requestedVersions.push(version);
        return defaultDocumentTemplateV1;
      }
    } as never,
    { render: async (value: string) => { html = value; return Buffer.from("%PDF-fake"); } }
  );

  await service.render("document-1", 1);

  assert.deepEqual(requestedVersions, [1]);
  assert.match(html, /<h1>Sales document<\/h1>/);
  assert.match(html, /1 Jul 2026/);
  assert.match(html, /Quanti ERP/);
  assert.match(html, /POSTED/);
  assert.match(html, /SKU-001/);
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

test("print template repository ensures both defaults and returns current v2", async () => {
  const calls: string[] = [];
  const prisma = {
    async $queryRaw() {
      calls.push("query");
      return [{
        id: "default-document-template-v2",
        scope: "DOCUMENT",
        name: "Стандартная форма документа",
        version: 2,
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

  assert.equal(template.version, 2);
  assert.deepEqual(calls, ["insert", "insert", "query"]);
});

test("print template repository can return explicit legacy v1", async () => {
  const calls: string[] = [];
  const prisma = {
    async $queryRaw() {
      calls.push("query");
      return [{
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

  const template = await repository.find("DOCUMENT", 1);

  assert.equal(template.version, 1);
  assert.deepEqual(calls, ["insert", "insert", "query"]);
});
