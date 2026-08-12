import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import { AppProviders } from "./app/AppProviders";
import { RuntimeGate } from "./app/RuntimeGate";
import "./styles/main.scss";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Quanti root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <RuntimeGate><App /></RuntimeGate>
    </AppProviders>
  </StrictMode>
);
