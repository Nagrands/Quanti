import { paymentDirections, type PaymentDirection, type UpdateDraftPaymentPatchDto } from "@quanti/shared";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

class UpdatePaymentAllocationRequest {
  @IsString()
  documentId!: string;

  @IsString()
  amount!: string;
}

export class UpdatePaymentRequest implements UpdateDraftPaymentPatchDto {
  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsIn(paymentDirections)
  direction?: PaymentDirection;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  amount?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  counterpartyId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => UpdatePaymentAllocationRequest)
  allocations?: UpdatePaymentAllocationRequest[];
}
