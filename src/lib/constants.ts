import type { Role } from "@/types/enums";

export const APP_NAME = "Lustre Salon Cloud";
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8080";
console.log("API URL:", API_BASE_URL);
export const AUTH_STORAGE_KEY = "salon-fe-auth";

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  SALON_OWNER: "Salon Owner",
  STAFF: "Staff",
  CUSTOMER: "Customer",
};

export const FEATURE_LABELS: Record<string, string> = {
  APPOINTMENTS: "Appointments",
  BRANCHES: "Branches",
  CUSTOMERS: "Customers",
  DASHBOARD: "Dashboard",
  INVOICES: "Invoices",
  PAYMENTS: "Payments",
  PAYROLL: "Payroll",
  QUEUE: "Queue",
  REPORTS: "Reports",
  SERVICES: "Services",
  STAFF: "Staff",
  STAFF_EARNINGS: "Staff Earnings",
};
