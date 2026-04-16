import assert from "node:assert/strict";
import test from "node:test";

import { DocumentsController } from "../src/modules/documents/documents.controller";

test("documents controller delegates draft and posting lifecycle calls", async () => {
  const calls = {
    create: [] as Array<Record<string, unknown>>,
    update: [] as Array<Record<string, unknown>>,
    post: [] as Array<Record<string, unknown>>,
    unpost: [] as string[],
    repost: [] as Array<Record<string, unknown>>
  };

  const controller = new DocumentsController({
    findAll: async () => [{ id: "document-1" }],
    findOne: async (id: string) => ({ id }),
    createDraft: async (payload: Record<string, unknown>) => {
      calls.create.push(payload);
      return payload;
    },
    updateDraft: async (id: string, payload: Record<string, unknown>) => {
      calls.update.push({ id, ...payload });
      return { id, ...payload };
    },
    removeDraft: async () => undefined,
    post: async (id: string, postedAt?: string) => {
      calls.post.push({ id, postedAt });
      return { id, status: "POSTED" };
    },
    unpost: async (id: string) => {
      calls.unpost.push(id);
      return { id, status: "DRAFT" };
    },
    repost: async (payload: Record<string, unknown>) => {
      calls.repost.push(payload);
      return { id: payload.id, status: "POSTED" };
    }
  } as never);

  assert.equal((await controller.findOne("document-1")).id, "document-1");
  await controller.create({
    number: "SO-0001",
    type: "SALE",
    documentDate: "2026-04-16T00:00:00.000Z",
    items: [{ productId: "product-1", quantity: "5.000", price: "30.00", amount: "150.00" }]
  });
  await controller.update("document-1", { notes: "Updated" });
  await controller.post("document-1", { postedAt: "2026-04-16T10:00:00.000Z" });
  await controller.unpost("document-1");
  await controller.repost("document-1", { postedAt: "2026-04-16T11:00:00.000Z" });

  assert.equal(calls.create.length, 1);
  assert.deepEqual(calls.update.at(-1), { id: "document-1", notes: "Updated" });
  assert.deepEqual(calls.post.at(-1), { id: "document-1", postedAt: "2026-04-16T10:00:00.000Z" });
  assert.deepEqual(calls.unpost, ["document-1"]);
  assert.deepEqual(calls.repost.at(-1), {
    id: "document-1",
    postedAt: "2026-04-16T11:00:00.000Z"
  });
});
