import type { UpdateProductDto } from "@quanti/shared";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateProductRequest implements UpdateProductDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
