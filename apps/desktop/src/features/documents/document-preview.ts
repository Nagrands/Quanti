import type { DocumentDto, ProductDto, WarehouseDto } from "@quanti/shared";
import type { DocumentFormValues } from "./document-model";

type MovementDirection = "IN" | "OUT";

export interface DocumentMovementPreview {
  key: string;
  direction: MovementDirection;
  productId: string;
  productLabel: string;
  warehouseId: string;
  warehouseLabel: string;
  quantity: string;
}

export interface StockWarning {
  key: string;
  productLabel: string;
  warehouseLabel: string;
  availableQuantity: string;
  requiredQuantity: string;
}

interface BalanceSnapshot {
  productId: string;
  warehouseId: string;
  quantity: string;
}

const outboundTypes = new Set(["SALE", "RETURN_OUT"]);

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatQuantity(value: string | number) {
  return Number(value).toFixed(3);
}

function productLabel(products: ProductDto[], productId: string) {
  const product = products.find((item) => item.id === productId);
  return product ? `${product.sku} · ${product.name}` : productId;
}

function warehouseLabel(warehouses: WarehouseDto[], warehouseId: string) {
  const warehouse = warehouses.find((item) => item.id === warehouseId);
  return warehouse ? `${warehouse.code} · ${warehouse.name}` : warehouseId;
}

export function getDocumentMovementPreview(
  document: DocumentDto,
  products: ProductDto[],
  warehouses: WarehouseDto[]
): DocumentMovementPreview[] {
  return document.items.flatMap((item) => {
    const quantity = formatQuantity(item.quantity);
    const product = productLabel(products, item.productId);

    if (document.type === "TRANSFER" && document.sourceWarehouseId && document.destinationWarehouseId) {
      return [
        {
          key: `${item.id}-out`,
          direction: "OUT" as const,
          productId: item.productId,
          productLabel: product,
          warehouseId: document.sourceWarehouseId,
          warehouseLabel: warehouseLabel(warehouses, document.sourceWarehouseId),
          quantity
        },
        {
          key: `${item.id}-in`,
          direction: "IN" as const,
          productId: item.productId,
          productLabel: product,
          warehouseId: document.destinationWarehouseId,
          warehouseLabel: warehouseLabel(warehouses, document.destinationWarehouseId),
          quantity
        }
      ];
    }

    const warehouseId = item.warehouseId ?? document.warehouseId;
    if (!warehouseId) {
      return [];
    }

    const direction: MovementDirection = document.type === "PURCHASE" || document.type === "RETURN_IN"
      ? "IN"
      : "OUT";

    return [{
      key: item.id,
      direction,
      productId: item.productId,
      productLabel: product,
      warehouseId,
      warehouseLabel: warehouseLabel(warehouses, warehouseId),
      quantity
    }];
  });
}

export function getRequiredStockChecks(values: DocumentFormValues) {
  if (values.type === "TRANSFER") {
    return values.items
      .filter((item) => item.productId && values.sourceWarehouseId && toNumber(item.quantity) > 0)
      .map((item) => ({
        key: `${item.key}:${item.productId}:${values.sourceWarehouseId}`,
        lineKey: item.key,
        productId: item.productId,
        warehouseId: values.sourceWarehouseId,
        requiredQuantity: formatQuantity(item.quantity)
      }));
  }

  if (!outboundTypes.has(values.type) || !values.warehouseId) {
    return [];
  }

  return values.items
    .filter((item) => item.productId && toNumber(item.quantity) > 0)
    .map((item) => ({
      key: `${item.key}:${item.productId}:${values.warehouseId}`,
      lineKey: item.key,
      productId: item.productId,
      warehouseId: values.warehouseId,
      requiredQuantity: formatQuantity(item.quantity)
    }));
}

export function getStockWarnings(
  values: DocumentFormValues,
  balances: BalanceSnapshot[],
  products: ProductDto[],
  warehouses: WarehouseDto[]
): StockWarning[] {
  return getRequiredStockChecks(values).flatMap((check) => {
    const balance = balances.find((item) =>
      item.productId === check.productId && item.warehouseId === check.warehouseId
    );
    const availableQuantity = balance?.quantity ?? "0.000";

    if (toNumber(availableQuantity) >= toNumber(check.requiredQuantity)) {
      return [];
    }

    return [{
      key: check.key,
      productLabel: productLabel(products, check.productId),
      warehouseLabel: warehouseLabel(warehouses, check.warehouseId),
      availableQuantity: formatQuantity(availableQuantity),
      requiredQuantity: check.requiredQuantity
    }];
  });
}
