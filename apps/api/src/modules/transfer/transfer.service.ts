import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@quanti/db";
import {
  accountTypes,
  counterpartyTypes,
  createTransferPackage,
  documentStatuses,
  documentTypes,
  isQuantiTransferPackage,
  paymentDirections,
  paymentStatuses,
  type ApplyImportResult,
  type DocumentsTransferPayload,
  type ImportPreviewEntry,
  type ImportPreviewResult,
  type ImportResolution,
  type MasterDataTransferPayload,
  type PaymentsTransferPayload,
  type QuantiTransferPackage,
  type TransferDocument,
  type TransferPayment
} from "@quanti/shared";

import { PrismaService } from "../../common/prisma/prisma.service";

type ImportableSection = "master-data" | "documents" | "payments";
type Tx = Prisma.TransactionClient;
type ExistingKeys = Record<ImportPreviewEntry["entityType"], Set<string>>;

@Injectable()
export class TransferService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async export(section: string) {
    if (!this.isImportableSection(section)) {
      throw new BadRequestException(`Unsupported transfer section: ${section}.`);
    }

    const masterData = await this.exportMasterData();
    if (section === "master-data") return createTransferPackage(section, masterData);

    const documents = await this.exportDocuments();
    if (section === "documents") {
      return createTransferPackage(section, { masterData, documents });
    }

