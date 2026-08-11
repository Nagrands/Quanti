import type { UpdateProductDto } from "@quanti/shared";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsOptional, IsString, Matches, ValidateNested } from "class-validator";
import { ProductUnitRequest } from "./create-product.request";

const pricePattern = /^\d+(\.\d{1,2})?$/;

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
  @IsString()
  @Matches(pricePattern)
  purchasePrice?: string | null;

  @IsOptional()
  @IsString()
  @Matches(pricePattern)
  salePrice?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductUnitRequest)
  units?: ProductUnitRequest[];

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
