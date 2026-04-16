import assert from "node:assert/strict";
import test from "node:test";

import { BadRequestException } from "@nestjs/common";

import { PaymentsService } from "../src/modules/payments/payments.service";

function createPaymentsPrismaMock() {
  const operations = {
    moneyMovementCreates: [] as Array<Record<string, unknown>>,
    moneyMovementDeletes: [] as Array<Record<string, unknown>>,
    paymentUpdates: [] as Array<Record<string, unknown>>,
    paymentDeletes: [] as Array<Record<string, unknown>>,
    allocationDeletes: [] as Array<Record<string, unknown>>,
    allocationCreates: [] as Array<Record<string, unknown>[]>
  };

  const draftPayment = {
    id: "payment-1",
    number: "PAY-0001",
    direction: "INCOMING",
    status: "DRAFT",
    paymentDate: new Date("2026-04-16T00:00:00.000Z"),
    amount: { toString: () => "150.00" },
    notes: null,
    accountId: "account-1",
    counterpartyId: "counterparty-1",
    allocations: [{
      id: "allocation-1",
      paymentId: "payment-1",
      documentId: "document-1",
      amount: { toString: () => "100.00" },
      allocatedAt: new Date("2026-04-16T00:00:00.000Z")
    }],
    createdAt: new Date("2026-04-16T00:00:00.000Z"),
    updatedAt: new Date("2026-04-16T00:00:00.000Z")
  };

  let currentPayment = { ...draftPayment };

  const tx = {
    payment: {
      findUnique: async () => currentPayment,
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        ...currentPayment,
        ...data,
        allocations: draftPayment.allocations
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        operations.paymentUpdates.push(data);
        currentPayment = {
          ...currentPayment,
          ...data
        };
        return currentPayment;
      },
      delete: async ({ where }: { where: Record<string, unknown> }) => {
        operations.paymentDeletes.push(where);
        return currentPayment;
      },
      findMany: async () => [currentPayment]
    },
    paymentAllocation: {
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        operations.allocationDeletes.push(where);
      },
      createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
        operations.allocationCreates.push(data);
      }
    },
    moneyMovement: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        operations.moneyMovementCreates.push(data);
      },
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        operations.moneyMovementDeletes.push(where);
      }
    }
  };

  return {
    operations,
    payment: tx.payment,
    paymentAllocation: tx.paymentAllocation,
    moneyMovement: tx.moneyMovement,
    $queryRaw: async () => [{
      counterpartyId: "counterparty-1",
      documentTotal: { toString: () => "150.00" },
      paidTotal: { toString: () => "100.00" },
      debtTotal: { toString: () => "50.00" }
    }],
    $transaction: async <T>(callback: (inner: typeof tx) => Promise<T>) => callback(tx),
    setPaymentStatus(status: "DRAFT" | "POSTED") {
      currentPayment = {
        ...currentPayment,
        status
      };
    }
  };
}

test("payments service posts a draft payment and creates money movement", async () => {
  const prisma = createPaymentsPrismaMock();
  const service = new PaymentsService(prisma as never);

  const result = await service.post("payment-1", "2026-04-16T10:00:00.000Z");

  assert.equal(result.status, "POSTED");
  assert.equal(prisma.operations.moneyMovementCreates.length, 1);
  assert.deepEqual(prisma.operations.paymentUpdates.at(-1), {
    status: "POSTED"
  });
});

test("payments service rejects over-allocation", async () => {
  const prisma = createPaymentsPrismaMock();
  const service = new PaymentsService(prisma as never);

  await assert.rejects(
    () => service.createDraft({
      number: "PAY-0002",
      direction: "INCOMING",
      paymentDate: "2026-04-16T00:00:00.000Z",
      amount: "100.00",
      accountId: "account-1",
      allocations: [{ documentId: "document-1", amount: "120.00" }]
    }),
    (error: unknown) => error instanceof BadRequestException
  );
});

test("payments service unposts posted payments and removes money movements", async () => {
  const prisma = createPaymentsPrismaMock();
  prisma.setPaymentStatus("POSTED");
  const service = new PaymentsService(prisma as never);

  const result = await service.unpost("payment-1");

  assert.equal(result.status, "DRAFT");
  assert.deepEqual(prisma.operations.moneyMovementDeletes.at(-1), { paymentId: "payment-1" });
});

test("payments service derives debt totals per counterparty", async () => {
  const prisma = createPaymentsPrismaMock();
  const service = new PaymentsService(prisma as never);

  const result = await service.getCounterpartyDebts();

  assert.deepEqual(result, [{
    counterpartyId: "counterparty-1",
    documentTotal: "150.00",
    paidTotal: "100.00",
    debtTotal: "50.00"
  }]);
});
