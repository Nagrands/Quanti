import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma/prisma.service";
import { StockController } from "./stock.controller";
import { StockService } from "./stock.service";

@Module({
  controllers: [StockController],
  providers: [PrismaService, StockService],
  exports: [StockService]
})
export class StockModule {}
