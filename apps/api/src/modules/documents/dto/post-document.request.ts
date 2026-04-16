import type { PostDocumentCommand } from "@quanti/shared";
import { IsOptional, IsString } from "class-validator";

export class PostDocumentRequest implements Omit<PostDocumentCommand, "id"> {
  @IsOptional()
  @IsString()
  postedAt?: string;
}
