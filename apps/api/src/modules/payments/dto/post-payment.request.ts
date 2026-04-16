import { IsOptional, IsString } from "class-validator";

export class PostPaymentRequest {
  @IsOptional()
  @IsString()
  postedAt?: string;
}
