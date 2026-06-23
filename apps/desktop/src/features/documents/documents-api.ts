import type {
  CounterpartyDto,
  CreateProductDto,
  CreateDraftDocumentDto,
  DocumentDto,
  ProductCategoryDto,
  ProductDto,
  StockBalanceResultDto,
  UpdateDraftDocumentPatchDto,
  WarehouseDto
} from "@quanti/shared";

import { apiClient } from "../../api/client";
import { saveBinaryExport } from "../../tauri-shell";

const jsonHeaders = { "Content-Type": "application/json" };

export const getDocuments = () => apiClient.request<DocumentDto[]>("/documents");
export const getStockBalance = (productId: string, warehouseId: string) => {
  const query = new URLSearchParams({ productId, warehouseId });
  return apiClient.request<StockBalanceResultDto>(`/stock/balance?${query.toString()}`);
};

export const getDocumentLookups = async () => {
  const [products, categories, warehouses, counterparties] = await Promise.all([
    apiClient.request<ProductDto[]>("/products"),
    apiClient.request<ProductCategoryDto[]>("/product-categories"),
    apiClient.request<WarehouseDto[]>("/warehouses"),
    apiClient.request<CounterpartyDto[]>("/counterparties")
  ]);

  return { products, categories, warehouses, counterparties };
};

export const createProduct = (payload: CreateProductDto) =>
  apiClient.request<ProductDto>("/products", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });

export const createDocument = (payload: CreateDraftDocumentDto) =>
  apiClient.request<DocumentDto>("/documents", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });

export const updateDocument = (id: string, payload: UpdateDraftDocumentPatchDto) =>
  apiClient.request<DocumentDto>(`/documents/${id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });

export const deleteDocument = (id: string) =>
  apiClient.request<void>(`/documents/${id}`, { method: "DELETE" });

export const postDocument = (id: string) =>
  apiClient.request<DocumentDto>(`/documents/${id}/post`, {
    method: "POST",
    headers: jsonHeaders,
    body: "{}"
  });

export const unpostDocument = (id: string) =>
  apiClient.request<DocumentDto>(`/documents/${id}/unpost`, {
    method: "POST",
    headers: jsonHeaders,
    body: "{}"
  });

export const repostDocument = (id: string) =>
  apiClient.request<DocumentDto>(`/documents/${id}/repost`, {
    method: "POST",
    headers: jsonHeaders,
    body: "{}"
  });

export const printDocument = (id: string) =>
  apiClient.requestBinary(`/documents/${id}/print`, {
    method: "POST",
    headers: jsonHeaders,
    body: "{}"
  });

export const downloadDocumentPdf = (data: ArrayBuffer, fileName: string) =>
  saveBinaryExport(fileName, data, "application/pdf");
