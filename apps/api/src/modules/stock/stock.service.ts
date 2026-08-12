import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@quanti/db";
import type {
  ReserveStockRequestDto,
  ReserveStockResultDto,
  StockBalanceResultDto
} from "@quanti/shared";

import { PrismaService } from "../../common/prisma/prisma.service";
import { serializedTransaction } from "../../common/prisma/serialized-transaction";
import { formatScaledFixed, QUANTITY_SCALE, toScaled } from "../../common/fixed-point";

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class StockService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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

    const quantity = movements.reduce(
      (sum, movement) => movement.direction === "IN" ? sum + movement.quantity : sum - movement.quantity,
      0n
    );

    return {
      productId,
      warehouseId,
      quantity: formatScaledFixed(quantity, QUANTITY_SCALE)
    };
  }

  async reserveStock(payload: ReserveStockRequestDto): Promise<ReserveStockResultDto> {
    const requiredQuantity = toScaled(payload.requiredQuantity, QUANTITY_SCALE, "required quantity");

    if (requiredQuantity <= 0n) {
      throw new BadRequestException("Required quantity must be greater than zero.");
    }

    return serializedTransaction(this.prisma, async (tx) => {
      const balance = await this.assertAvailableStock(payload, tx);

      return {
        ...balance,
        availableQuantity: balance.quantity,
        requiredQuantity: formatScaledFixed(requiredQuantity, QUANTITY_SCALE),
        allowed: true
      };
    });
  }

  async assertAvailableStock(
    payload: ReserveStockRequestDto,
    client: DbClient = this.prisma
  ): Promise<StockBalanceResultDto> {
    const requiredQuantity = toScaled(payload.requiredQuantity, QUANTITY_SCALE, "required quantity");

    if (requiredQuantity <= 0n) {
      throw new BadRequestException("Required quantity must be greater than zero.");
    }

    const balance = await this.getBalance(payload.productId, payload.warehouseId, client);
    const availableQuantity = toScaled(balance.quantity, QUANTITY_SCALE, "available quantity");

    if (availableQuantity < requiredQuantity) {
      throw new BadRequestException({
        code: "INSUFFICIENT_STOCK",
        message: "Insufficient stock.",
        details: {
          productId: payload.productId,
          warehouseId: payload.warehouseId,
          availableQuantity: formatScaledFixed(availableQuantity, QUANTITY_SCALE),
          requiredQuantity: formatScaledFixed(requiredQuantity, QUANTITY_SCALE)
        }
      });
    }

    return balance;
  }

}
