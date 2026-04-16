import { documentTypes, type CreateDraftDocumentDto, type DocumentType } from "@quanti/shared";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

class CreateDocumentItemRequest {
  @IsString()
  productId!: string;

  @IsString()
  quantity!: string;

  @IsString()
  price!: string;

  @IsString()
  amount!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string | null;
}

export class CreateDocumentRequest implements CreateDraftDocumentDto {
  @IsString()
  number!: string;

  @IsIn(documentTypes)
  type!: DocumentType;

  @IsString()
  documentDate!: string;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  warehouseId?: string | null;

  @IsOptional()
  @IsString()
  sourceWarehouseId?: string | null;

  @IsOptional()
  @IsString()
  destinationWarehouseId?: string | null;

  @IsOptional()
  @IsString()
  counterpartyId?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentItemRequest)
  items!: CreateDocumentItemRequest[];
}
