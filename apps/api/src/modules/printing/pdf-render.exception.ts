import { HttpStatus, ServiceUnavailableException } from "@nestjs/common";

export class PdfRenderException extends ServiceUnavailableException {
  constructor(message: string) {
    super({
      code: "PDF_RENDER_ERROR",
      message,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE
    });
  }
}
