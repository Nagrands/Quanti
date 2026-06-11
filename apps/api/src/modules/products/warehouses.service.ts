import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateWarehouseDto, UpdateWarehouseDto, WarehouseDto } from "@quanti/shared";

import { PrismaService } from "../../common/prisma/prisma.service";
import { toWarehouseDto } from "./master-data.mappers";

@Injectable()
export class WarehousesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(): Promise<WarehouseDto[]> {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" }
    });

    return warehouses.map(toWarehouseDto);
  }

  async findOne(id: string): Promise<WarehouseDto> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: {
        id,
        isActive: true
      }
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${id} was not found.`);
    }

    return toWarehouseDto(warehouse);
  }

  async create(payload: CreateWarehouseDto): Promise<WarehouseDto> {
    const warehouse = await this.prisma.warehouse.create({
      data: {
        code: payload.code,
        name: payload.name
      }
    });

    return toWarehouseDto(warehouse);
  }

  async update(id: string, payload: UpdateWarehouseDto): Promise<WarehouseDto> {
    await this.findOne(id);

    const warehouse = await this.prisma.warehouse.update({
      where: { id },
      data: payload
    });

    return toWarehouseDto(warehouse);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.warehouse.update({
      where: { id },
      data: { isActive: false }
    });
  }
}
