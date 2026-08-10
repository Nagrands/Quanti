import type { ApplyImportRequest, QuantiTransferPackage } from "@quanti/shared";
import { IsObject } from "class-validator";

export class PreviewTransferRequest {
  @IsObject()
  package!: QuantiTransferPackage;
}

export class ApplyTransferRequest implements ApplyImportRequest {
  @IsObject()
  package!: ApplyImportRequest["package"];

  @IsObject()
  resolutions!: ApplyImportRequest["resolutions"];
}
