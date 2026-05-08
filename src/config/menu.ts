import type { LucideIcon } from "lucide-react";
import {
  BadgeIndianRupee,
  Building2,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Crown,
  LayoutDashboard,
  ListTodo,
  ScanLine,
  Scissors,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  Ticket,
  UserCog,
  Users,
  WalletCards,
} from "lucide-react";
import { getResourceUiRoles, pageUiAccess } from "@/config/access";
import { routes } from "@/config/routes";
import type { Role } from "@/types/enums";

export interface MenuItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles: readonly Role[];
}

export const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    to: routes.dashboard,
    icon: LayoutDashboard,
    roles: pageUiAccess.dashboard,
  },
  {
    label: "Salons",
    to: routes.salons,
    icon: Store,
    roles: getResourceUiRoles("salons", "list"),
  },
  {
    label: "My Salon",
    to: routes.mySalon,
    icon: Building2,
    roles: pageUiAccess.mySalon,
  },
  {
    label: "Owners",
    to: routes.owners,
    icon: Crown,
    roles: pageUiAccess.owners,
  },
  {
    label: "Plans",
    to: routes.plans,
    icon: Sparkles,
    roles: getResourceUiRoles("plans", "list"),
  },
  {
    label: "Subscriptions",
    to: routes.subscriptions,
    icon: ClipboardList,
    roles: getResourceUiRoles("subscriptions", "list"),
  },
  {
    label: "Feature Access",
    to: routes.featureAccess,
    icon: ShieldCheck,
    roles: pageUiAccess.featureAccess,
  },
  {
    label: "Branches",
    to: routes.branches,
    icon: ScanLine,
    roles: getResourceUiRoles("branches", "list"),
  },
  {
    label: "Service Categories",
    to: routes.serviceCategories,
    icon: Settings2,
    roles: getResourceUiRoles("serviceCategories", "list"),
  },
  {
    label: "Services",
    to: routes.services,
    icon: Scissors,
    roles: getResourceUiRoles("services", "list"),
  },
  {
    label: "Customers",
    to: routes.customers,
    icon: Users,
    roles: getResourceUiRoles("customers", "list"),
  },
  {
    label: "Staff",
    to: routes.staff,
    icon: UserCog,
    roles: getResourceUiRoles("staff", "list"),
  },
  {
    label: "Appointments",
    to: routes.appointments,
    icon: CalendarClock,
    roles: pageUiAccess.appointmentCreate,
  },
  {
    label: "Queue Tokens",
    to: routes.queueTokens,
    icon: Ticket,
    roles: pageUiAccess.queueTokenCreate,
  },
  {
    label: "Invoices",
    to: routes.invoices,
    icon: WalletCards,
    roles: pageUiAccess.invoiceCreate,
  },
  {
    label: "Payments",
    to: routes.payments,
    icon: CreditCard,
    roles: getResourceUiRoles("payments", "create"),
  },
  {
    label: "Staff Earnings",
    to: routes.staffEarnings,
    icon: CircleDollarSign,
    roles: pageUiAccess.staffEarnings,
  },
  {
    label: "My Earnings",
    to: routes.myEarnings,
    icon: BadgeIndianRupee,
    roles: pageUiAccess.myEarnings,
  },
  {
    label: "Payroll",
    to: routes.payroll,
    icon: ListTodo,
    roles: pageUiAccess.payroll,
  },
];
