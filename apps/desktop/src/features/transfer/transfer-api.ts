import type {
  ApplyImportResult,
  ImportPreviewResult,
  ImportResolution,
  QuantiTransferPackage,
  TransferSection
} from "@quanti/shared";

import { apiClient } from "../../api/client";

const jsonHeaders = { "Content-Type": "application/json" };
export type DataTransferSection = Exclude<TransferSection, "report-snapshot">;

export function exportSection(section: DataTransferSection) {
  return apiClient.request<QuantiTransferPackage>(`/transfer/${section}/export`);
}

export function previewImport(transferPackage: QuantiTransferPackage) {
  return apiClient.request<ImportPreviewResult>("/transfer/import/preview", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ package: transferPackage })
  });
}

export function applyImport(transferPackage: QuantiTransferPackage, resolutions: Record<string, ImportResolution>) {
  return apiClient.request<ApplyImportResult>("/transfer/import/apply", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ package: transferPackage, resolutions })
  });
}
