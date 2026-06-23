import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma/prisma.service";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";
import { CounterpartiesController } from "./counterparties.controller";
import { CounterpartiesService } from "./counterparties.service";
import { ProductCategoriesController } from "./product-categories.controller";
import { ProductCategoriesService } from "./product-categories.service";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { WarehousesController } from "./warehouses.controller";
import { WarehousesService } from "./warehouses.service";

@Module({
  controllers: [
    ProductCategoriesController,
    ProductsController,
    WarehousesController,
    CounterpartiesController,
    AccountsController
  ],
  providers: [
    PrismaService,
    ProductCategoriesService,
    ProductsService,
    WarehousesService,
    CounterpartiesService,
    AccountsService
  ],
  exports: [
    ProductCategoriesService,
    ProductsService,
    WarehousesService,
    CounterpartiesService,
    AccountsService
  ]
})
export class ProductsModule {}
