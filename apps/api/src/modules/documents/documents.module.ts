import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma/prisma.service";
import { StockModule } from "../stock/stock.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [StockModule],
  controllers: [DocumentsController],
  providers: [PrismaService, DocumentsService]
})
export class DocumentsModule {}
