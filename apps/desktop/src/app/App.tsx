import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "../components/layout/AppLayout";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { DocumentsPage } from "../features/documents/DocumentsPage";
import { MasterDataPage } from "../features/master-data/MasterDataPage";
import { ModulePlaceholderPage } from "../features/placeholders/ModulePlaceholderPage";
import { NotFoundPage } from "../features/placeholders/NotFoundPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<MasterDataPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route
          path="/payments"
          element={<ModulePlaceholderPage title="Payments" description="Payment and allocation workflows will be managed here." />}
        />
        <Route
          path="/reports"
          element={<ModulePlaceholderPage title="Reports" description="Ledger-based operational and financial reports will appear here." />}
        />
        <Route
          path="/settings"
          element={<ModulePlaceholderPage title="Settings" description="Application and workspace settings will be configured here." />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
