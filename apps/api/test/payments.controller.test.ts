import assert from "node:assert/strict";
import test from "node:test";

import { PaymentsController } from "../src/modules/payments/payments.controller";

test("payments controller delegates draft, posting, and debt calls", async () => {
  const calls = {
    create: [] as Array<Record<string, unknown>>,
    update: [] as Array<Record<string, unknown>>,
    post: [] as Array<Record<string, unknown>>,
    unpost: [] as string[],
    repost: [] as Array<Record<string, unknown>>
  };

  const controller = new PaymentsController({
    getCounterpartyDebts: async () => [{ counterpartyId: "counterparty-1", debtTotal: "50.00" }],
    findAll: async () => [{ id: "payment-1" }],
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

  assert.equal((await controller.getCounterpartyDebts()).length, 1);
  assert.equal((await controller.findOne("payment-1")).id, "payment-1");
  await controller.create({
    number: "PAY-0001",
    direction: "INCOMING",
    paymentDate: "2026-04-16T00:00:00.000Z",
    amount: "150.00",
    accountId: "account-1",
    allocations: [{ documentId: "document-1", amount: "100.00" }]
  });
  await controller.update("payment-1", { notes: "Updated" });
  await controller.post("payment-1", { postedAt: "2026-04-16T10:00:00.000Z" });
  await controller.unpost("payment-1");
  await controller.repost("payment-1", {});

  assert.equal(calls.create.length, 1);
  assert.deepEqual(calls.update.at(-1), { id: "payment-1", notes: "Updated" });
  assert.deepEqual(calls.post.at(-1), { id: "payment-1", postedAt: "2026-04-16T10:00:00.000Z" });
  assert.deepEqual(calls.unpost, ["payment-1"]);
  assert.deepEqual(calls.repost.at(-1), { id: "payment-1" });
});
