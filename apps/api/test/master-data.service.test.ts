import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@quanti/db";

import { AccountsService } from "../src/modules/products/accounts.service";
import { CounterpartiesService } from "../src/modules/products/counterparties.service";
import { ProductCategoriesService } from "../src/modules/products/product-categories.service";
import { ProductsService } from "../src/modules/products/products.service";
import { WarehousesService } from "../src/modules/products/warehouses.service";

function createPrismaMock() {
  const operations = {
    productDeleteCalls: 0,
    warehouseDeleteCalls: 0,
    counterpartyDeleteCalls: 0,
    accountDeleteCalls: 0,
    categoryDeleteCalls: 0,
    productUpdateCalls: [] as Array<Record<string, unknown>>,
    categoryUpdateCalls: [] as Array<Record<string, unknown>>,
    warehouseUpdateCalls: [] as Array<Record<string, unknown>>,
    counterpartyUpdateCalls: [] as Array<Record<string, unknown>>,
    accountUpdateCalls: [] as Array<Record<string, unknown>>,
    productFindManyArgs: [] as Array<Record<string, unknown>>,
    warehouseFindManyArgs: [] as Array<Record<string, unknown>>,
    counterpartyFindManyArgs: [] as Array<Record<string, unknown>>,
    accountFindManyArgs: [] as Array<Record<string, unknown>>,
    categoryFindManyArgs: [] as Array<Record<string, unknown>>,
    productFindFirstArgs: [] as Array<Record<string, unknown>>,
    categoryFindFirstArgs: [] as Array<Record<string, unknown>>,
    warehouseFindFirstArgs: [] as Array<Record<string, unknown>>,
    counterpartyFindFirstArgs: [] as Array<Record<string, unknown>>,
    accountFindFirstArgs: [] as Array<Record<string, unknown>>
  };
  const productRecord = {
    id: "product-1",
    sku: "SKU-001",
    name: "Widget",
    description: null,
    unit: "pcs",
    purchasePrice: new Prisma.Decimal("18.00"),
    salePrice: new Prisma.Decimal("25.00"),
    units: [{ id: "unit-1", productId: "product-1", name: "box", conversionFactor: new Prisma.Decimal(10), createdAt: new Date("2026-04-14T00:00:00.000Z"), updatedAt: new Date("2026-04-14T00:00:00.000Z") }],
    aliases: [{ id: "alias-1", productId: "product-1", name: "Goods", normalizedName: "goods", createdAt: new Date("2026-04-14T00:00:00.000Z"), updatedAt: new Date("2026-04-14T00:00:00.000Z") }],
    categoryId: "category-1",
    isActive: true,
    createdAt: new Date("2026-04-14T00:00:00.000Z"),
    updatedAt: new Date("2026-04-14T00:00:00.000Z")
  };
  const categoryRecord = {
    id: "category-1",
    code: "VEG",
    name: "Vegetables",
    description: null,
    isActive: true,
    createdAt: new Date("2026-04-14T00:00:00.000Z"),
    updatedAt: new Date("2026-04-14T00:00:00.000Z")
  };
  const warehouseRecord = {
    id: "warehouse-1",
    code: "MAIN",
    name: "Main warehouse",
    isActive: true,
    createdAt: new Date("2026-04-14T00:00:00.000Z"),
    updatedAt: new Date("2026-04-14T00:00:00.000Z")
  };
  const counterpartyRecord = {
    id: "counterparty-1",
    code: "C-001",
    name: "Acme",
    type: "CUSTOMER",
    taxId: null,
    isActive: true,
    createdAt: new Date("2026-04-14T00:00:00.000Z"),
    updatedAt: new Date("2026-04-14T00:00:00.000Z")
  };
  const accountRecord = {
    id: "account-1",
    code: "CASH-001",
    name: "Main cashbox",
    type: "CASH",
    currencyCode: "RUB",
    isActive: true,
    createdAt: new Date("2026-04-14T00:00:00.000Z"),
    updatedAt: new Date("2026-04-14T00:00:00.000Z")
  };

  return {
    operations,
    product: {
      findMany: async (args: Record<string, unknown>) => {
        operations.productFindManyArgs.push(args);
        return [{ ...productRecord, category: categoryRecord }];
      },
      findFirst: async (args: { where: { id?: string; isActive?: boolean } }) => {
        operations.productFindFirstArgs.push(args);
        return args.where.id === undefined || args.where.id === productRecord.id
          ? { ...productRecord, category: categoryRecord }
          : null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => ({ ...productRecord, ...data, category: categoryRecord }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        operations.productUpdateCalls.push(data);
        return { ...productRecord, ...data, category: categoryRecord };
      },
      delete: async () => {
        operations.productDeleteCalls += 1;
        return productRecord;
      }
    },
    documentItem: {
      findFirst: async ({ where }: { where: { document: { type: { in: string[] } } } }) =>
        where.document.type.in.includes("SALE")
          ? { price: new Prisma.Decimal("25.00"), unit: "box" }
          : { price: new Prisma.Decimal("18.00"), unit: "pcs" }
    },
    productCategory: {
      findMany: async (args: Record<string, unknown>) => {
        operations.categoryFindManyArgs.push(args);
        return [categoryRecord];
      },
      findFirst: async (args: { where: { id?: string; isActive?: boolean } }) => {
        operations.categoryFindFirstArgs.push(args);
        return args.where.id === undefined || args.where.id === categoryRecord.id
          ? categoryRecord
          : null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => ({ ...categoryRecord, ...data }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        operations.categoryUpdateCalls.push(data);
        return { ...categoryRecord, ...data };
      },
      delete: async () => {
        operations.categoryDeleteCalls += 1;
        return categoryRecord;
      }
    },
    warehouse: {
      findMany: async (args: Record<string, unknown>) => {
        operations.warehouseFindManyArgs.push(args);
        return [warehouseRecord];
      },
      findFirst: async (args: { where: { id?: string; isActive?: boolean } }) => {
        operations.warehouseFindFirstArgs.push(args);
        return args.where.id === undefined || args.where.id === warehouseRecord.id
          ? warehouseRecord
          : null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => ({ ...warehouseRecord, ...data }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        operations.warehouseUpdateCalls.push(data);
        return { ...warehouseRecord, ...data };
      },
      delete: async () => {
        operations.warehouseDeleteCalls += 1;
        return warehouseRecord;
      }
    },
    counterparty: {
      findMany: async (args: Record<string, unknown>) => {
        operations.counterpartyFindManyArgs.push(args);
        return [counterpartyRecord];
      },
      findFirst: async (args: { where: { id?: string; isActive?: boolean } }) => {
        operations.counterpartyFindFirstArgs.push(args);
        return args.where.id === undefined || args.where.id === counterpartyRecord.id
          ? counterpartyRecord
          : null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => ({ ...counterpartyRecord, ...data }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        operations.counterpartyUpdateCalls.push(data);
        return { ...counterpartyRecord, ...data };
      },
      delete: async () => {
        operations.counterpartyDeleteCalls += 1;
        return counterpartyRecord;
      }
    },
    account: {
      findMany: async (args: Record<string, unknown>) => {
        operations.accountFindManyArgs.push(args);
        return [accountRecord];
      },
      findFirst: async (args: { where: { id?: string; isActive?: boolean } }) => {
        operations.accountFindFirstArgs.push(args);
        return args.where.id === undefined || args.where.id === accountRecord.id
          ? accountRecord
          : null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => ({ ...accountRecord, ...data }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        operations.accountUpdateCalls.push(data);
        return { ...accountRecord, ...data };
      },
      delete: async () => {
        operations.accountDeleteCalls += 1;
        return accountRecord;
      }
    }
  };
}

test("master data services map CRUD records into shared DTOs", async () => {
  const prisma = createPrismaMock();

  const productCategoriesService = new ProductCategoriesService(prisma as never);
  const productsService = new ProductsService(prisma as never);
  const warehousesService = new WarehousesService(prisma as never);
  const counterpartiesService = new CounterpartiesService(prisma as never);
  const accountsService = new AccountsService(prisma as never);

  assert.equal((await productCategoriesService.findAll())[0]?.code, "VEG");
  assert.equal((await productsService.findAll())[0]?.sku, "SKU-001");
  assert.equal((await productsService.findAll())[0]?.categoryName, "Vegetables");
  assert.equal((await productsService.findAll())[0]?.salePrice, "25");
  assert.deepEqual((await productsService.findAll())[0]?.aliases, ["Goods"]);
  assert.equal((await productsService.findAll())[0]?.units[0]?.name, "box");
  assert.equal((await warehousesService.findAll())[0]?.code, "MAIN");
  assert.equal((await counterpartiesService.findAll())[0]?.code, "C-001");
  assert.equal((await accountsService.findAll())[0]?.code, "CASH-001");
  assert.equal((await warehousesService.findOne("warehouse-1")).code, "MAIN");
  assert.equal((await counterpartiesService.create({
    code: "C-NEW",
    name: "New counterparty",
    type: "CUSTOMER"
  })).type, "CUSTOMER");
  assert.equal((await accountsService.update("account-1", { currencyCode: "USD" })).currencyCode, "USD");
  assert.equal((await productCategoriesService.create({
    code: "FRUIT",
    name: "Fruits"
  })).name, "Fruits");

  await assert.doesNotReject(() => productCategoriesService.remove("category-1"));
  await assert.doesNotReject(() => productsService.remove("product-1"));
  await assert.doesNotReject(() => warehousesService.remove("warehouse-1"));
  await assert.doesNotReject(() => counterpartiesService.remove("counterparty-1"));
  await assert.doesNotReject(() => accountsService.remove("account-1"));

  assert.deepEqual(prisma.operations.categoryUpdateCalls.at(-1), { isActive: false });
  assert.deepEqual(prisma.operations.productUpdateCalls.at(-1), { isActive: false });
  assert.deepEqual(prisma.operations.warehouseUpdateCalls.at(-1), { isActive: false });
  assert.deepEqual(prisma.operations.counterpartyUpdateCalls.at(-1), { isActive: false });
  assert.deepEqual(prisma.operations.accountUpdateCalls.at(-1), { isActive: false });
  assert.equal(prisma.operations.categoryDeleteCalls, 0);
  assert.equal(prisma.operations.productDeleteCalls, 0);
  assert.equal(prisma.operations.warehouseDeleteCalls, 0);
  assert.equal(prisma.operations.counterpartyDeleteCalls, 0);
  assert.equal(prisma.operations.accountDeleteCalls, 0);
  assert.deepEqual(prisma.operations.categoryFindManyArgs.at(-1), {
    where: { isActive: true },
    orderBy: { createdAt: "asc" }
  });
  assert.deepEqual(prisma.operations.productFindManyArgs.at(-1), {
    where: { isActive: true },
    include: { category: true, aliases: { orderBy: { createdAt: "asc" } }, units: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" }
  });
  assert.deepEqual(prisma.operations.warehouseFindManyArgs.at(-1), {
    where: { isActive: true },
    orderBy: { createdAt: "asc" }
  });
  assert.deepEqual(prisma.operations.counterpartyFindManyArgs.at(-1), {
    where: { isActive: true },
    orderBy: { createdAt: "asc" }
  });
  assert.deepEqual(prisma.operations.accountFindManyArgs.at(-1), {
    where: { isActive: true },
    orderBy: { createdAt: "asc" }
  });
  assert.deepEqual(prisma.operations.categoryFindFirstArgs.at(-1), {
    where: { id: "category-1", isActive: true }
  });
  assert.deepEqual(prisma.operations.productFindFirstArgs.at(-1), {
    where: { id: "product-1", isActive: true },
    include: { category: true, aliases: { orderBy: { createdAt: "asc" } }, units: { orderBy: { createdAt: "asc" } } }
  });
  assert.deepEqual(prisma.operations.warehouseFindFirstArgs.at(-1), {
    where: { id: "warehouse-1", isActive: true }
  });
  assert.deepEqual(prisma.operations.counterpartyFindFirstArgs.at(-1), {
    where: { id: "counterparty-1", isActive: true }
  });
  assert.deepEqual(prisma.operations.accountFindFirstArgs.at(-1), {
    where: { id: "account-1", isActive: true }
  });

  assert.equal((await productCategoriesService.findAll(true))[0]?.code, "VEG");
  assert.equal((await productsService.findAll(true))[0]?.sku, "SKU-001");
  assert.equal((await warehousesService.findAll(true))[0]?.code, "MAIN");
  assert.equal((await counterpartiesService.findAll(true))[0]?.code, "C-001");
  assert.equal((await accountsService.findAll(true))[0]?.code, "CASH-001");
  assert.deepEqual(prisma.operations.categoryFindManyArgs.at(-1), {
    orderBy: { createdAt: "asc" }
  });
  assert.deepEqual(prisma.operations.productFindManyArgs.at(-1), {
    include: { category: true, aliases: { orderBy: { createdAt: "asc" } }, units: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" }
  });
  assert.deepEqual(prisma.operations.warehouseFindManyArgs.at(-1), {
    orderBy: { createdAt: "asc" }
  });
  assert.deepEqual(prisma.operations.counterpartyFindManyArgs.at(-1), {
    orderBy: { createdAt: "asc" }
  });
  assert.deepEqual(prisma.operations.accountFindManyArgs.at(-1), {
    orderBy: { createdAt: "asc" }
  });

  assert.equal((await productCategoriesService.restore("category-1")).isActive, true);
  assert.equal((await productsService.restore("product-1")).isActive, true);
  assert.equal((await warehousesService.restore("warehouse-1")).isActive, true);
  assert.equal((await counterpartiesService.restore("counterparty-1")).isActive, true);
  assert.equal((await accountsService.restore("account-1")).isActive, true);
  assert.deepEqual(prisma.operations.categoryUpdateCalls.at(-1), { isActive: true });
  assert.deepEqual(prisma.operations.productUpdateCalls.at(-1), { isActive: true });
  assert.deepEqual(prisma.operations.warehouseUpdateCalls.at(-1), { isActive: true });
  assert.deepEqual(prisma.operations.counterpartyUpdateCalls.at(-1), { isActive: true });
  assert.deepEqual(prisma.operations.accountUpdateCalls.at(-1), { isActive: true });
});

test("products service replaces additional units transactionally", async () => {
  const operations = {
    deleted: false,
    created: [] as Array<Record<string, unknown>>,
    aliasesDeleted: false,
    aliasesCreated: [] as Array<Record<string, unknown>>
  };
  const record = {
    id: "product-1",
    sku: "SKU-001",
    name: "Dill",
    description: null,
    unit: "kg",
    purchasePrice: null,
    salePrice: null,
    categoryId: null,
    isActive: true,
    createdAt: new Date("2026-06-24T00:00:00.000Z"),
    updatedAt: new Date("2026-06-24T00:00:00.000Z"),
    category: null,
    units: []
  };
  const tx = {
    product: {
      update: async () => record
    },
    productUnit: {
      deleteMany: async () => {
        operations.deleted = true;
      },
      createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
        operations.created = data;
      }
    },
    productAlias: {
      deleteMany: async () => { operations.aliasesDeleted = true; },
      createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => { operations.aliasesCreated = data; }
    }
  };
  const prisma = {
    product: {
      findFirst: async () => record
    },
    documentItem: {
      findFirst: async () => null
    },
    $transaction: async <T>(callback: (client: typeof tx) => Promise<T>) => callback(tx)
  };
  const service = new ProductsService(prisma as never);

  await service.update("product-1", {
    units: [{ name: "bunch", conversionFactor: "0.100000" }],
    aliases: [" Dill ", "Dill"]
  });

  assert.equal(operations.deleted, true);
  assert.equal(operations.created[0]?.name, "bunch");
  assert.equal((operations.created[0]?.conversionFactor as Prisma.Decimal).toString(), "0.1");
  assert.equal(operations.aliasesDeleted, true);
  assert.deepEqual(operations.aliasesCreated, [{ productId: "product-1", name: "Dill", normalizedName: "dill" }]);
});
