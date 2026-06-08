import assert from "node:assert/strict";
import test from "node:test";
import { StreamableFile } from "@nestjs/common";

import { PrintingController } from "../src/modules/printing/printing.controller";

test("printing controller streams document PDF with metadata headers", async () => {
  const calls: Array<{ id: string; templateVersion?: number }> = [];
  const headers = new Map<string, string>();
  const controller = new PrintingController({
    async render(id: string, templateVersion?: number) {
      calls.push({ id, templateVersion });
      return {
        fileName: "SO-001.pdf",
        content: Buffer.from("%PDF-test"),
        templateVersion: 2
      };
    }
  } as never);

  const result = await controller.printDocument(
    "document-1",
    { templateVersion: 2 },
    { setHeader: (name: string, value: string) => headers.set(name, value) }
  );

  assert.ok(result instanceof StreamableFile);
  assert.deepEqual(calls, [{ id: "document-1", templateVersion: 2 }]);
  assert.equal(headers.get("Content-Disposition"), 'attachment; filename="SO-001.pdf"');
  assert.equal(headers.get("X-Print-Template-Version"), "2");
});
