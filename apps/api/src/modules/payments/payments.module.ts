import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma/prisma.service";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  controllers: [PaymentsController],
  providers: [PrismaService, PaymentsService]
})
export class PaymentsModule {}
