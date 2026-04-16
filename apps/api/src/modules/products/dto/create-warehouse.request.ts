import type { CreateWarehouseDto } from "@quanti/shared";
import { IsString } from "class-validator";

export class CreateWarehouseRequest implements CreateWarehouseDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;
}
