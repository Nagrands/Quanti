import type {
  CashflowReportFilterDto,
  CounterpartyDebtReportFilterDto,
  SalesReportFilterDto,
  StockBalanceReportFilterDto,
  StockTurnoverReportFilterDto,
  TopProductsReportFilterDto
} from "@quanti/shared";
import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString, Min } from "class-validator";

export class StockBalanceReportRequest implements StockBalanceReportFilterDto {
  @IsDateString()
  at!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  productId?: string;
}

export class StockTurnoverReportRequest implements StockTurnoverReportFilterDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  productId?: string;
}

export class CashflowReportRequest implements CashflowReportFilterDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  counterpartyId?: string;
}

export class SalesReportRequest implements SalesReportFilterDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  counterpartyId?: string;

  @IsOptional()
  @IsString()
  productId?: string;
}

export class TopProductsReportRequest implements TopProductsReportFilterDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class CounterpartyDebtReportRequest implements CounterpartyDebtReportFilterDto {
  @IsOptional()
  @IsDateString()
  at?: string;

  @IsOptional()
  @IsString()
  counterpartyId?: string;
}
