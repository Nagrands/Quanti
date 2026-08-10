import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@quanti/db";
import type { PrintTemplateScope } from "@quanti/shared";

import { PrismaService } from "../../common/prisma/prisma.service";
import { defaultDocumentTemplates } from "./default-document-template";

export interface PrintTemplateRecord {
  id: string;
  scope: PrintTemplateScope;
  name: string;
  version: number;
  html: string;
  styles: string | null;
}

@Injectable()
export class PrintTemplateRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async find(scope: PrintTemplateScope, version?: number): Promise<PrintTemplateRecord> {
    if (scope === "DOCUMENT") {
      await this.ensureDefaultDocumentTemplate();
    }

    const template = await this.query(scope, version);

    if (!template) {
      throw new NotFoundException(`No active ${scope.toLowerCase()} print template was found.`);
    }

    return template;
  }

  private async query(scope: PrintTemplateScope, version?: number) {
    const rows = await this.prisma.$queryRaw<PrintTemplateRecord[]>(version === undefined
      ? Prisma.sql`
          SELECT "id", "scope", "name", "version", "html", "styles"
          FROM "PrintTemplate"
          WHERE "scope" = ${scope}::"PrintTemplateScope" AND "isActive" = true
          ORDER BY "version" DESC
          LIMIT 1
        `
      : Prisma.sql`
          SELECT "id", "scope", "name", "version", "html", "styles"
          FROM "PrintTemplate"
          WHERE "scope" = ${scope}::"PrintTemplateScope" AND "version" = ${version} AND "isActive" = true
          LIMIT 1
        `);

    return rows[0];
  }

  private async ensureDefaultDocumentTemplate() {
    for (const template of defaultDocumentTemplates) {
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO "PrintTemplate" (
          "id", "scope", "name", "version", "isActive", "html", "styles", "createdAt", "updatedAt"
        )
        VALUES (
          ${template.id},
          ${template.scope}::"PrintTemplateScope",
          ${template.name},
          ${template.version},
          true,
          ${template.html},
          ${template.styles},
          NOW(),
          NOW()
        )
        ON CONFLICT ("scope", "version") DO NOTHING
      `);
    }
  }
}
