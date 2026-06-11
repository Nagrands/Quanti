import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Payment, type PaymentAllocation } from "@quanti/db";
import type {
  CounterpartyDebtDto,
  CreatePaymentDto,
  PaymentAllocationDto,
  PaymentDto,
  RepostPaymentCommand,
  UpdateDraftPaymentPatchDto
} from "@quanti/shared";

import { PrismaService } from "../../common/prisma/prisma.service";
import { toCounterpartyDebtDto, toPaymentDto } from "./payment.mappers";

type DbClient = PrismaService | Prisma.TransactionClient;
type PaymentRecord = Payment & { allocations: PaymentAllocation[] };
type DebtRow = {
  counterpartyId: string;
  documentTotal: Prisma.Decimal | string | number;
  paidTotal: Prisma.Decimal | string | number;
  debtTotal: Prisma.Decimal | string | number;
};

@Injectable()
export class PaymentsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(): Promise<PaymentDto[]> {
    const payments = await this.prisma.payment.findMany({
      include: { allocations: true },
      orderBy: { paymentDate: "asc" }
    });

    return payments.map(toPaymentDto);
  }

  async findOne(id: string, client: DbClient = this.prisma): Promise<PaymentDto> {
    const payment = await this.getPaymentRecord(id, client);
    return toPaymentDto(payment);
  }

  async createDraft(payload: CreatePaymentDto): Promise<PaymentDto> {
    this.validateAllocationTotal(payload.allocations ?? [], payload.amount);

    const payment = await this.prisma.$transaction(async (tx) => {
      return tx.payment.create({
        data: {
          number: payload.number,
          direction: payload.direction,
          status: "DRAFT",
          paymentDate: new Date(payload.paymentDate),
          amount: this.decimal(payload.amount),
          notes: payload.notes ?? null,
          accountId: payload.accountId,
          counterpartyId: payload.counterpartyId ?? null,
          allocations: {
            create: (payload.allocations ?? []).map((allocation) => ({
              documentId: allocation.documentId,
              amount: this.decimal(allocation.amount)
            }))
          }
        },
        include: { allocations: true }
      });
    });

    return toPaymentDto(payment);
  }

  async updateDraft(id: string, payload: UpdateDraftPaymentPatchDto): Promise<PaymentDto> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.getPaymentRecord(id, tx);
      this.ensureDraft(existing);

      const nextAmount = payload.amount ?? existing.amount.toString();
      const nextAllocations = payload.allocations ?? existing.allocations.map((allocation) => ({
        documentId: allocation.documentId,
        amount: allocation.amount.toString()
      }));

      this.validateAllocationTotal(nextAllocations, nextAmount);

      await tx.payment.update({
        where: { id },
        data: {
          number: payload.number ?? existing.number,
          direction: payload.direction ?? existing.direction,
          paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : existing.paymentDate,
          amount: payload.amount ? this.decimal(payload.amount) : existing.amount,
          notes: payload.notes === undefined ? existing.notes : payload.notes,
          accountId: payload.accountId ?? existing.accountId,
          counterpartyId: payload.counterpartyId === undefined
            ? existing.counterpartyId
            : payload.counterpartyId
        }
      });

      if (payload.allocations) {
        await tx.paymentAllocation.deleteMany({ where: { paymentId: id } });
        if (payload.allocations.length > 0) {
          await tx.paymentAllocation.createMany({
            data: payload.allocations.map((allocation) => ({
              paymentId: id,
              documentId: allocation.documentId,
              amount: this.decimal(allocation.amount)
            }))
          });
        }
      }

      return this.findOne(id, tx);
    });
  }

  async removeDraft(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await this.getPaymentRecord(id, tx);
      this.ensureDraft(existing);
      await tx.payment.delete({ where: { id } });
    });
  }

  async post(id: string, postedAt?: string): Promise<PaymentDto> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await this.getPaymentRecord(id, tx);
      this.ensureDraft(payment);
      this.validateAllocationTotal(
        payment.allocations.map((allocation) => ({
          documentId: allocation.documentId,
          amount: allocation.amount.toString()
        })),
        payment.amount.toString()
      );

      await tx.moneyMovement.create({
        data: {
          movementDate: postedAt ? new Date(postedAt) : new Date(),
          direction: payment.direction === "INCOMING" ? "IN" : "OUT",
          amount: payment.amount,
          accountId: payment.accountId,
          paymentId: payment.id,
          counterpartyId: payment.counterpartyId
        }
      });

      await tx.payment.update({
        where: { id },
        data: {
          status: "POSTED"
        }
      });

      return this.findOne(id, tx);
    });
  }

  async unpost(id: string): Promise<PaymentDto> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await this.getPaymentRecord(id, tx);

      if (payment.status !== "POSTED") {
        throw new BadRequestException(`Payment ${id} is not posted.`);
      }

      await tx.moneyMovement.deleteMany({ where: { paymentId: id } });
      await tx.payment.update({
        where: { id },
        data: { status: "DRAFT" }
      });

      return this.findOne(id, tx);
    });
  }

  async repost(command: RepostPaymentCommand): Promise<PaymentDto> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await this.getPaymentRecord(command.id, tx);

      if (payment.status === "POSTED") {
        await tx.moneyMovement.deleteMany({ where: { paymentId: command.id } });
        await tx.payment.update({
          where: { id: command.id },
          data: { status: "DRAFT" }
        });
      }

      const refreshed = await this.getPaymentRecord(command.id, tx);
      this.ensureDraft(refreshed);

      await tx.moneyMovement.create({
        data: {
          movementDate: new Date(),
          direction: refreshed.direction === "INCOMING" ? "IN" : "OUT",
          amount: refreshed.amount,
          accountId: refreshed.accountId,
          paymentId: refreshed.id,
          counterpartyId: refreshed.counterpartyId
        }
      });

      await tx.payment.update({
        where: { id: command.id },
        data: { status: "POSTED" }
      });

      return this.findOne(command.id, tx);
    });
  }

  async getCounterpartyDebts(): Promise<CounterpartyDebtDto[]> {
    const rows = await this.prisma.$queryRaw<DebtRow[]>(Prisma.sql`
      WITH posted_documents AS (
        SELECT
          d."counterpartyId" AS "counterpartyId",
          COALESCE(SUM(d."totalAmount"), 0) AS "documentTotal"
        FROM "Document" d
        WHERE d."status" = 'POSTED' AND d."counterpartyId" IS NOT NULL
        GROUP BY d."counterpartyId"
      ),
      posted_allocations AS (
        SELECT
          p."counterpartyId" AS "counterpartyId",
          COALESCE(SUM(pa."amount"), 0) AS "paidTotal"
        FROM "PaymentAllocation" pa
        INNER JOIN "Payment" p ON p."id" = pa."paymentId"
        WHERE p."status" = 'POSTED' AND p."counterpartyId" IS NOT NULL
        GROUP BY p."counterpartyId"
      ),
      counterparties AS (
        SELECT "counterpartyId" FROM posted_documents
        UNION
        SELECT "counterpartyId" FROM posted_allocations
      )
      SELECT
        c."counterpartyId" AS "counterpartyId",
        COALESCE(d."documentTotal", 0) AS "documentTotal",
        COALESCE(a."paidTotal", 0) AS "paidTotal",
        COALESCE(d."documentTotal", 0) - COALESCE(a."paidTotal", 0) AS "debtTotal"
      FROM counterparties c
      LEFT JOIN posted_documents d ON d."counterpartyId" = c."counterpartyId"
      LEFT JOIN posted_allocations a ON a."counterpartyId" = c."counterpartyId"
      ORDER BY c."counterpartyId" ASC
    `);

    return rows.map(toCounterpartyDebtDto);
  }

  private async getPaymentRecord(id: string, client: DbClient): Promise<PaymentRecord> {
    const payment = await client.payment.findUnique({
      where: { id },
      include: { allocations: true }
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${id} was not found.`);
    }

    return payment;
  }

  private ensureDraft(payment: PaymentRecord) {
    if (payment.status !== "DRAFT") {
      throw new BadRequestException(`Payment ${payment.id} is not editable in ${payment.status} status.`);
    }
  }

  private validateAllocationTotal(allocations: PaymentAllocationDto[], amount: string) {
    const allocated = allocations.reduce(
      (sum, allocation) => sum.add(this.decimal(allocation.amount)),
      new Prisma.Decimal(0)
    );
    const paymentAmount = this.decimal(amount);

    if (allocated.greaterThan(paymentAmount)) {
      throw new BadRequestException("Payment allocations cannot exceed payment amount.");
    }
  }

  private decimal(value: string) {
    return new Prisma.Decimal(value);
  }
}
