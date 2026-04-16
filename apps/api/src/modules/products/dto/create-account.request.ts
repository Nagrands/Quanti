import { accountTypes, type AccountType, type CreateAccountDto } from "@quanti/shared";
import { IsIn, IsOptional, IsString } from "class-validator";

export class CreateAccountRequest implements CreateAccountDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsIn(accountTypes)
  type!: AccountType;

  @IsOptional()
  @IsString()
  currencyCode?: string;
}
