import {
  Boxes,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings,
  type LucideIcon,
  ChartNoAxesColumnIncreasing
} from "lucide-react";

export interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const primaryNavigation: readonly NavigationItem[] = [
  { label: "Главная", path: "/dashboard", icon: LayoutDashboard },
  { label: "Справочники", path: "/products", icon: Boxes },
  { label: "Документы", path: "/documents", icon: FileText },
  { label: "Платежи", path: "/payments", icon: CreditCard },
  { label: "Отчёты", path: "/reports", icon: ChartNoAxesColumnIncreasing },
  { label: "Настройки", path: "/settings", icon: Settings }
];
