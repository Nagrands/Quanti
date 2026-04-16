import { accountTypes, type AccountType, type UpdateAccountDto } from "@quanti/shared";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

export class UpdateAccountRequest implements UpdateAccountDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(accountTypes)
  type?: AccountType;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
