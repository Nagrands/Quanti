import type { UpdateProductCategoryDto } from "@quanti/shared";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateProductCategoryRequest implements UpdateProductCategoryDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
