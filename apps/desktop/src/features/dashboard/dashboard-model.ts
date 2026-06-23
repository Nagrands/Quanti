import type {
  CounterpartyDebtDto,
  CounterpartyDto,
  DocumentDto,
  PaymentDto,
  ProductDto,
  StockBalanceReportRowDto,
  WarehouseDto
} from "@quanti/shared";

export interface DashboardSummary {
  postedSalesTotal: number;
  incomingPaymentsTotal: number;
  openDebtTotal: number;
  draftDocumentsCount: number;
  latestDocuments: DocumentDto[];
  latestPayments: PaymentDto[];
  lowStockRows: Array<{
    key: string;
    productLabel: string;
    warehouseLabel: string;
    quantity: string;
  }>;
  debtRows: Array<{
    key: string;
    counterpartyLabel: string;
    debtTotal: string;
  }>;
}

interface DashboardSource {
  documents: DocumentDto[];
  payments: PaymentDto[];
  debts: CounterpartyDebtDto[];
  stockRows: StockBalanceReportRowDto[];
  products: ProductDto[];
  warehouses: WarehouseDto[];
  counterparties: CounterpartyDto[];
}

function asNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inMonth(value: string, monthPrefix: string) {
  return value.slice(0, 7) === monthPrefix;
}

function productLabel(products: ProductDto[], productId: string) {
  const product = products.find((item) => item.id === productId);
  return product ? `${product.sku} · ${product.name}` : productId;
}

function warehouseLabel(warehouses: WarehouseDto[], warehouseId: string) {
  const warehouse = warehouses.find((item) => item.id === warehouseId);
  return warehouse ? `${warehouse.code} · ${warehouse.name}` : warehouseId;
}

function counterpartyLabel(counterparties: CounterpartyDto[], counterpartyId: string) {
  const counterparty = counterparties.find((item) => item.id === counterpartyId);
  return counterparty ? `${counterparty.code} · ${counterparty.name}` : counterpartyId;
}

export function createDashboardSummary(source: DashboardSource, date = new Date()): DashboardSummary {
  const monthPrefix = date.toISOString().slice(0, 7);
  const postedSalesTotal = source.documents
    .filter((document) =>
      document.status === "POSTED" && document.type === "SALE" && inMonth(document.documentDate, monthPrefix)
    )
    .reduce((sum, document) => sum + asNumber(document.totalAmount), 0);
  const incomingPaymentsTotal = source.payments
    .filter((payment) =>
      payment.status === "POSTED" && payment.direction === "INCOMING" && inMonth(payment.paymentDate, monthPrefix)
    )
    .reduce((sum, payment) => sum + asNumber(payment.amount), 0);

  return {
    postedSalesTotal,
    incomingPaymentsTotal,
    openDebtTotal: source.debts.reduce((sum, row) => sum + asNumber(row.debtTotal), 0),
    draftDocumentsCount: source.documents.filter((document) => document.status === "DRAFT").length,
    latestDocuments: [...source.documents]
      .sort((left, right) => right.documentDate.localeCompare(left.documentDate))
      .slice(0, 5),
    latestPayments: [...source.payments]
      .sort((left, right) => right.paymentDate.localeCompare(left.paymentDate))
      .slice(0, 5),
    lowStockRows: source.stockRows
      .filter((row) => asNumber(row.quantity) <= 5)
      .sort((left, right) => asNumber(left.quantity) - asNumber(right.quantity))
      .slice(0, 5)
      .map((row) => ({
        key: `${row.productId}:${row.warehouseId}`,
        productLabel: productLabel(source.products, row.productId),
        warehouseLabel: warehouseLabel(source.warehouses, row.warehouseId),
        quantity: row.quantity
      })),
    debtRows: source.debts
      .filter((row) => asNumber(row.debtTotal) > 0)
      .sort((left, right) => asNumber(right.debtTotal) - asNumber(left.debtTotal))
      .slice(0, 5)
      .map((row) => ({
        key: row.counterpartyId,
        counterpartyLabel: counterpartyLabel(source.counterparties, row.counterpartyId),
        debtTotal: row.debtTotal
      }))
  };
}
