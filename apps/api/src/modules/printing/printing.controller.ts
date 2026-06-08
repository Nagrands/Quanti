import { Body, Controller, Header, Inject, Param, Post, Res, StreamableFile } from "@nestjs/common";

import { DocumentPrintService } from "./document-print.service";
import { DocumentPrintRequest } from "./dto/document-print.request";

interface HeaderResponse {
  setHeader(name: string, value: string): void;
}

@Controller("documents")
export class PrintingController {
  constructor(@Inject(DocumentPrintService) private readonly documentPrintService: DocumentPrintService) {}

  @Post(":id/print")
  @Header("Content-Type", "application/pdf")
  async printDocument(
    @Param("id") id: string,
    @Body() payload: DocumentPrintRequest,
    @Res({ passthrough: true }) response: HeaderResponse
  ) {
    const result = await this.documentPrintService.render(id, payload.templateVersion);

    response.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
    response.setHeader("X-Print-Template-Version", String(result.templateVersion));

    return new StreamableFile(result.content);
  }
}
