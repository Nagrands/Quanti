import type { StockBalanceQueryDto } from "@quanti/shared";
import { IsString } from "class-validator";

export class GetStockBalanceRequest implements StockBalanceQueryDto {
  @IsString()
  productId!: string;

  @IsString()
  warehouseId!: string;
}
