import assert from "node:assert/strict";
import test from "node:test";

import { AccountsController } from "../src/modules/products/accounts.controller";
import { CounterpartiesController } from "../src/modules/products/counterparties.controller";
import { ProductCategoriesController } from "../src/modules/products/product-categories.controller";
import { ProductsController } from "../src/modules/products/products.controller";
import { WarehousesController } from "../src/modules/products/warehouses.controller";

test("master data controllers delegate CRUD calls to services", async () => {
  const categoryCalls = { includeInactive: false, restoredId: "" };
  const productCategoriesController = new ProductCategoriesController({
    findAll: async (includeInactive = false) => {
      categoryCalls.includeInactive = includeInactive;
      return [{ id: "category-1", code: "VEG" }];
    },
    findOne: async (id: string) => ({ id, code: "VEG" }),
    create: async (payload: Record<string, unknown>) => payload,
    update: async (id: string, payload: Record<string, unknown>) => ({ id, ...payload }),
    remove: async () => undefined,
    restore: async (id: string) => {
      categoryCalls.restoredId = id;
      return { id, code: "VEG", isActive: true };
    }
  } as never);
  const productsCalls = { includeInactive: false, id: "", payload: {} as Record<string, unknown>, removedId: "", restoredId: "" };
  const productsController = new ProductsController({
    findAll: async (includeInactive = false) => {
      productsCalls.includeInactive = includeInactive;
      return [{ id: "product-1", sku: "SKU-001" }];
    },
    findOne: async (id: string) => ({ id, sku: "SKU-001" }),
    create: async (payload: Record<string, unknown>) => payload,
    update: async (id: string, payload: Record<string, unknown>) => {
      productsCalls.id = id;
      productsCalls.payload = payload;
      return { id, ...payload };
    },
    remove: async (id: string) => {
      productsCalls.removedId = id;
    },
    restore: async (id: string) => {
      productsCalls.restoredId = id;
      return { id, sku: "SKU-001", isActive: true };
    }
  } as never);

  const warehousesCalls = { removedId: "" };
  const warehousesController = new WarehousesController({
    findAll: async () => [{ id: "warehouse-1", code: "MAIN" }],
    findOne: async (id: string) => ({ id, code: "MAIN" }),
    create: async (payload: Record<string, unknown>) => payload,
    update: async (_id: string, payload: Record<string, unknown>) => payload,
    remove: async (id: string) => {
      warehousesCalls.removedId = id;
    }
  } as never);

  const counterpartiesController = new CounterpartiesController({
    findAll: async () => [{ id: "counterparty-1", code: "C-001" }],
    findOne: async (id: string) => ({ id, code: "C-001" }),
    create: async (payload: Record<string, unknown>) => payload,
    update: async (id: string, payload: Record<string, unknown>) => ({ id, ...payload }),
    remove: async () => undefined
  } as never);

  const accountsController = new AccountsController({
    findAll: async () => [{ id: "account-1", code: "CASH-001" }],
    findOne: async (id: string) => ({ id, code: "CASH-001" }),
    create: async (payload: Record<string, unknown>) => payload,
    update: async (id: string, payload: Record<string, unknown>) => ({ id, ...payload }),
    remove: async () => undefined
  } as never);

  assert.equal((await productsController.findAll("true"))[0]?.sku, "SKU-001");
  assert.equal(productsCalls.includeInactive, true);
  assert.equal((await productsController.findOne("product-1")).id, "product-1");
  assert.equal((await productsController.create({
    sku: "SKU-NEW",
    name: "New product",
    unit: "pcs"
  })).sku, "SKU-NEW");
  assert.equal((await productsController.update("product-1", { name: "Updated" })).name, "Updated");
  await productsController.remove("product-1");
  await productsController.restore("product-1");
  assert.equal(productsCalls.id, "product-1");
  assert.deepEqual(productsCalls.payload, { name: "Updated" });
  assert.equal(productsCalls.removedId, "product-1");
  assert.equal(productsCalls.restoredId, "product-1");

  assert.equal((await warehousesController.findAll())[0]?.code, "MAIN");
  await warehousesController.remove("warehouse-1");
  assert.equal(warehousesCalls.removedId, "warehouse-1");

  assert.equal((await productCategoriesController.findAll("true"))[0]?.code, "VEG");
  assert.equal(categoryCalls.includeInactive, true);
  await productCategoriesController.restore("category-1");
  assert.equal(categoryCalls.restoredId, "category-1");
  assert.equal((await counterpartiesController.findOne("counterparty-1")).id, "counterparty-1");
  assert.equal((await accountsController.findOne("account-1")).id, "account-1");
});
