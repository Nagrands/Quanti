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
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Products", path: "/products", icon: Boxes },
  { label: "Documents", path: "/documents", icon: FileText },
  { label: "Payments", path: "/payments", icon: CreditCard },
  { label: "Reports", path: "/reports", icon: ChartNoAxesColumnIncreasing },
  { label: "Settings", path: "/settings", icon: Settings }
];
