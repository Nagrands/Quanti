import type { CreateProductCategoryDto } from "@quanti/shared";
import { IsOptional, IsString } from "class-validator";

export class CreateProductCategoryRequest implements CreateProductCategoryDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}
