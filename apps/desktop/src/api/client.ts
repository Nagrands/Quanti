import type { ApiErrorEnvelope } from "./contracts";
import { ApiError } from "./errors";

const DEFAULT_API_BASE_URL = "http://localhost:3100";

export interface ApiBinaryResponse {
  data: ArrayBuffer;
  contentType: string;
  fileName: string | null;
}

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
}

function buildRequestUrl(baseUrl: string, path: string): string {
  const normalizedBaseUrl = `${baseUrl.replace(/\/+$/, "")}/`;
  const normalizedPath = path.replace(/^\/+/, "");

  return new URL(normalizedPath, normalizedBaseUrl).toString();
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (!value || typeof value !== "object" || !("error" in value)) {
    return false;
  }

  const error = (value as { error?: unknown }).error;

  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as Partial<ApiErrorEnvelope["error"]>;

  return (
    typeof candidate.code === "string"
    && (typeof candidate.message === "string" || (
      Array.isArray(candidate.message)
      && candidate.message.every((message) => typeof message === "string")
    ))
  );
}

function normalizeErrorMessage(message: string | string[]): string {
  return Array.isArray(message) ? message.join(", ") : message;
}

export class ApiClient {
  constructor(private readonly baseUrl = getApiBaseUrl()) {}

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetch(path, init);

    if (!response.ok) {
      await this.throwResponseError(response);
    }

    return this.readSuccessBody<T>(response);
  }

  async requestBinary(path: string, init?: RequestInit): Promise<ApiBinaryResponse> {
    const response = await this.fetch(path, init);

    if (!response.ok) {
      await this.throwResponseError(response);
    }

    return {
      data: await response.arrayBuffer(),
      contentType: response.headers.get("Content-Type") || "application/octet-stream",
      fileName: this.fileNameFromDisposition(response.headers.get("Content-Disposition"))
    };
  }

  private async fetch(path: string, init?: RequestInit) {
    try {
      return await fetch(buildRequestUrl(this.baseUrl, path), init);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network request failed.";
      throw new ApiError(0, "NETWORK_ERROR", message);
    }
  }

  private async throwResponseError(response: Response): Promise<never> {
    const body = await this.readJson(response);

    if (isApiErrorEnvelope(body)) {
      throw new ApiError(
        response.status,
        body.error.code,
        normalizeErrorMessage(body.error.message)
      );
    }

    throw new ApiError(
      response.status,
      "HTTP_ERROR",
      `Request failed with status ${response.status}.`
    );
  }

  private fileNameFromDisposition(disposition: string | null) {
    const match = disposition?.match(/filename="([^"]+)"/i);
    return match?.[1] ?? null;
  }

  private async readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  private async readSuccessBody<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }

    try {
      return await response.json() as T;
    } catch {
      return undefined as T;
    }
  }
}

export const apiClient = new ApiClient();