    const payments = await this.exportPayments();
    return createTransferPackage(section, { masterData, documents, payments });
  }

  async preview(value: unknown): Promise<ImportPreviewResult> {
    const transferPackage = this.assertImportablePackage(value);
    const entries = this.collectEntries(transferPackage);
    const existing = await this.getExistingKeys();
    const duplicates = new Set<string>();
    const seen = new Set<string>();

    for (const entry of entries) {
      if (seen.has(entry.id)) duplicates.add(entry.id);
      seen.add(entry.id);
    }
    const available = (type: ImportPreviewEntry["entityType"], key: string | null) => !key
      || seen.has(`${type}:${key}`)
      || existing[type].has(key);
    const referenceErrors = new Map<string, string>();
    const master = this.getMasterDataPayload(transferPackage);
    for (const product of master.products) {
      if (!available("category", product.categoryCode)) {
        referenceErrors.set(`product:${product.sku}`, `Missing category ${product.categoryCode}.`);
      }
    }
    if (transferPackage.section === "documents" || transferPackage.section === "payments") {
      for (const document of (transferPackage.payload as DocumentsTransferPayload).documents) {
        const missing = [
          ["warehouse", document.warehouseCode], ["warehouse", document.sourceWarehouseCode],
          ["warehouse", document.destinationWarehouseCode], ["counterparty", document.counterpartyCode],
          ...document.items.flatMap((item) => [["product", item.productSku], ["warehouse", item.warehouseCode]])
        ].find(([type, key]) => !available(type as ImportPreviewEntry["entityType"], key));
        if (missing) referenceErrors.set(`document:${document.number}`, `Missing ${missing[0]} ${missing[1]}.`);
      }
    }
    if (transferPackage.section === "payments") {
      for (const payment of (transferPackage.payload as PaymentsTransferPayload).payments) {
        const missing = [
          ["account", payment.accountCode], ["counterparty", payment.counterpartyCode],
          ...payment.allocations.map((allocation) => ["document", allocation.documentNumber])
        ].find(([type, key]) => !available(type as ImportPreviewEntry["entityType"], key));
        if (missing) referenceErrors.set(`payment:${payment.number}`, `Missing ${missing[0]} ${missing[1]}.`);
      }
    }

    return {
      section: transferPackage.section,
      entries: entries.map((entry) => {
        if (!entry.key.trim()) {
          return { ...entry, status: "invalid", defaultResolution: null, message: "Natural key is required." };
        }
        if (duplicates.has(entry.id)) {
          return { ...entry, status: "invalid", defaultResolution: null, message: "Natural key is duplicated in the file." };
        }
        const referenceError = referenceErrors.get(entry.id);
        if (referenceError) {
          return { ...entry, status: "invalid", defaultResolution: null, message: referenceError };
        }
        return existing[entry.entityType].has(entry.key)
          ? { ...entry, status: "conflict", defaultResolution: "skip" }
          : entry;
      })
    };
  }

  async apply(
    value: unknown,
    resolutions: Record<string, ImportResolution>
  ): Promise<ApplyImportResult> {
    const transferPackage = this.assertImportablePackage(value);
    const preview = await this.preview(transferPackage);
    const invalid = preview.entries.find((entry) => entry.status === "invalid");
    if (invalid) throw new BadRequestException(`${invalid.entityType} ${invalid.key}: ${invalid.message}`);

    const result: ApplyImportResult = { created: 0, updated: 0, skipped: 0 };
    await this.prisma.$transaction(async (tx) => {
      const payload = this.getMasterDataPayload(transferPackage);
      await this.applyMasterData(tx, payload, resolutions, result);
      if (transferPackage.section === "documents" || transferPackage.section === "payments") {
        await this.applyDocuments(tx, (transferPackage.payload as DocumentsTransferPayload).documents, resolutions, result);
      }
      if (transferPackage.section === "payments") {
        await this.applyPayments(tx, (transferPackage.payload as PaymentsTransferPayload).payments, resolutions, result);
      }
    }, { maxWait: 5_000, timeout: 60_000 });
    return result;
  }

  private async exportMasterData(): Promise<MasterDataTransferPayload> {
    const [categories, products, warehouses, counterparties, accounts] = await Promise.all([
      this.prisma.productCategory.findMany({ orderBy: { code: "asc" } }),
      this.prisma.product.findMany({ include: { category: true, units: true }, orderBy: { sku: "asc" } }),
      this.prisma.warehouse.findMany({ orderBy: { code: "asc" } }),
      this.prisma.counterparty.findMany({ orderBy: { code: "asc" } }),
      this.prisma.account.findMany({ orderBy: { code: "asc" } })
    ]);
    return {
      categories: categories.map(({ code, name, description, isActive }) => ({ code, name, description, isActive })),
      products: products.map((product) => ({
        sku: product.sku,
        name: product.name,
        description: product.description,
        unit: product.unit,
        units: product.units.map((unit) => ({ name: unit.name, conversionFactor: unit.conversionFactor.toString() })),
        categoryCode: product.category?.code ?? null,
        isActive: product.isActive
      })),
      warehouses: warehouses.map(({ code, name, isActive }) => ({ code, name, isActive })),
      counterparties: counterparties.map(({ code, name, type, taxId, isActive }) => ({ code, name, type, taxId, isActive })),
      accounts: accounts.map(({ code, name, type, currencyCode, isActive }) => ({ code, name, type, currencyCode, isActive }))
    };
  }

  private async exportDocuments(): Promise<TransferDocument[]> {
    const [records, warehouses] = await Promise.all([this.prisma.document.findMany({
      include: {
        warehouse: true,
        sourceWarehouse: true,
        destinationWarehouse: true,
        counterparty: true,
        items: { include: { product: true }, orderBy: { lineNo: "asc" } }
      },
      orderBy: { documentDate: "asc" }
    }), this.prisma.warehouse.findMany({ select: { id: true, code: true } })]);
    const warehouseCodes = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.code]));
    return records.map((record) => ({
      number: record.number,
      type: record.type,
      status: record.status,
      documentDate: record.documentDate.toISOString(),
      postedAt: record.postedAt?.toISOString() ?? null,
      notes: record.notes,
      warehouseCode: record.warehouse?.code ?? null,
      sourceWarehouseCode: record.sourceWarehouse?.code ?? null,
      destinationWarehouseCode: record.destinationWarehouse?.code ?? null,
      counterpartyCode: record.counterparty?.code ?? null,
      items: record.items.map((item) => ({
        productSku: item.product.sku,
        unit: item.unit,
        quantity: item.quantity.toString(),
        price: item.price.toString(),
        amount: item.amount.toString(),
        warehouseCode: item.warehouseId ? warehouseCodes.get(item.warehouseId) ?? null : null
      }))
    }));
  }

  private async exportPayments(): Promise<TransferPayment[]> {
    const records = await this.prisma.payment.findMany({
      include: {
        account: true,
        counterparty: true,
        allocations: { include: { document: true } },
        moneyMovements: { orderBy: { movementDate: "asc" }, take: 1 }
      },
      orderBy: { paymentDate: "asc" }
    });
    return records.map((record) => ({
      number: record.number,
      direction: record.direction,
      status: record.status,
      paymentDate: record.paymentDate.toISOString(),
      postedAt: record.moneyMovements[0]?.movementDate.toISOString() ?? null,
      amount: record.amount.toString(),
      notes: record.notes,
      accountCode: record.account.code,
      counterpartyCode: record.counterparty?.code ?? null,
      allocations: record.allocations.map((allocation) => ({
        documentNumber: allocation.document.number,
        amount: allocation.amount.toString()
      }))
    }));
  }

  private collectEntries(transferPackage: QuantiTransferPackage<ImportableSection>): ImportPreviewEntry[] {
    const master = this.getMasterDataPayload(transferPackage);
    const make = (entityType: ImportPreviewEntry["entityType"], key: string): ImportPreviewEntry => ({
      id: `${entityType}:${key}`,
      entityType,
      key,
      status: "new",
      defaultResolution: null
    });
    const entries = [
      ...master.categories.map((item) => make("category", item.code)),
      ...master.products.map((item) => make("product", item.sku)),
      ...master.warehouses.map((item) => make("warehouse", item.code)),
      ...master.counterparties.map((item) => make("counterparty", item.code)),
      ...master.accounts.map((item) => make("account", item.code))
    ];
    if (transferPackage.section === "documents" || transferPackage.section === "payments") {
      entries.push(...(transferPackage.payload as DocumentsTransferPayload).documents.map((item) => make("document", item.number)));
    }
    if (transferPackage.section === "payments") {
      entries.push(...(transferPackage.payload as PaymentsTransferPayload).payments.map((item) => make("payment", item.number)));
    }
    return entries;
  }

  private async getExistingKeys(): Promise<ExistingKeys> {
    const [categories, products, warehouses, counterparties, accounts, documents, payments] = await Promise.all([
      this.prisma.productCategory.findMany({ select: { code: true } }),
      this.prisma.product.findMany({ select: { sku: true } }),
      this.prisma.warehouse.findMany({ select: { code: true } }),
      this.prisma.counterparty.findMany({ select: { code: true } }),
      this.prisma.account.findMany({ select: { code: true } }),
      this.prisma.document.findMany({ select: { number: true } }),
      this.prisma.payment.findMany({ select: { number: true } })
    ]);
    return {
      category: new Set(categories.map((item) => item.code)),
      product: new Set(products.map((item) => item.sku)),
      warehouse: new Set(warehouses.map((item) => item.code)),
      counterparty: new Set(counterparties.map((item) => item.code)),
      account: new Set(accounts.map((item) => item.code)),
      document: new Set(documents.map((item) => item.number)),
      payment: new Set(payments.map((item) => item.number))
    };
  }

  private async applyMasterData(
    tx: Tx,
    payload: MasterDataTransferPayload,
    resolutions: Record<string, ImportResolution>,
    result: ApplyImportResult
  ) {
    for (const item of payload.categories) {
      this.assertString(item.code, "Category code"); this.assertString(item.name, `Category ${item.code} name`);
      const existing = await tx.productCategory.findUnique({ where: { code: item.code } });
      if (existing && this.shouldSkip("category", item.code, resolutions, result)) continue;
      await tx.productCategory.upsert({ where: { code: item.code }, create: item, update: item });
      this.count(existing, result);
    }
    for (const item of payload.warehouses) {
      this.assertString(item.code, "Warehouse code"); this.assertString(item.name, `Warehouse ${item.code} name`);
      const existing = await tx.warehouse.findUnique({ where: { code: item.code } });
      if (existing && this.shouldSkip("warehouse", item.code, resolutions, result)) continue;
      await tx.warehouse.upsert({ where: { code: item.code }, create: item, update: item });
      this.count(existing, result);
    }
    for (const item of payload.counterparties) {
      this.assertString(item.code, "Counterparty code"); this.assertString(item.name, `Counterparty ${item.code} name`);
      if (!counterpartyTypes.includes(item.type)) throw new BadRequestException(`Counterparty ${item.code} has invalid type.`);
      const existing = await tx.counterparty.findUnique({ where: { code: item.code } });
      if (existing && this.shouldSkip("counterparty", item.code, resolutions, result)) continue;
      await tx.counterparty.upsert({ where: { code: item.code }, create: item, update: item });
      this.count(existing, result);
    }
    for (const item of payload.accounts) {
      this.assertString(item.code, "Account code"); this.assertString(item.name, `Account ${item.code} name`);
      if (!accountTypes.includes(item.type)) throw new BadRequestException(`Account ${item.code} has invalid type.`);
      const existing = await tx.account.findUnique({ where: { code: item.code } });
      if (existing && this.shouldSkip("account", item.code, resolutions, result)) continue;
      await tx.account.upsert({ where: { code: item.code }, create: item, update: item });
      this.count(existing, result);
    }
    for (const item of payload.products) {
      this.assertString(item.sku, "Product SKU"); this.assertString(item.name, `Product ${item.sku} name`);
      const category = item.categoryCode
        ? await tx.productCategory.findUnique({ where: { code: item.categoryCode } })
        : null;
      if (item.categoryCode && !category) throw new BadRequestException(`Product ${item.sku} references missing category ${item.categoryCode}.`);
      const existing = await tx.product.findUnique({ where: { sku: item.sku } });
      if (existing && this.shouldSkip("product", item.sku, resolutions, result)) continue;
      const data = {
        sku: item.sku, name: item.name, description: item.description, unit: item.unit,
        categoryId: category?.id ?? null, isActive: item.isActive
      };
      const product = await tx.product.upsert({ where: { sku: item.sku }, create: data, update: data });
      if (existing) await tx.productUnit.deleteMany({ where: { productId: product.id } });
      if (item.units.length) {
        await tx.productUnit.createMany({
          data: item.units.map((unit) => ({ productId: product.id, name: unit.name, conversionFactor: this.decimal(unit.conversionFactor) }))
        });
      }
      this.count(existing, result);
    }
  }

  private async applyDocuments(
    tx: Tx,
    documents: TransferDocument[],
    resolutions: Record<string, ImportResolution>,
    result: ApplyImportResult
  ) {
    for (const item of documents) {
      this.validateDocument(item);
      const existing = await tx.document.findUnique({ where: { number: item.number } });
      if (existing && this.shouldSkip("document", item.number, resolutions, result)) continue;
      const [warehouse, sourceWarehouse, destinationWarehouse, counterparty] = await Promise.all([
        this.resolveByCode(tx.warehouse, item.warehouseCode, "warehouse", item.number),
        this.resolveByCode(tx.warehouse, item.sourceWarehouseCode, "source warehouse", item.number),
        this.resolveByCode(tx.warehouse, item.destinationWarehouseCode, "destination warehouse", item.number),
        this.resolveByCode(tx.counterparty, item.counterpartyCode, "counterparty", item.number)
      ]);
      const resolvedItems = [];
      for (const line of item.items) {
        const product = await tx.product.findUnique({ where: { sku: line.productSku }, include: { units: true } });
        if (!product) throw new BadRequestException(`Document ${item.number} references missing product ${line.productSku}.`);
        const lineWarehouse = await this.resolveByCode(tx.warehouse, line.warehouseCode, "line warehouse", item.number);
        const alternative = product.units.find((unit) => unit.name === line.unit);
        if (line.unit !== product.unit && !alternative) {
          throw new BadRequestException(`Document ${item.number} uses unavailable unit ${line.unit} for ${line.productSku}.`);
        }
        resolvedItems.push({ ...line, productId: product.id, warehouseId: lineWarehouse?.id ?? null, unitFactor: alternative?.conversionFactor ?? new Prisma.Decimal(1) });
      }
      if (existing) {
        await tx.stockMovement.deleteMany({ where: { documentId: existing.id } });
        await tx.documentItem.deleteMany({ where: { documentId: existing.id } });
      }
      const totalAmount = resolvedItems.reduce((sum, line) => sum.add(this.decimal(line.amount)), new Prisma.Decimal(0));
      const data = {
        number: item.number, type: item.type, status: "DRAFT" as const,
        documentDate: this.date(item.documentDate, `document ${item.number}`), postedAt: null,
        notes: item.notes, totalAmount, warehouseId: warehouse?.id ?? null,
        sourceWarehouseId: sourceWarehouse?.id ?? null, destinationWarehouseId: destinationWarehouse?.id ?? null,
        counterpartyId: counterparty?.id ?? null,
        items: { create: resolvedItems.map((line, index) => ({
          lineNo: index + 1, productId: line.productId, unit: line.unit, unitFactor: line.unitFactor,
          quantity: this.decimal(line.quantity), price: this.decimal(line.price), amount: this.decimal(line.amount), warehouseId: line.warehouseId
        })) }
      };
      const document = existing
        ? await tx.document.update({ where: { id: existing.id }, data, include: { items: true } })
        : await tx.document.create({ data, include: { items: true } });
      if (item.status === "POSTED") await this.postImportedDocument(tx, document, item.postedAt ?? item.documentDate);
      this.count(existing, result);
    }
  }

  private async applyPayments(
    tx: Tx,
    payments: TransferPayment[],
    resolutions: Record<string, ImportResolution>,
    result: ApplyImportResult
  ) {
    for (const item of payments) {
      this.validatePayment(item);
      const existing = await tx.payment.findUnique({ where: { number: item.number } });
      if (existing && this.shouldSkip("payment", item.number, resolutions, result)) continue;
      const account = await this.resolveByCode(tx.account, item.accountCode, "account", item.number);
      const counterparty = await this.resolveByCode(tx.counterparty, item.counterpartyCode, "counterparty", item.number);
      if (!account) throw new BadRequestException(`Payment ${item.number} requires account ${item.accountCode}.`);
      const allocations = [];
      let allocated = new Prisma.Decimal(0);
      for (const allocation of item.allocations) {
        const document = await tx.document.findUnique({ where: { number: allocation.documentNumber } });
        if (!document) throw new BadRequestException(`Payment ${item.number} references missing document ${allocation.documentNumber}.`);
        const amount = this.decimal(allocation.amount); allocated = allocated.add(amount);
        allocations.push({ documentId: document.id, amount });
      }
      const amount = this.decimal(item.amount);
      if (allocated.greaterThan(amount)) throw new BadRequestException(`Payment ${item.number} allocations exceed its amount.`);
      if (existing) {
        await tx.moneyMovement.deleteMany({ where: { paymentId: existing.id } });
        await tx.paymentAllocation.deleteMany({ where: { paymentId: existing.id } });
      }
      const data = {
        number: item.number, direction: item.direction, status: item.status === "CANCELLED" ? "CANCELLED" as const : "DRAFT" as const,
        paymentDate: this.date(item.paymentDate, `payment ${item.number}`), amount, notes: item.notes,
        accountId: account.id, counterpartyId: counterparty?.id ?? null,
        allocations: { create: allocations }
      };
      const payment = existing
        ? await tx.payment.update({ where: { id: existing.id }, data })
        : await tx.payment.create({ data });
      if (item.status === "POSTED") {
        await tx.moneyMovement.create({ data: {
          movementDate: this.date(item.postedAt ?? item.paymentDate, `payment ${item.number}`),
          direction: item.direction === "INCOMING" ? "IN" : "OUT", amount,
          accountId: account.id, paymentId: payment.id, counterpartyId: counterparty?.id ?? null
        } });
        await tx.payment.update({ where: { id: payment.id }, data: { status: "POSTED" } });
      }
      this.count(existing, result);
    }
  }

  private async postImportedDocument(tx: Tx, document: any, movementDate: string) {
    const movements: Array<{ direction: "IN" | "OUT"; warehouseId: string; item: any }> = [];
    for (const item of document.items) {
      const itemWarehouseId = item.warehouseId ?? document.warehouseId;
      if (document.type === "PURCHASE" || document.type === "RETURN_IN") {
        const warehouseId = itemWarehouseId ?? document.destinationWarehouseId;
        if (!warehouseId) throw new BadRequestException(`Document ${document.number} requires a target warehouse.`);
        movements.push({ direction: "IN", warehouseId, item });
      } else if (document.type === "SALE" || document.type === "RETURN_OUT") {
        const warehouseId = itemWarehouseId ?? document.sourceWarehouseId;
        if (!warehouseId) throw new BadRequestException(`Document ${document.number} requires a source warehouse.`);
        await this.assertStock(tx, item.productId, warehouseId, item.quantity.mul(item.unitFactor));
        movements.push({ direction: "OUT", warehouseId, item });
      } else if (document.type === "TRANSFER") {
        const source = document.sourceWarehouseId ?? itemWarehouseId;
        const destination = document.destinationWarehouseId;
        if (!source || !destination) throw new BadRequestException(`Transfer ${document.number} requires both warehouses.`);
        await this.assertStock(tx, item.productId, source, item.quantity.mul(item.unitFactor));
        movements.push({ direction: "OUT", warehouseId: source, item }, { direction: "IN", warehouseId: destination, item });
      } else {
        throw new BadRequestException(`Posted stock adjustment ${document.number} cannot be imported.`);
      }
    }
    if (movements.length) await tx.stockMovement.createMany({ data: movements.map(({ direction, warehouseId, item }) => ({
      movementDate: this.date(movementDate, `document ${document.number}`), direction,
      quantity: item.quantity.mul(item.unitFactor), productId: item.productId, warehouseId,
      documentId: document.id, documentItemId: item.id
    })) });
    await tx.document.update({ where: { id: document.id }, data: { status: "POSTED", postedAt: this.date(movementDate, `document ${document.number}`) } });
  }

  private async assertStock(tx: Tx, productId: string, warehouseId: string, required: Prisma.Decimal) {
    const rows = await tx.stockMovement.findMany({ where: { productId, warehouseId }, select: { direction: true, quantity: true } });
    const available = rows.reduce((sum, row) => row.direction === "IN" ? sum.add(row.quantity) : sum.sub(row.quantity), new Prisma.Decimal(0));
    if (available.lessThan(required)) throw new BadRequestException(`Insufficient stock for imported posted document.`);
  }

  private async resolveByCode(model: any, code: string | null, label: string, owner: string): Promise<{ id: string } | null> {
    if (!code) return null;
    const record = await model.findUnique({ where: { code } });
    if (!record) throw new BadRequestException(`${owner} references missing ${label} ${code}.`);
    return record;
  }

  private validateDocument(item: TransferDocument) {
    this.assertString(item.number, "Document number");
    if (!documentTypes.includes(item.type) || !documentStatuses.includes(item.status) || !Array.isArray(item.items) || !item.items.length) {
      throw new BadRequestException(`Document ${item.number} has invalid type, status, or lines.`);
    }
  }

  private validatePayment(item: TransferPayment) {
    this.assertString(item.number, "Payment number");
    if (!paymentDirections.includes(item.direction) || !paymentStatuses.includes(item.status) || !Array.isArray(item.allocations)) {
      throw new BadRequestException(`Payment ${item.number} has invalid direction, status, or allocations.`);
    }
  }

  private getMasterDataPayload(transferPackage: QuantiTransferPackage<ImportableSection>) {
    return transferPackage.section === "master-data"
      ? transferPackage.payload as MasterDataTransferPayload
      : (transferPackage.payload as DocumentsTransferPayload).masterData;
  }

  private assertImportablePackage(value: unknown): QuantiTransferPackage<ImportableSection> {
    if (!isQuantiTransferPackage(value)) throw new BadRequestException("Invalid or unsupported Quanti transfer package.");
    if (!this.isImportableSection(value.section)) throw new BadRequestException("Report snapshots are imported in the desktop app.");
    const payload = value.payload as any;
    const master = value.section === "master-data" ? payload : payload.masterData;
    if (!master || ![master.categories, master.products, master.warehouses, master.counterparties, master.accounts].every(Array.isArray)) {
      throw new BadRequestException("Transfer package has invalid master data.");
    }
    for (const [name, records] of Object.entries(master)) {
      if (!Array.isArray(records) || records.some((record) => !record || typeof record !== "object")) {
        throw new BadRequestException(`Transfer package has invalid ${name}.`);
      }
    }
    if (master.products.some((product: any) => !Array.isArray(product.units))) {
      throw new BadRequestException("Transfer package has invalid product units.");
    }
    if ((value.section === "documents" || value.section === "payments") && !Array.isArray(payload.documents)) {
      throw new BadRequestException("Transfer package has invalid documents.");
    }
    if ((value.section === "documents" || value.section === "payments")
      && payload.documents.some((document: any) => !document || typeof document !== "object" || !Array.isArray(document.items))) {
      throw new BadRequestException("Transfer package has invalid document lines.");
    }
    if (value.section === "payments" && !Array.isArray(payload.payments)) {
      throw new BadRequestException("Transfer package has invalid payments.");
    }
    if (value.section === "payments"
      && payload.payments.some((payment: any) => !payment || typeof payment !== "object" || !Array.isArray(payment.allocations))) {
      throw new BadRequestException("Transfer package has invalid payment allocations.");
    }
    return value as QuantiTransferPackage<ImportableSection>;
  }

  private shouldSkip(type: ImportPreviewEntry["entityType"], key: string, resolutions: Record<string, ImportResolution>, result: ApplyImportResult) {
    if (resolutions[`${type}:${key}`] === "update") return false;
    result.skipped += 1;
    return true;
  }

  private count(existing: unknown, result: ApplyImportResult) {
    if (existing) result.updated += 1; else result.created += 1;
  }

  private assertString(value: unknown, label: string): asserts value is string {
    if (typeof value !== "string" || !value.trim()) throw new BadRequestException(`${label} is required.`);
  }

  private date(value: string, label: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`Invalid date in ${label}.`);
    return date;
  }

  private decimal(value: string) {
    try { return new Prisma.Decimal(value); } catch { throw new BadRequestException(`Invalid decimal value: ${value}.`); }
  }

  private isImportableSection(section: string): section is ImportableSection {
    return section === "master-data" || section === "documents" || section === "payments";
  }
}
