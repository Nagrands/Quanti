import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useState } from "react";
import { HashRouter } from "react-router-dom";
import { I18nProvider } from "../i18n";
import { ThemeProvider } from "../theme";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false
      }
    }
  }));

  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <HashRouter>{children}</HashRouter>
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
