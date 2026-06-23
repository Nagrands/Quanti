import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../../api/client";
import type { ApiHealthSnapshot } from "../../api/contracts";
import { useI18n } from "../../i18n";

export function ApiHealthIndicator() {
  const { t } = useI18n();
  const healthQuery = useQuery({
    queryKey: ["api-health"],
    queryFn: () => apiClient.request<ApiHealthSnapshot>("/health"),
    staleTime: 30_000,
    refetchInterval: 60_000
  });

  const state = healthQuery.isPending
    ? { modifier: "loading", label: "Подключение к API" }
    : healthQuery.isError
      ? { modifier: "error", label: "API недоступен" }
      : { modifier: "success", label: "API подключён" };

  return (
    <div className={`api-status api-status--${state.modifier}`} role="status" aria-live="polite">
      <span className="api-status__dot" aria-hidden="true" />
      <span>{t(state.label)}</span>
    </div>
  );
}
