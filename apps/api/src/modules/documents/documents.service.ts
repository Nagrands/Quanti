import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Document, type DocumentItem } from "@quanti/db";
import type {
  CreateDocumentItemDto,
  CreateDraftDocumentDto,
  DocumentDto,
  RepostDocumentCommand,
  StockMovementDto,
  UpdateDraftDocumentPatchDto
} from "@quanti/shared";

import { PrismaService } from "../../common/prisma/prisma.service";
import { serializedTransaction } from "../../common/prisma/serialized-transaction";
import {
  FACTOR_SCALE,
  formatScaled,
  MONEY_SCALE,
  multiplyQuantity,
  QUANTITY_SCALE,
  sumScaled,
  toScaled
} from "../../common/fixed-point";
import { StockService } from "../stock/stock.service";
import { toDocumentDto } from "./document.mappers";

type DbClient = PrismaService | Prisma.TransactionClient;
type DocumentRecord = Document & { items: DocumentItem[] };

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StockService) private readonly stockService: StockService
  ) {}

  async findAll(): Promise<DocumentDto[]> {
    const documents = await this.prisma.document.findMany({
      include: { items: { orderBy: { lineNo: "asc" } } },
      orderBy: { documentDate: "asc" }
    });

    return documents.map(toDocumentDto);
  }

  async findOne(id: string, client: DbClient = this.prisma): Promise<DocumentDto> {
    const document = await this.getDocumentRecord(id, client);
    return toDocumentDto(document);
  }

  async createDraft(payload: CreateDraftDocumentDto): Promise<DocumentDto> {
    const document = await serializedTransaction(this.prisma, async (tx) => {
      const items = await this.resolveItems(payload.items, tx);
      return tx.document.create({
        data: {
          number: payload.number,
          type: payload.type,
          status: "DRAFT",
          documentDate: new Date(payload.documentDate),
          notes: payload.notes ?? null,
          totalAmount: this.sumAmounts(items),
          warehouseId: payload.warehouseId ?? null,
          sourceWarehouseId: payload.sourceWarehouseId ?? null,
          destinationWarehouseId: payload.destinationWarehouseId ?? null,
          counterpartyId: payload.counterpartyId ?? null,
          items: {
            create: items.map((item, index) => ({
              lineNo: index + 1,
              productId: item.productId,
              unit: item.unit,
              unitFactor: item.unitFactor,
              quantity: toScaled(item.quantity, QUANTITY_SCALE, "document quantity"),
              price: toScaled(item.price, MONEY_SCALE, "document price"),
              amount: toScaled(item.amount, MONEY_SCALE, "document amount"),
              warehouseId: item.warehouseId ?? null
            }))
          }
        },
        include: { items: { orderBy: { lineNo: "asc" } } }
      });
    });

    return toDocumentDto(document);
  }

  async updateDraft(id: string, payload: UpdateDraftDocumentPatchDto): Promise<DocumentDto> {
    return serializedTransaction(this.prisma, async (tx) => {
      const existing = await this.getDocumentRecord(id, tx);
      this.ensureDraft(existing);
      const items = payload.items ? await this.resolveItems(payload.items, tx) : undefined;

      const updatedDocument = await tx.document.update({
        where: { id },
        data: {
          number: payload.number ?? existing.number,
          type: payload.type ?? existing.type,
          documentDate: payload.documentDate
            ? new Date(payload.documentDate)
            : existing.documentDate,
          notes: payload.notes === undefined ? existing.notes : payload.notes,
          totalAmount: items
            ? this.sumAmounts(items)
            : existing.totalAmount,
          warehouseId: payload.warehouseId === undefined ? existing.warehouseId : payload.warehouseId,
          sourceWarehouseId: payload.sourceWarehouseId === undefined
            ? existing.sourceWarehouseId
            : payload.sourceWarehouseId,
          destinationWarehouseId: payload.destinationWarehouseId === undefined
            ? existing.destinationWarehouseId
            : payload.destinationWarehouseId,
          counterpartyId: payload.counterpartyId === undefined
            ? existing.counterpartyId
            : payload.counterpartyId
        },
        include: { items: { orderBy: { lineNo: "asc" } } }
      });

      if (items) {
        await tx.documentItem.deleteMany({ where: { documentId: id } });
        await tx.documentItem.createMany({
          data: items.map((item, index) => ({
            documentId: id,
            lineNo: index + 1,
            productId: item.productId,
            unit: item.unit,
            unitFactor: item.unitFactor,
            quantity: toScaled(item.quantity, QUANTITY_SCALE, "document quantity"),
            price: toScaled(item.price, MONEY_SCALE, "document price"),
            amount: toScaled(item.amount, MONEY_SCALE, "document amount"),
            warehouseId: item.warehouseId ?? null
          }))
        });
      }

      return toDocumentDto(await this.getDocumentRecord(updatedDocument.id, tx));
    });
  }

  async removeDraft(id: string): Promise<void> {
    await serializedTransaction(this.prisma, async (tx) => {
      const existing = await this.getDocumentRecord(id, tx);
      this.ensureDraft(existing);
      await tx.document.delete({ where: { id } });
    });
  }

  async post(id: string, postedAt?: string): Promise<DocumentDto> {
    return serializedTransaction(this.prisma, async (tx) => {
      const document = await this.getDocumentRecord(id, tx);
      this.ensureDraft(document);

      const movements = await this.buildMovements(document, tx, postedAt);

      if (movements.length > 0) {
        await tx.stockMovement.createMany({
          data: movements.map((movement) => ({
            movementDate: new Date(movement.movementDate),
            direction: movement.direction,
            quantity: toScaled(movement.quantity, QUANTITY_SCALE, "stock quantity"),
            productId: movement.productId,
            warehouseId: movement.warehouseId,
            documentId: movement.documentId,
            documentItemId: movement.documentItemId
          }))
        });
      }

      await tx.document.update({
        where: { id },
        data: {
          status: "POSTED",
          postedAt: postedAt ? new Date(postedAt) : new Date()
        }
      });

      return this.findOne(id, tx);
    });
  }

  async unpost(id: string): Promise<DocumentDto> {
    return serializedTransaction(this.prisma, async (tx) => {
      const document = await this.getDocumentRecord(id, tx);

      if (document.status !== "POSTED") {
        throw new BadRequestException(`Document ${id} is not posted.`);
      }

      await tx.stockMovement.deleteMany({ where: { documentId: id } });
      await tx.document.update({
        where: { id },
        data: {
          status: "DRAFT",
          postedAt: null
        }
      });

      return this.findOne(id, tx);
    });
  }

  async repost(command: RepostDocumentCommand): Promise<DocumentDto> {
    return serializedTransaction(this.prisma, async (tx) => {
      const document = await this.getDocumentRecord(command.id, tx);

      if (document.status === "POSTED") {
        await tx.stockMovement.deleteMany({ where: { documentId: command.id } });
        await tx.document.update({
          where: { id: command.id },
          data: {
            status: "DRAFT",
            postedAt: null
          }
        });
      }

      const refreshed = await this.getDocumentRecord(command.id, tx);
      this.ensureDraft(refreshed);

      const movements = await this.buildMovements(refreshed, tx, command.postedAt);
      if (movements.length > 0) {
        await tx.stockMovement.createMany({
          data: movements.map((movement) => ({
            movementDate: new Date(movement.movementDate),
            direction: movement.direction,
            quantity: toScaled(movement.quantity, QUANTITY_SCALE, "stock quantity"),
            productId: movement.productId,
            warehouseId: movement.warehouseId,
            documentId: movement.documentId,
            documentItemId: movement.documentItemId
          }))
        });
      }

      await tx.document.update({
        where: { id: command.id },
        data: {
          status: "POSTED",
          postedAt: command.postedAt ? new Date(command.postedAt) : new Date()
        }
      });

      return this.findOne(command.id, tx);
    });
  }

  private async buildMovements(
    document: DocumentRecord,
    tx: Prisma.TransactionClient,
    postedAt?: string
  ): Promise<StockMovementDto[]> {
    const movementDate = postedAt ?? document.documentDate.toISOString();
    const movements: StockMovementDto[] = [];

    for (const item of document.items) {
      const itemWarehouseId = item.warehouseId ?? document.warehouseId;

      switch (document.type) {
        case "PURCHASE":
        case "RETURN_IN": {
          const warehouseId = itemWarehouseId ?? document.destinationWarehouseId;
          if (!warehouseId) {
            throw new BadRequestException(`Document ${document.id} requires a target warehouse.`);
          }

          movements.push(this.createMovement(item, document.id, warehouseId, movementDate, "IN"));
          break;
        }
        case "SALE":
        case "RETURN_OUT": {
          const warehouseId = itemWarehouseId ?? document.sourceWarehouseId ?? document.warehouseId;
          if (!warehouseId) {
            throw new BadRequestException(`Document ${document.id} requires a source warehouse.`);
          }

          await this.stockService.assertAvailableStock({
            productId: item.productId,
            warehouseId,
            requiredQuantity: formatScaled(this.baseQuantity(item), QUANTITY_SCALE)
          }, tx);

          movements.push(this.createMovement(item, document.id, warehouseId, movementDate, "OUT"));
          break;
        }
        case "TRANSFER": {
          const sourceWarehouseId = document.sourceWarehouseId ?? itemWarehouseId;
          const destinationWarehouseId = document.destinationWarehouseId;

          if (!sourceWarehouseId || !destinationWarehouseId) {
            throw new BadRequestException(
              `Transfer document ${document.id} requires both source and destination warehouses.`
            );
          }

          await this.stockService.assertAvailableStock({
            productId: item.productId,
            warehouseId: sourceWarehouseId,
            requiredQuantity: formatScaled(this.baseQuantity(item), QUANTITY_SCALE)
          }, tx);

          movements.push(
            this.createMovement(item, document.id, sourceWarehouseId, movementDate, "OUT"),
            this.createMovement(item, document.id, destinationWarehouseId, movementDate, "IN")
          );
          break;
        }
        case "STOCK_ADJUSTMENT":
          throw new BadRequestException(
            `Document type ${document.type} requires explicit adjustment direction and is not supported yet.`
          );
      }
    }

    return movements;
  }

  private createMovement(
    item: DocumentItem,
    documentId: string,
    warehouseId: string,
    movementDate: string,
    direction: "IN" | "OUT"
  ): StockMovementDto {
    return {
      productId: item.productId,
      warehouseId,
      documentId,
      documentItemId: item.id,
      movementDate,
      direction,
      quantity: formatScaled(this.baseQuantity(item), QUANTITY_SCALE)
    };
  }

  private async getDocumentRecord(id: string, client: DbClient): Promise<DocumentRecord> {
    const document = await client.document.findUnique({
      where: { id },
      include: {
        items: { orderBy: { lineNo: "asc" } }
      }
    });

    if (!document) {
      throw new NotFoundException(`Document ${id} was not found.`);
    }

    return document;
  }

  private ensureDraft(document: DocumentRecord) {
    if (document.status !== "DRAFT") {
      throw new BadRequestException(`Document ${document.id} is not editable in ${document.status} status.`);
    }
  }

  private sumAmounts(items: Array<{ amount: string }>) {
    return sumScaled(items.map((item) => toScaled(item.amount, MONEY_SCALE, "document amount")));
  }

  private baseQuantity(item: DocumentItem) {
    return multiplyQuantity(item.quantity, item.unitFactor);
  }

  private async resolveItems(
    items: CreateDocumentItemDto[],
    tx: Prisma.TransactionClient
  ) {
    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { units: true }
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    return items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} is unavailable.`);
      }

      const requestedUnit = item.unit?.trim() || product.unit;
      const alternative = product.units.find((unit) => unit.name === requestedUnit);
      if (requestedUnit !== product.unit && !alternative) {
        throw new BadRequestException(
          `Unit ${requestedUnit} is not configured for product ${product.id}.`
        );
      }

      return {
        ...item,
        unit: requestedUnit,
        unitFactor: alternative?.conversionFactor ?? FACTOR_SCALE
      };
    });
  }
}
