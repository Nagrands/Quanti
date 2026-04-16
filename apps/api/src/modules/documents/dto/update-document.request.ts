import { documentTypes, type DocumentType, type UpdateDraftDocumentPatchDto } from "@quanti/shared";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

class UpdateDocumentItemRequest {
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

export class UpdateDocumentRequest implements UpdateDraftDocumentPatchDto {
  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsIn(documentTypes)
  type?: DocumentType;

  @IsOptional()
  @IsString()
  documentDate?: string;

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

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateDocumentItemRequest)
  items?: UpdateDocumentItemRequest[];
}
