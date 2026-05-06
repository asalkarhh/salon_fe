import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

export function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("en-IN").format(value ?? 0);
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "dd MMM yyyy");
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "dd MMM yyyy, hh:mm a");
}

export function formatTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  return value.slice(0, 5);
}

export function labelize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
