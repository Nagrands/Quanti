import type { UpdateWarehouseDto } from "@quanti/shared";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateWarehouseRequest implements UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
