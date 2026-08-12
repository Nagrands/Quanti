import assert from "node:assert/strict";
import test from "node:test";

import { BadRequestException } from "@nestjs/common";

import {
  FACTOR_SCALE,
  formatScaled,
  formatScaledFixed,
  MONEY_SCALE,
  multiplyQuantity,
  QUANTITY_SCALE,
  toScaled
} from "../src/common/fixed-point";
import { serializedTransaction } from "../src/common/prisma/serialized-transaction";

test("fixed-point conversion preserves large exact decimal values", () => {
  const value = toScaled("9007199254740991.99", MONEY_SCALE, "money");
  assert.equal(value, 900_719_925_474_099_199n);
  assert.equal(formatScaled(value, MONEY_SCALE), "9007199254740991.99");
  assert.equal(formatScaledFixed(toScaled("-12.5", MONEY_SCALE), MONEY_SCALE), "-12.50");
});

test("fixed-point conversion rejects precision loss", () => {
  assert.throws(
    () => toScaled("1.001", MONEY_SCALE, "money"),
    (error: unknown) => error instanceof BadRequestException
  );
  assert.equal(toScaled("1.001", QUANTITY_SCALE), 1_001n);
});

test("quantity and unit factor multiplication rounds to the quantity scale", () => {
  assert.equal(multiplyQuantity(1_001n, toScaled("0.5", FACTOR_SCALE)), 501n);
  assert.equal(multiplyQuantity(-1_001n, toScaled("0.5", FACTOR_SCALE)), -501n);
});

test("serialized writes continue in order after a rolled-back operation", async () => {
  const events: string[] = [];
  const prisma = {
    async $transaction<T>(operation: (client: object) => Promise<T>) {
      return operation({});
    }
  };
  const first = serializedTransaction(prisma as never, async () => {
    events.push("first:start");
    await new Promise((resolve) => setTimeout(resolve, 10));
    events.push("first:rollback");
    throw new Error("rollback");
  });
  const second = serializedTransaction(prisma as never, async () => {
    events.push("second:start");
    return "committed";
  });

  await assert.rejects(first, /rollback/);
  assert.equal(await second, "committed");
  assert.deepEqual(events, ["first:start", "first:rollback", "second:start"]);
});
