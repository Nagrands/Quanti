import { counterpartyTypes, type CreateCounterpartyDto, type CounterpartyType } from "@quanti/shared";
import { IsIn, IsOptional, IsString } from "class-validator";

export class CreateCounterpartyRequest implements CreateCounterpartyDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsIn(counterpartyTypes)
  type!: CounterpartyType;

  @IsOptional()
  @IsString()
  taxId?: string | null;
}
