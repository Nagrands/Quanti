import type {
  CreateAccountDto,
  CreateCounterpartyDto,
  CreateDraftDocumentDto,
  CreatePaymentDto,
  CreateProductDto,
  CreateWarehouseDto,
  DocumentPrintDataDto,
  DocumentPrintRequestDto,
  CounterpartyDebtReportFilterDto,
  DocumentDto,
  PaymentDto,
  ProductDto,
  RepostDocumentCommand,
  RepostPaymentCommand,
  ReportContracts,
  SalesReportFilterDto,
  ReserveStockRequestDto,
  TopProductsReportFilterDto,
  StockBalanceReportFilterDto,
  StockTurnoverReportFilterDto,
  CashflowReportFilterDto,
  UpdateDraftDocumentPatchDto,
  UpdateDraftPaymentPatchDto
} from "./index";
import {
  accountTypes,
  counterpartyTypes,
  documentStatuses,
  documentTypes,
  paymentDirections,
  paymentStatuses
} from "./index";

const product: CreateProductDto = {
  sku: "SKU-001",
  name: "Widget",
  unit: "pcs"
};

const warehouse: CreateWarehouseDto = {
  code: "MAIN",
  name: "Main warehouse"
};

const counterparty: CreateCounterpartyDto = {
  code: "C-001",
  name: "Default counterparty",
  type: "CUSTOMER"
};

const account: CreateAccountDto = {
  code: "CASH-001",
  name: "Main cashbox",
  type: "CASH"
};

const draftDocument: CreateDraftDocumentDto = {
  number: "SO-0001",
  type: "SALE",
  documentDate: "2026-04-14T00:00:00.000Z",
  items: [
    {
      productId: "product-1",
      quantity: "10.000",
      price: "15.00",
      amount: "150.00",
      warehouseId: "warehouse-1"
    }
  ]
};

const payment: CreatePaymentDto = {
  number: "PAY-0001",
  direction: "INCOMING",
  paymentDate: "2026-04-14T00:00:00.000Z",
  amount: "150.00",
  accountId: "account-1",
  allocations: [{ documentId: "document-1", amount: "150.00" }]
};

const updatePayment: UpdateDraftPaymentPatchDto = {
  notes: "Updated payment",
  allocations: [{ documentId: "document-1", amount: "100.00" }]
};

const reportFilter: StockBalanceReportFilterDto = {
  at: "2026-04-14T00:00:00.000Z",
  warehouseId: "warehouse-1"
};

const stockTurnoverFilter: StockTurnoverReportFilterDto = {
  from: "2026-04-01T00:00:00.000Z",
  to: "2026-04-30T23:59:59.000Z"
};

const cashflowFilter: CashflowReportFilterDto = {
  from: "2026-04-01T00:00:00.000Z",
  to: "2026-04-30T23:59:59.000Z",
  accountId: "account-1"
};

const salesFilter: SalesReportFilterDto = {
  from: "2026-04-01T00:00:00.000Z",
  to: "2026-04-30T23:59:59.000Z",
  counterpartyId: "counterparty-1"
};

const topProductsFilter: TopProductsReportFilterDto = {
  from: "2026-04-01T00:00:00.000Z",
  to: "2026-04-30T23:59:59.000Z",
  limit: 10
};

const debtReportFilter: CounterpartyDebtReportFilterDto = {
  at: "2026-04-30T23:59:59.000Z"
};

const reserveStockRequest: ReserveStockRequestDto = {
  productId: "product-1",
  warehouseId: "warehouse-1",
  requiredQuantity: "5.000"
};

const documentPrintRequest: DocumentPrintRequestDto = {
  templateVersion: 1
};

const documentPrintData: DocumentPrintDataDto = {
  documentId: "document-1",
  number: "SO-0001",
  type: "SALE",
  status: "POSTED",
  documentDate: "2026-04-14T00:00:00.000Z",
  counterpartyName: "Default counterparty",
  warehouseName: "Main warehouse",
  sourceWarehouseName: null,
  destinationWarehouseName: null,
  notes: null,
  totalAmount: "150.00",
  items: [{
    lineNo: 1,
    sku: "SKU-001",
    productName: "Widget",
    unit: "pcs",
    quantity: "10.000",
    price: "15.00",
    amount: "150.00"
  }],
  branding: {
    companyName: "Quanti ERP",
    documentTitle: "Sales document"
  }
};

const reportContracts: ReportContracts = {
  stockBalanceFilter: reportFilter,
  stockTurnoverFilter,
  cashflowFilter
};

const documentView: DocumentDto = {
  id: "document-1",
  number: "SO-0001",
  type: "SALE",
  status: "DRAFT",
  documentDate: "2026-04-14T00:00:00.000Z",
  postedAt: null,
  notes: null,
  totalAmount: "150.00",
  warehouseId: "warehouse-1",
  sourceWarehouseId: null,
  destinationWarehouseId: null,
  counterpartyId: "counterparty-1",
  items: []
};

const repostDocument: RepostDocumentCommand = {
  id: "document-1",
  postedAt: "2026-04-14T00:00:00.000Z"
};

const updateDraftDocument: UpdateDraftDocumentPatchDto = {
  notes: "Updated notes",
  items: [
    {
      productId: "product-1",
      quantity: "8.000",
      price: "15.00",
      amount: "120.00"
    }
  ]
};

const paymentView: PaymentDto = {
  id: "payment-1",
  number: "PAY-0001",
  direction: "INCOMING",
  status: "DRAFT",
  paymentDate: "2026-04-14T00:00:00.000Z",
  amount: "150.00",
  notes: null,
  accountId: "account-1",
  counterpartyId: "counterparty-1",
  allocations: []
};

const repostPayment: RepostPaymentCommand = {
  id: "payment-1"
};

const productView: ProductDto = {
  id: "product-1",
  sku: "SKU-001",
  name: "Widget",
  description: null,
  unit: "pcs",
  isActive: true,
  createdAt: "2026-04-14T00:00:00.000Z",
  updatedAt: "2026-04-14T00:00:00.000Z"
};

documentStatuses satisfies readonly string[];
documentTypes satisfies readonly string[];
paymentDirections satisfies readonly string[];
paymentStatuses satisfies readonly string[];
counterpartyTypes satisfies readonly string[];
accountTypes satisfies readonly string[];

void product;
void warehouse;
void counterparty;
void account;
void draftDocument;
void payment;
void updatePayment;
void reportContracts;
void salesFilter;
void topProductsFilter;
void debtReportFilter;
void reserveStockRequest;
void documentPrintRequest;
void documentPrintData;
void repostDocument;
void updateDraftDocument;
void documentView;
void paymentView;
void repostPayment;
void productView;
