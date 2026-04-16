import { paymentDirections, type CreatePaymentDto, type PaymentDirection } from "@quanti/shared";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

class PaymentAllocationRequest {
  @IsString()
  documentId!: string;

  @IsString()
  amount!: string;
}

export class CreatePaymentRequest implements CreatePaymentDto {
  @IsString()
  number!: string;

  @IsIn(paymentDirections)
  direction!: PaymentDirection;

  @IsString()
  paymentDate!: string;

  @IsString()
  amount!: string;

  @IsString()
  accountId!: string;

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
  @Type(() => PaymentAllocationRequest)
  allocations?: PaymentAllocationRequest[];
}
