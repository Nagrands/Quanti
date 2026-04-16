import type { CreateProductDto } from "@quanti/shared";
import { IsOptional, IsString } from "class-validator";

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
}
