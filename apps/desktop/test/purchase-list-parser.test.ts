import type { ProductDto } from "@quanti/shared";
import { describe, expect, test } from "vitest";

import { matchProduct, mergePurchaseRows, parsePurchaseList } from "../src/features/documents/purchase-list-parser";

function product(id: string, name: string, unit = "кг", aliases: string[] = [], units: ProductDto["units"] = []): ProductDto {
  return {
    id, sku: id.toUpperCase(), name, description: null, unit, units, aliases,
    purchasePrice: "10.00", salePrice: "12.00", categoryId: null, categoryName: null,
    isActive: true, createdAt: "", updatedAt: ""
  };
}

const products = [
  product("cucumber", "Огурец"),
  product("avocado", "Авокадо", "шт"),
  product("rossa", "Салат Лолло Росса", "пуч", ["Росса"], [{ id: "rossa-kg", name: "кг", conversionFactor: "1" }]),
  product("bionda", "Салат Лолло Бионда", "пуч", ["Бионда"], [{ id: "bionda-kg", name: "кг", conversionFactor: "1" }]),
  product("lemon", "Лимон"),
  product("apple-gala", "Яблоко Гала"),
  product("apple-fuji", "Яблоко Фуджи")
];

describe("purchase list parser", () => {
  test("parses headings, decimal commas, grams, inline comma-separated entries and bare quantities", () => {
    const rows = parsePurchaseList(`
      Заявка 1
      Огурцы 500гр
      Росса 0,5
      Лимон 2 кг
      Заявка 2
      Лимон 1 кг
      Авокадо 600гр
      Яблоки 3 кг, Бионда 0,2
      Лайм
    `, products);

    expect(rows).toHaveLength(8);
    expect(rows.find((row) => row.productQuery === "Огурцы")).toMatchObject({ productId: "cucumber", quantity: "0.5", unit: "кг", status: "ready" });
    expect(rows.find((row) => row.productQuery === "Росса")).toMatchObject({ productId: "rossa", quantity: "0.5", unit: "пуч", status: "ready" });
    expect(rows.find((row) => row.productQuery === "Авокадо")).toMatchObject({ productId: "avocado", status: "invalid-unit" });
    expect(rows.find((row) => row.productQuery === "Яблоки")?.status).toBe("ambiguous");
    expect(rows.find((row) => row.productQuery === "Лайм")?.status).toBe("missing-quantity");
  });

  test("uses saved aliases before fuzzy matching", () => {
    expect(matchProduct("Росса", products)).toMatchObject({ productId: "rossa", status: "ready" });
  });

  test("merges repeated products only when their units match", () => {
    const rows = parsePurchaseList("Лимон 2 кг\nЛимон 1 кг", products);
    expect(mergePurchaseRows(rows)).toEqual([expect.objectContaining({ productId: "lemon", quantity: "3", unit: "кг" })]);
  });
});
