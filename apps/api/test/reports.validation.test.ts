import assert from "node:assert/strict";
import test from "node:test";

import { BadRequestException } from "@nestjs/common";

import { ApiValidationPipe } from "../src/common/pipes/api-validation.pipe";
import { StockTurnoverReportRequest } from "../src/modules/reports/dto/report-requests";

test("report validation rejects malformed ISO dates in query filters", async () => {
  const pipe = new ApiValidationPipe();

  await assert.rejects(
    () => pipe.transform(
      {
        from: "not-a-date",
        to: "also-not-a-date"
      },
      {
        type: "query",
        metatype: StockTurnoverReportRequest
      }
    ),
    (error: unknown) => error instanceof BadRequestException
  );
});
