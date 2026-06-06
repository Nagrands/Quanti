import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../../api/client";
import type { ApiHealthSnapshot } from "../../api/contracts";

export function ApiHealthIndicator() {
  const healthQuery = useQuery({
    queryKey: ["api-health"],
    queryFn: () => apiClient.request<ApiHealthSnapshot>("/health"),
    staleTime: 30_000,
    refetchInterval: 60_000
  });

  const state = healthQuery.isPending
    ? { modifier: "loading", label: "Connecting to API" }
    : healthQuery.isError
      ? { modifier: "error", label: "API unavailable" }
      : { modifier: "success", label: "API connected" };

  return (
    <div className={`api-status api-status--${state.modifier}`} role="status" aria-live="polite">
      <span className="api-status__dot" aria-hidden="true" />
      <span>{state.label}</span>
    </div>
  );
}
