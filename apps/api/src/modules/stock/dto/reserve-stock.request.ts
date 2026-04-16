import type { ReserveStockRequestDto } from "@quanti/shared";
import { IsString } from "class-validator";

export class ReserveStockRequest implements ReserveStockRequestDto {
  @IsString()
  productId!: string;

  @IsString()
  warehouseId!: string;

  @IsString()
  requiredQuantity!: string;
}
