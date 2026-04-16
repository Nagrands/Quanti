import { counterpartyTypes, type CounterpartyType, type UpdateCounterpartyDto } from "@quanti/shared";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

export class UpdateCounterpartyRequest implements UpdateCounterpartyDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(counterpartyTypes)
  type?: CounterpartyType;

  @IsOptional()
  @IsString()
  taxId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
