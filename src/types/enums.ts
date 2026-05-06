export type Role = "SUPER_ADMIN" | "SALON_OWNER" | "STAFF" | "CUSTOMER";

export type AppointmentStatus =
  | "BOOKED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type PaymentMethod = "CASH" | "CARD" | "UPI" | "ONLINE";

export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "PARTIAL"
  | "FAILED"
  | "REFUNDED";

export type QueueStatus =
  | "WAITING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "EXPIRED"
  | "CANCELLED";

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type StaffCompensationType =
  | "FIXED_SALARY"
  | "REVENUE_PERCENTAGE"
  | "FIXED_PLUS_COMMISSION";
