import { Injectable, NotFoundException } from "@nestjs/common";
import type { CounterpartyDto, CreateCounterpartyDto, UpdateCounterpartyDto } from "@quanti/shared";

import { PrismaService } from "../../common/prisma/prisma.service";
import { toCounterpartyDto } from "./master-data.mappers";

@Injectable()
export class CounterpartiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CounterpartyDto[]> {
    const counterparties = await this.prisma.counterparty.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" }
    });

    return counterparties.map(toCounterpartyDto);
  }

  async findOne(id: string): Promise<CounterpartyDto> {
    const counterparty = await this.prisma.counterparty.findFirst({
      where: {
        id,
        isActive: true
      }
    });

    if (!counterparty) {
      throw new NotFoundException(`Counterparty ${id} was not found.`);
    }

    return toCounterpartyDto(counterparty);
  }

  async create(payload: CreateCounterpartyDto): Promise<CounterpartyDto> {
    const counterparty = await this.prisma.counterparty.create({
      data: {
        code: payload.code,
        name: payload.name,
        type: payload.type,
        taxId: payload.taxId ?? null
      }
    });

    return toCounterpartyDto(counterparty);
  }

  async update(id: string, payload: UpdateCounterpartyDto): Promise<CounterpartyDto> {
    await this.findOne(id);

    const counterparty = await this.prisma.counterparty.update({
      where: { id },
      data: {
        ...payload,
        taxId: payload.taxId === undefined ? undefined : payload.taxId
      }
    });

    return toCounterpartyDto(counterparty);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.counterparty.update({
      where: { id },
      data: { isActive: false }
    });
  }
}
