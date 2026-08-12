import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@quanti/db";
import type { CreateProductDto, ProductDto, UpdateProductDto } from "@quanti/shared";

import { PrismaService } from "../../common/prisma/prisma.service";
import { FACTOR_SCALE, MONEY_SCALE, toScaled } from "../../common/fixed-point";
import { toProductDto } from "./master-data.mappers";

@Injectable()
export class ProductsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      ...(includeInactive ? {} : { where: { isActive: true } }),
      include: { category: true, aliases: { orderBy: { createdAt: "asc" } }, units: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "asc" }
    });

    return products.map(toProductDto);
  }

  async findOne(id: string): Promise<ProductDto> {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isActive: true
      },
      include: { category: true, aliases: { orderBy: { createdAt: "asc" } }, units: { orderBy: { createdAt: "asc" } } }
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} was not found.`);
    }

    return toProductDto(product);
  }

  async create(payload: CreateProductDto): Promise<ProductDto> {
    const product = await this.prisma.product.create({
      data: {
        sku: payload.sku,
        name: payload.name,
        description: payload.description ?? null,
        unit: payload.unit,
        purchasePrice: this.optionalPrice(payload.purchasePrice),
        salePrice: this.optionalPrice(payload.salePrice),
        categoryId: payload.categoryId ?? null,
        aliases: {
          create: this.aliasData(payload.aliases ?? [])
        },
        units: {
          create: this.unitData(payload.unit, payload.units ?? [])
        }
      },
      include: { category: true, aliases: { orderBy: { createdAt: "asc" } }, units: { orderBy: { createdAt: "asc" } } }
    });

    return toProductDto(product);
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
          ...(payload.purchasePrice === undefined ? {} : { purchasePrice: this.optionalPrice(payload.purchasePrice) }),
          ...(payload.salePrice === undefined ? {} : { salePrice: this.optionalPrice(payload.salePrice) }),
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


      if (payload.aliases) {
        await tx.productAlias.deleteMany({ where: { productId: id } });
        const aliases = this.aliasData(payload.aliases);
        if (aliases.length > 0) {
          await tx.productAlias.createMany({
            data: aliases.map((alias) => ({ ...alias, productId: id }))
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
      include: { category: true, aliases: { orderBy: { createdAt: "asc" } }, units: { orderBy: { createdAt: "asc" } } }
    });
    return toProductDto(restoredProduct);
  }

  private unitData(baseUnit: string, units: NonNullable<CreateProductDto["units"]>) {
    const baseName = baseUnit.trim().toLocaleLowerCase();
    const seen = new Set<string>();

    const mapped = units.map((unit) => ({
      name: unit.name.trim(),
      conversionFactor: toScaled(unit.conversionFactor, FACTOR_SCALE, "unit conversion factor")
    }));

    for (const unit of mapped) {
      const normalized = unit.name.toLocaleLowerCase();
      if (
        !unit.name
        || normalized === baseName
        || seen.has(normalized)
        || unit.conversionFactor <= 0n
      ) {
        throw new BadRequestException("Product units must be unique, positive, and different from the base unit.");
      }
      seen.add(normalized);
    }

    return mapped;
  }

  private aliasData(aliases: string[]) {
    const seen = new Set<string>();
    return aliases.map((name) => ({
      name: name.trim(),
      normalizedName: this.normalizeAlias(name)
    })).filter((alias) => {
      if (!alias.name || seen.has(alias.normalizedName)) return false;
      seen.add(alias.normalizedName);
      return true;
    });
  }

  private normalizeAlias(value: string) {
    return value.trim().toLocaleLowerCase("ru-RU")
      .replace(/ё/g, "е")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  private optionalPrice(value: string | null | undefined) {
    return value == null ? null : toScaled(value, MONEY_SCALE, "product reference price");
  }
}
