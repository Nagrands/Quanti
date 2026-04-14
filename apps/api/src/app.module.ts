import { Module } from "@nestjs/common";

import { AppController } from "./app.controller";
import { DocumentsModule } from "./modules/documents/documents.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ProductsModule } from "./modules/products/products.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { StockModule } from "./modules/stock/stock.module";

export const domainModules = [
  ProductsModule,
  DocumentsModule,
  StockModule,
  PaymentsModule,
  ReportsModule
] as const;

@Module({
  imports: [...domainModules],
  controllers: [AppController]
})
export class AppModule {}
