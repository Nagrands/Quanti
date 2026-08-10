import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma/prisma.service";
import { TransferController } from "./transfer.controller";
import { TransferService } from "./transfer.service";

@Module({
  controllers: [TransferController],
  providers: [PrismaService, TransferService]
})
export class TransferModule {}
