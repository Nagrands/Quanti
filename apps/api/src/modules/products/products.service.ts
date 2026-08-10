import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@quanti/db";
import type { CreateProductDto, ProductDto, UpdateProductDto } from "@quanti/shared";

import { PrismaService } from "../../common/prisma/prisma.service";
import { toProductDto } from "./master-data.mappers";

@Injectable()
export class ProductsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      ...(includeInactive ? {} : { where: { isActive: true } }),
      include: { category: true, units: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "asc" }
    });

    return Promise.all(products.map((product) => this.toProductWithPrices(product)));
  }

  async findOne(id: string): Promise<ProductDto> {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isActive: true
      },
      include: { category: true, units: { orderBy: { createdAt: "asc" } } }
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} was not found.`);
    }

    return this.toProductWithPrices(product);
  }

  async create(payload: CreateProductDto): Promise<ProductDto> {
    const product = await this.prisma.product.create({
      data: {
        sku: payload.sku,
        name: payload.name,
        description: payload.description ?? null,
        unit: payload.unit,
        categoryId: payload.categoryId ?? null,
        units: {
          create: this.unitData(payload.unit, payload.units ?? [])
        }
      },
      include: { category: true, units: { orderBy: { createdAt: "asc" } } }
    });

    return this.toProductWithPrices(product);
  }

  async update(id: string, payload: UpdateProductDto): Promise<ProductDto> {
    const existing = await this.findOne(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...(payload.sku === undefined ? {} : { sku: payload.sku }),
          ...(payload.name === undefined ? {} : { name: payload.name }),
          ...(payload.description === undefined ? {} : { description: payload.description }),
          ...(payload.unit === undefined ? {} : { unit: payload.unit }),
          ...(payload.categoryId === undefined ? {} : { categoryId: payload.categoryId }),
          ...(payload.isActive === undefined ? {} : { isActive: payload.isActive })
        }
      });

      if (payload.units) {
        await tx.productUnit.deleteMany({ where: { productId: id } });
        const units = this.unitData(payload.unit ?? existing.unit, payload.units);
        if (units.length > 0) {
          await tx.productUnit.createMany({
            data: units.map((unit) => ({ ...unit, productId: id }))
          });
        }
      }
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async restore(id: string): Promise<ProductDto> {
    const product = await this.prisma.product.findFirst({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Product ${id} was not found.`);
    }

    const restoredProduct = await this.prisma.product.update({
      where: { id },
      data: { isActive: true },
      include: { category: true, units: { orderBy: { createdAt: "asc" } } }
    });
    return this.toProductWithPrices(restoredProduct);
  }

  private unitData(baseUnit: string, units: NonNullable<CreateProductDto["units"]>) {
    const baseName = baseUnit.trim().toLocaleLowerCase();
    const seen = new Set<string>();

    const mapped = units.map((unit) => ({
      name: unit.name.trim(),
      conversionFactor: new Prisma.Decimal(unit.conversionFactor)
    }));

    for (const unit of mapped) {
      const normalized = unit.name.toLocaleLowerCase();
      if (
        !unit.name
        || normalized === baseName
        || seen.has(normalized)
        || !unit.conversionFactor.isPositive()
      ) {
        throw new BadRequestException("Product units must be unique, positive, and different from the base unit.");
      }
      seen.add(normalized);
    }

    return mapped;
  }

  private async toProductWithPrices(
    product: Parameters<typeof toProductDto>[0]
  ): Promise<ProductDto> {
    const [sale, purchase] = await Promise.all([
      this.prisma.documentItem.findFirst({
        where: {
          productId: product.id,
          document: { type: { in: ["SALE", "RETURN_IN"] } }
        },
        orderBy: { updatedAt: "desc" },
        select: { price: true, unit: true }
      }),
      this.prisma.documentItem.findFirst({
        where: {
          productId: product.id,
          document: { type: { in: ["PURCHASE", "RETURN_OUT"] } }
        },
        orderBy: { updatedAt: "desc" },
        select: { price: true, unit: true }
      })
    ]);

    return toProductDto(product, {
      lastSalePrice: sale?.price.toString() ?? null,
      lastSaleUnit: sale?.unit ?? null,
      lastPurchasePrice: purchase?.price.toString() ?? null,
      lastPurchaseUnit: purchase?.unit ?? null
    });
  }
}
