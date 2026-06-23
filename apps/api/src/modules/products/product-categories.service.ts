import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateProductCategoryDto, ProductCategoryDto, UpdateProductCategoryDto } from "@quanti/shared";

import { PrismaService } from "../../common/prisma/prisma.service";
import { toProductCategoryDto } from "./master-data.mappers";

@Injectable()
export class ProductCategoriesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false): Promise<ProductCategoryDto[]> {
    const categories = await this.prisma.productCategory.findMany({
      ...(includeInactive ? {} : { where: { isActive: true } }),
      orderBy: { createdAt: "asc" }
    });

    return categories.map(toProductCategoryDto);
  }

  async findOne(id: string): Promise<ProductCategoryDto> {
    const category = await this.prisma.productCategory.findFirst({
      where: { id, isActive: true }
    });

    if (!category) {
      throw new NotFoundException(`Product category ${id} was not found.`);
    }

    return toProductCategoryDto(category);
  }

  async create(payload: CreateProductCategoryDto): Promise<ProductCategoryDto> {
    const category = await this.prisma.productCategory.create({
      data: {
        code: payload.code,
        name: payload.name,
        description: payload.description ?? null
      }
    });

    return toProductCategoryDto(category);
  }

  async update(id: string, payload: UpdateProductCategoryDto): Promise<ProductCategoryDto> {
    await this.findOne(id);

    return toProductCategoryDto(await this.prisma.productCategory.update({
      where: { id },
      data: {
        ...payload,
        description: payload.description === undefined ? undefined : payload.description
      }
    }));
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.productCategory.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async restore(id: string): Promise<ProductCategoryDto> {
    const category = await this.prisma.productCategory.findFirst({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Product category ${id} was not found.`);
    }

    return toProductCategoryDto(await this.prisma.productCategory.update({
      where: { id },
      data: { isActive: true }
    }));
  }
}
