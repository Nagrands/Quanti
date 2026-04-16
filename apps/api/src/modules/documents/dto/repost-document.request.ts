import type { RepostDocumentCommand } from "@quanti/shared";
import { IsOptional, IsString } from "class-validator";

export class RepostDocumentRequest implements Omit<RepostDocumentCommand, "id"> {
  @IsOptional()
  @IsString()
  postedAt?: string;
}
