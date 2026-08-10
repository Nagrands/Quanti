import type { CreateProductDto } from "@quanti/shared";
import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString, Matches, ValidateNested } from "class-validator";

export class ProductUnitRequest {
  @IsString()
  name!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,6})?$/)
  conversionFactor!: string;
}

export class CreateProductRequest implements CreateProductDto {
  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductUnitRequest)
  units?: ProductUnitRequest[];

  @IsOptional()
  @IsString()
  categoryId?: string | null;
}
