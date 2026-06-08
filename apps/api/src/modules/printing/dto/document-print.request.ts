import type { DocumentPrintRequestDto } from "@quanti/shared";
import { IsInt, IsOptional, Min } from "class-validator";

export class DocumentPrintRequest implements DocumentPrintRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  templateVersion?: number;
}
