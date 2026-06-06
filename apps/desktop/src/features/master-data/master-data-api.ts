import { apiClient } from "../../api/client";
import type { MasterDataEntity, MasterDataResource } from "./master-data";

const jsonHeaders = {
  "Content-Type": "application/json"
};

export function getMasterData(resource: MasterDataResource) {
  return apiClient.request<MasterDataEntity[]>(`/${resource}`);
}

export function createMasterData(resource: MasterDataResource, payload: Record<string, unknown>) {
  return apiClient.request<MasterDataEntity>(`/${resource}`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
}

export function updateMasterData(
  resource: MasterDataResource,
  id: string,
  payload: Record<string, unknown>
) {
  return apiClient.request<MasterDataEntity>(`/${resource}/${id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
}

export function deactivateMasterData(resource: MasterDataResource, id: string) {
  return apiClient.request<void>(`/${resource}/${id}`, {
    method: "DELETE"
  });
}
