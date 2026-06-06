import type { ApiErrorEnvelope } from "./contracts";
import { ApiError } from "./errors";

const DEFAULT_API_BASE_URL = "http://localhost:3100";

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
    let response: Response;

    try {
      response = await fetch(buildRequestUrl(this.baseUrl, path), init);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network request failed.";
      throw new ApiError(0, "NETWORK_ERROR", message);
    }

    if (!response.ok) {
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

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  private async readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }
}

export const apiClient = new ApiClient();
