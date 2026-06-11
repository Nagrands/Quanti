import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AccountDto, CreateAccountDto, UpdateAccountDto } from "@quanti/shared";

import { PrismaService } from "../../common/prisma/prisma.service";
import { toAccountDto } from "./master-data.mappers";

@Injectable()
export class AccountsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(): Promise<AccountDto[]> {
    const accounts = await this.prisma.account.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" }
    });

    return accounts.map(toAccountDto);
  }

  async findOne(id: string): Promise<AccountDto> {
    const account = await this.prisma.account.findFirst({
      where: {
        id,
        isActive: true
      }
    });

    if (!account) {
      throw new NotFoundException(`Account ${id} was not found.`);
    }

    return toAccountDto(account);
  }

  async create(payload: CreateAccountDto): Promise<AccountDto> {
    const account = await this.prisma.account.create({
      data: {
        code: payload.code,
        name: payload.name,
        type: payload.type,
        currencyCode: payload.currencyCode ?? "RUB"
      }
    });

    return toAccountDto(account);
  }

  async update(id: string, payload: UpdateAccountDto): Promise<AccountDto> {
    await this.findOne(id);

    const account = await this.prisma.account.update({
      where: { id },
      data: payload
    });

    return toAccountDto(account);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.account.update({
      where: { id },
      data: { isActive: false }
    });
  }
}
