import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateProductDto, ProductDto, UpdateProductDto } from "@quanti/shared";

import { PrismaService } from "../../common/prisma/prisma.service";
import { toProductDto } from "./master-data.mappers";

@Injectable()
export class ProductsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" }
    });

    return products.map(toProductDto);
  }

  async findOne(id: string): Promise<ProductDto> {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isActive: true
      }
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
        unit: payload.unit
      }
    });

    return toProductDto(product);
  }

  async update(id: string, payload: UpdateProductDto): Promise<ProductDto> {
    await this.findOne(id);

    const product = await this.prisma.product.update({
      where: { id },
      data: payload
    });

    return toProductDto(product);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
  }
}
