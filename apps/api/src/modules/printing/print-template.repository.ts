import { Inject, Injectable, NotFoundException } from "@nestjs/common";
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
    return this.prisma.printTemplate.findFirst({
      where: { scope, isActive: true, ...(version === undefined ? {} : { version }) },
      orderBy: { version: "desc" },
      select: { id: true, scope: true, name: true, version: true, html: true, styles: true }
    });
  }

  private async ensureDefaultDocumentTemplate() {
    for (const template of defaultDocumentTemplates) {
      await this.prisma.printTemplate.upsert({
        where: { scope_version: { scope: template.scope, version: template.version } },
        create: { ...template, isActive: true },
        update: {}
      });
    }
  }
}
