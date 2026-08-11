import assert from "node:assert/strict";
import test from "node:test";

import { BadRequestException } from "@nestjs/common";

import { ApiExceptionFilter } from "../src/common/filters/api-exception.filter";
import { ApiValidationPipe } from "../src/common/pipes/api-validation.pipe";
import { CreateProductRequest } from "../src/modules/products/dto/create-product.request";

function createResponseMock() {
  const responseState = {
    statusCode: 200,
    body: undefined as unknown
  };

  return {
    response: {
      status(statusCode: number) {
        responseState.statusCode = statusCode;

        return {
          json(body: unknown) {
            responseState.body = body;
          }
        };
      }
    },
    responseState
  };
}

test("api validation pipe returns bad-request errors for invalid product payloads", async () => {
  const pipe = new ApiValidationPipe();

  await assert.rejects(
    () =>
      pipe.transform(
        { name: "Widget" },
        {
          type: "body",
          metatype: CreateProductRequest
        }
      ),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);

      const response = error.getResponse() as { message: string[] };
      assert.ok(response.message.includes("sku must be a string"));
      assert.ok(response.message.includes("unit must be a string"));

      return true;
    }
  );
});

test("product reference prices accept null or two decimals and reject invalid values", async () => {
  const pipe = new ApiValidationPipe();
  const metadata = { type: "body" as const, metatype: CreateProductRequest };

  await assert.doesNotReject(() => pipe.transform({
    sku: "SKU-1",
    name: "Widget",
    unit: "pcs",
    purchasePrice: null,
    salePrice: "12.50"
  }, metadata));

  for (const salePrice of ["-1", "1.234", "free"]) {
    await assert.rejects(
      () => pipe.transform({ sku: "SKU-1", name: "Widget", unit: "pcs", salePrice }, metadata),
      BadRequestException
    );
  }
});

test("product aliases accept a list of strings", async () => {
  const pipe = new ApiValidationPipe();
  const metadata = { type: "body" as const, metatype: CreateProductRequest };
  await assert.doesNotReject(() => pipe.transform({ sku: "SKU-1", name: "Widget", unit: "pcs", aliases: ["Goods"] }, metadata));
  await assert.rejects(() => pipe.transform({ sku: "SKU-1", name: "Widget", unit: "pcs", aliases: [10] }, metadata), BadRequestException);
});

test("api exception filter maps validation errors into stable response shape", () => {
  const filter = new ApiExceptionFilter();
  const { response, responseState } = createResponseMock();

  filter.catch(
    new BadRequestException(["sku must be a string", "unit must be a string"]),
    {
      switchToHttp: () => ({
        getResponse: () => response
      })
    } as never
  );

  assert.equal(responseState.statusCode, 400);
  assert.deepEqual(responseState.body, {
    error: {
      code: "VALIDATION_ERROR",
      message: ["sku must be a string", "unit must be a string"],
      statusCode: 400
    }
  });
});

test("api exception filter preserves structured error details", () => {
  const filter = new ApiExceptionFilter();
  const { response, responseState } = createResponseMock();

  filter.catch(
    new BadRequestException({
      code: "INSUFFICIENT_STOCK",
      message: "Insufficient stock.",
      details: {
        productId: "product-1",
        warehouseId: "warehouse-1",
        availableQuantity: "6.000",
        requiredQuantity: "7.000"
      }
    }),
    {
      switchToHttp: () => ({
        getResponse: () => response
      })
    } as never
  );

  assert.equal(responseState.statusCode, 400);
  assert.deepEqual(responseState.body, {
    error: {
      code: "INSUFFICIENT_STOCK",
      message: "Insufficient stock.",
      statusCode: 400,
      details: {
        productId: "product-1",
        warehouseId: "warehouse-1",
        availableQuantity: "6.000",
        requiredQuantity: "7.000"
      }
    }
  });
});

test("api exception filter maps duplicate keys into conflict response shape", () => {
  const filter = new ApiExceptionFilter();
  const { response, responseState } = createResponseMock();

  filter.catch(
    {
      code: "P2002",
      clientVersion: "test",
      meta: {
        target: ["sku"]
      }
    },
    {
      switchToHttp: () => ({
        getResponse: () => response
      })
    } as never
  );

  assert.equal(responseState.statusCode, 409);
  assert.deepEqual(responseState.body, {
    error: {
      code: "CONFLICT",
      message: "Unique constraint violation for sku.",
      statusCode: 409
    }
  });
});
