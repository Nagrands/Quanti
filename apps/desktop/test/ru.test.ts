import { describe, expect, test } from "vitest";

import { ApiError } from "../src/api/errors";
import { formatApiErrorForLocale } from "../src/i18n";

const context = {
  products: [{
    id: "product-1",
    sku: "SKU-1",
    name: "Widget",
    description: null,
    unit: "шт",
    units: [],
    lastSalePrice: null,
    lastSaleUnit: null,
    lastPurchasePrice: null,
    lastPurchaseUnit: null,
    categoryId: null,
    categoryName: null,
    isActive: true,
    createdAt: "",
    updatedAt: ""
  }],
  warehouses: [{
    id: "warehouse-1",
    code: "MAIN",
    name: "Основной склад",
    isActive: true,
    createdAt: "",
    updatedAt: ""
  }]
};

describe("Russian API error formatting", () => {
  test("explains an insufficient stock error using lookup names", () => {
    const message = formatApiErrorForLocale("ru", new ApiError(400, "INSUFFICIENT_STOCK", "Insufficient stock.", {
      productId: "product-1",
      warehouseId: "warehouse-1",
      availableQuantity: "6.000",
      requiredQuantity: "7.000"
    }), context);

    expect(message).toContain("SKU-1 · Widget");
    expect(message).toContain("MAIN · Основной склад");
    expect(message).toContain("Доступно: 6.000, требуется: 7.000");
    expect(message).toContain("проведите поступление или уменьшите количество продажи");
  });

  test("uses safe fallback names when lookups are unavailable", () => {
    const message = formatApiErrorForLocale("ru", new ApiError(400, "INSUFFICIENT_STOCK", "Insufficient stock.", {
      productId: "missing",
      warehouseId: "missing",
      availableQuantity: "0.000",
      requiredQuantity: "1.000"
    }));

    expect(message).toContain("выбранного товара");
    expect(message).toContain("выбранном складе");
  });

  test("localizes network and unknown errors", () => {
    expect(formatApiErrorForLocale("ru", new ApiError(0, "NETWORK_ERROR", "Failed to fetch")))
      .toBe("Нет соединения с API. Проверьте, что сервер Quanti запущен.");
    expect(formatApiErrorForLocale("ru", new Error("unknown")))
      .toBe("Не удалось выполнить операцию. Повторите попытку.");
  });

  test("formats the same stock error in English", () => {
    const message = formatApiErrorForLocale("en", new ApiError(400, "INSUFFICIENT_STOCK", "Insufficient stock.", {
      productId: "product-1",
      warehouseId: "warehouse-1",
      availableQuantity: "6.000",
      requiredQuantity: "7.000"
    }), context);

    expect(message).toContain("Insufficient stock");
    expect(message).toContain("Available: 6.000, required: 7.000");
    expect(message).toContain("Post a purchase first or reduce the sale quantity");
  });
});
