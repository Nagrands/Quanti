import { Controller, Get, Inject, Logger, ServiceUnavailableException } from "@nestjs/common";
import { Prisma } from "@quanti/db";

import { PrismaService } from "./common/prisma/prisma.service";

const DOMAIN_MODULE_NAMES = [
  "products",
  "documents",
  "stock",
  "payments",
  "reports"
] as const;

export interface ApiHealthSnapshot {
  service: "quanti-api";
  status: "ok";
  database: "ok";
  modules: readonly string[];
}

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get("health")
  async getHealth(): Promise<ApiHealthSnapshot> {
    try {
      await this.prisma.$queryRaw(Prisma.sql`SELECT 1`);
    } catch (error) {
      this.logger.error("PostgreSQL health check failed.", error);
      throw new ServiceUnavailableException({
        code: "DATABASE_UNAVAILABLE",
        message: "PostgreSQL is unavailable."
      });
    }

    return {
      service: "quanti-api",
      status: "ok",
      database: "ok",
      modules: DOMAIN_MODULE_NAMES
    };
  }
}
