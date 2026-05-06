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
import { routes } from "@/config/routes";
import type { Role } from "@/types/enums";

export interface MenuItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles: Role[];
}

export const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    to: routes.dashboard,
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "SALON_OWNER", "STAFF", "CUSTOMER"],
  },
  {
    label: "Salons",
    to: routes.salons,
    icon: Store,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "My Salon",
    to: routes.mySalon,
    icon: Building2,
    roles: ["SALON_OWNER"],
  },
  {
    label: "Create Owner",
    to: routes.createOwner,
    icon: Crown,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Plans",
    to: routes.plans,
    icon: Sparkles,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Subscriptions",
    to: routes.subscriptions,
    icon: ClipboardList,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Feature Access",
    to: routes.featureAccess,
    icon: ShieldCheck,
    roles: ["SUPER_ADMIN", "SALON_OWNER"],
  },
  {
    label: "Branches",
    to: routes.branches,
    icon: ScanLine,
    roles: ["SALON_OWNER"],
  },
  {
    label: "Service Categories",
    to: routes.serviceCategories,
    icon: Settings2,
    roles: ["SALON_OWNER"],
  },
  {
    label: "Services",
    to: routes.services,
    icon: Scissors,
    roles: ["SUPER_ADMIN", "SALON_OWNER"],
  },
  {
    label: "Customers",
    to: routes.customers,
    icon: Users,
    roles: ["SUPER_ADMIN", "SALON_OWNER", "STAFF"],
  },
  {
    label: "Staff",
    to: routes.staff,
    icon: UserCog,
    roles: ["SUPER_ADMIN", "SALON_OWNER"],
  },
  {
    label: "Appointments",
    to: routes.appointments,
    icon: CalendarClock,
    roles: ["SUPER_ADMIN", "SALON_OWNER", "STAFF", "CUSTOMER"],
  },
  {
    label: "Queue Tokens",
    to: routes.queueTokens,
    icon: Ticket,
    roles: ["SUPER_ADMIN", "SALON_OWNER", "STAFF"],
  },
  {
    label: "Invoices",
    to: routes.invoices,
    icon: WalletCards,
    roles: ["SUPER_ADMIN", "SALON_OWNER", "STAFF"],
  },
  {
    label: "Payments",
    to: routes.payments,
    icon: CreditCard,
    roles: ["SUPER_ADMIN", "SALON_OWNER", "STAFF"],
  },
  {
    label: "Staff Earnings",
    to: routes.staffEarnings,
    icon: CircleDollarSign,
    roles: ["SUPER_ADMIN", "SALON_OWNER"],
  },
  {
    label: "My Earnings",
    to: routes.myEarnings,
    icon: BadgeIndianRupee,
    roles: ["STAFF"],
  },
  {
    label: "Payroll",
    to: routes.payroll,
    icon: ListTodo,
    roles: ["SALON_OWNER"],
  },
];
