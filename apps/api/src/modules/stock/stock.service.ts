import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@quanti/db";
import type {
  ReserveStockRequestDto,
  ReserveStockResultDto,
  StockBalanceResultDto
} from "@quanti/shared";

import { PrismaService } from "../../common/prisma/prisma.service";

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(
    productId: string,
    warehouseId: string,
    client: DbClient = this.prisma
  ): Promise<StockBalanceResultDto> {
    const movements = await client.stockMovement.findMany({
      where: {
        productId,
        warehouseId
      },
      select: {
        direction: true,
        quantity: true
      },
      orderBy: { movementDate: "asc" }
    });

    const quantity = movements.reduce((sum, movement) => {
      const value = this.toNumber(movement.quantity);
      return movement.direction === "IN" ? sum + value : sum - value;
    }, 0);

    return {
      productId,
      warehouseId,
      quantity: this.formatQuantity(quantity)
    };
  }

  async reserveStock(payload: ReserveStockRequestDto): Promise<ReserveStockResultDto> {
    const requiredQuantity = this.toNumber(payload.requiredQuantity);

    if (requiredQuantity <= 0) {
      throw new BadRequestException("Required quantity must be greater than zero.");
    }

    return this.prisma.$transaction(async (tx) => {
      await this.lockScope(tx, payload.productId, payload.warehouseId);

      const balance = await this.getBalance(payload.productId, payload.warehouseId, tx);
      const availableQuantity = this.toNumber(balance.quantity);

      if (availableQuantity < requiredQuantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${payload.productId} in warehouse ${payload.warehouseId}.`
        );
      }

      return {
        ...balance,
        availableQuantity: balance.quantity,
        requiredQuantity: this.formatQuantity(requiredQuantity),
        allowed: true
      };
    });
  }

  private async lockScope(tx: Prisma.TransactionClient, productId: string, warehouseId: string) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE`);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Warehouse" WHERE id = ${warehouseId} FOR UPDATE`);
  }

  private toNumber(value: { toString(): string } | number | string) {
    return Number(value.toString());
  }

  private formatQuantity(value: number) {
    return value.toFixed(3);
  }
}
