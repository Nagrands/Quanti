import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma/prisma.service";
import { DocumentPrintService } from "./document-print.service";
import { PDF_RENDERER, PuppeteerPdfRenderer } from "./pdf-renderer";
import { PrintTemplateRepository } from "./print-template.repository";
import { PrintingController } from "./printing.controller";

@Module({
  controllers: [PrintingController],
  providers: [
    PrismaService,
    PrintTemplateRepository,
    DocumentPrintService,
    { provide: PDF_RENDERER, useClass: PuppeteerPdfRenderer }
  ]
})
export class PrintingModule {}
