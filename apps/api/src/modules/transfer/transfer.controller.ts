import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import { ApplyTransferRequest, PreviewTransferRequest } from "./dto/import-transfer.request";
import { TransferService } from "./transfer.service";

@Controller("transfer")
export class TransferController {
  constructor(@Inject(TransferService) private readonly transferService: TransferService) {}

  @Get(":section/export")
  export(@Param("section") section: string) {
    return this.transferService.export(section);
  }

  @Post("import/preview")
  preview(@Body() request: PreviewTransferRequest) {
    return this.transferService.preview(request.package);
  }

  @Post("import/apply")
  apply(@Body() request: ApplyTransferRequest) {
    return this.transferService.apply(request.package, request.resolutions);
  }
}
