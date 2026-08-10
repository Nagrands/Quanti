import { Module } from "@nestjs/common";

import { AppController } from "./app.controller";
import { PrismaService } from "./common/prisma/prisma.service";
import { DocumentsModule } from "./modules/documents/documents.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { PrintingModule } from "./modules/printing/printing.module";
import { ProductsModule } from "./modules/products/products.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { StockModule } from "./modules/stock/stock.module";
import { TransferModule } from "./modules/transfer/transfer.module";

export const domainModules = [
  ProductsModule,
  DocumentsModule,
  StockModule,
  PaymentsModule,
  PrintingModule,
  ReportsModule,
  TransferModule
] as const;

@Module({
  imports: [...domainModules],
  controllers: [AppController],
  providers: [PrismaService]
})
export class AppModule {}
