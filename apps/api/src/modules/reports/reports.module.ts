import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma/prisma.service";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  controllers: [ReportsController],
  providers: [PrismaService, ReportsService]
})
export class ReportsModule {}
