import type {
  AppointmentStatus,
  PaymentMethod,
  PaymentStatus,
  QueueStatus,
  StaffCompensationType,
  SubscriptionStatus,
  UserStatus,
} from "@/types/enums";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  username: string;
  fullName: string;
  role: string;
  salonBusinessId: string | null;
  salonCode: string | null;
}

export interface CurrentUserResponse {
  userId: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  salonBusinessId: string | null;
  salonCode: string | null;
  status: UserStatus;
}

export interface CreateOwnerRequest {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  businessName: string;
  trialDays: number;
  planId: string;
}

export interface CreateOwnerResponse {
  ownerId: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  salonBusinessId: string;
  salonCode: string;
  salonName: string;
  branchId: string;
  branchName: string;
  subscriptionId: string;
  planId: string;
  subscriptionStatus: SubscriptionStatus;
  trialEndsOn: string;
}

export interface OwnerUpdateRequest {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  businessName: string;
}

export interface OwnerResponse {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  status: UserStatus;
  salonBusinessId: string;
  salonCode: string;
  businessName: string;
  salonActive: boolean;
  branchCount: number;
  subscriptionId: string | null;
  planId: string | null;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  trialEndsOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanFeatureResponse {
  id: string;
  planId: string;
  featureKey: string;
  featureName: string;
  featureValue: string | null;
  enabled: boolean;
}

export interface PlanRequest {
  name: string;
  description?: string | null;
  monthlyPrice: number;
  yearlyPrice?: number | null;
  maxBranches?: number | null;
  maxStaff?: number | null;
  active?: boolean | null;
}

export interface PlanResponse {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number | null;
  maxBranches: number | null;
  maxStaff: number | null;
  active: boolean;
  features: PlanFeatureResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionRequest {
  salonBusinessId: string;
  planId: string;
  status?: SubscriptionStatus | null;
  startDate: string;
  endDate?: string | null;
  trialEndsOn?: string | null;
  billingAmount?: number | null;
  autoRenew?: boolean | null;
}

export interface SubscriptionStatusUpdateRequest {
  status: SubscriptionStatus;
  endDate?: string | null;
  trialEndsOn?: string | null;
  billingAmount?: number | null;
  autoRenew?: boolean | null;
}

export interface SubscriptionResponse {
  id: string;
  salonBusinessId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  trialEndsOn: string | null;
  billingAmount: number | null;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureAccessItemRequest {
  featureKey: string;
  featureName: string;
  featureValue?: string | null;
  enabled?: boolean | null;
}

export interface SalonFeatureAccessUpdateRequest {
  features: FeatureAccessItemRequest[];
}

export interface FeatureAccessItemResponse {
  featureKey: string;
  featureName: string;
  planFeatureValue: string | null;
  planEnabled: boolean | null;
  overrideFeatureValue: string | null;
  overrideEnabled: boolean | null;
  effectiveFeatureValue: string | null;
  effectiveEnabled: boolean | null;
  overridden: boolean;
}

export interface SalonFeatureAccessResponse {
  salonBusinessId: string;
  salonCode: string;
  salonName: string;
  planId: string;
  planName: string;
  features: FeatureAccessItemResponse[];
}

export interface UpdateSalonBusinessRequest {
  businessName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
}

export interface SalonBusinessResponse {
  id: string;
  salonCode: string;
  ownerId: string;
  ownerUsername: string;
  ownerName: string;
  businessName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface BranchCreateRequest {
  branchName: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

export interface BranchUpdateRequest extends BranchCreateRequest {}

export interface BranchResponse {
  id: string;
  salonBusinessId: string;
  salonName: string;
  salonCode: string;
  branchName: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ServiceCategoryRequest {
  salonBusinessId?: string | null;
  name: string;
  description?: string | null;
  displayOrder?: number | null;
  active?: boolean | null;
}

export interface ServiceCategoryResponse {
  id: string;
  salonBusinessId: string;
  name: string;
  description: string | null;
  displayOrder: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequest {
  salonBusinessId?: string | null;
  serviceCategoryId: string;
  name: string;
  description?: string | null;
  price: number;
  durationMinutes: number;
  active?: boolean | null;
}

export interface ServiceResponse {
  id: string;
  salonBusinessId: string;
  serviceCategoryId: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRequest {
  userId?: string | null;
  salonBusinessId?: string | null;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
}

export interface CustomerResponse {
  id: string;
  userId: string | null;
  salonBusinessId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string;
  gender: string | null;
  dateOfBirth: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffRequest {
  userId?: string | null;
  fullName?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  password?: string | null;
  salonBusinessId?: string | null;
  branchId?: string | null;
  displayName: string;
  designation?: string | null;
  bio?: string | null;
  baseSalary?: number | null;
  revenueSharePercentage?: number | null;
  commissionPercentage?: number | null;
  hourlyRate?: number | null;
  hireDate?: string | null;
  compensationType?: StaffCompensationType | null;
  active?: boolean | null;
}

export interface StaffResponse {
  id: string;
  staffCode: string;
  userId: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  salonBusinessId: string;
  salonName: string;
  salonCode: string;
  branchId: string | null;
  branchName: string | null;
  displayName: string;
  designation: string | null;
  bio: string | null;
  baseSalary: number | null;
  revenueSharePercentage: number | null;
  commissionPercentage: number | null;
  hourlyRate: number | null;
  compensationType: StaffCompensationType | null;
  hireDate: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentServiceRequest {
  serviceId: string;
  price: number;
  durationMinutes: number;
}

export interface AppointmentRequest {
  salonBusinessId?: string | null;
  branchId: string;
  customerProfileId: string;
  staffProfileId: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string | null;
  status?: AppointmentStatus | null;
  notes?: string | null;
  services?: AppointmentServiceRequest[] | null;
}

export interface AppointmentServiceResponse {
  id: string;
  appointmentId: string;
  serviceId: string;
  price: number;
  durationMinutes: number;
}

export interface AppointmentResponse {
  id: string;
  salonBusinessId: string;
  branchId: string;
  customerProfileId: string;
  staffProfileId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  services: AppointmentServiceResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentStatusUpdateRequest {
  status: AppointmentStatus;
}

export interface QueueTokenCreateRequest {
  salonBusinessId?: string | null;
  branchId: string;
  customerProfileId: string;
  tokenDate?: string | null;
}

export interface QueueTokenStatusUpdateRequest {
  status: QueueStatus;
}

export interface QueueTokenResponse {
  id: string;
  salonBusinessId: string;
  branchId: string;
  customerProfileId: string;
  tokenNumber: number;
  tokenDate: string;
  status: QueueStatus;
  checkedInAt: string | null;
  calledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItemRequest {
  serviceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number | null;
}

export interface InvoiceRequest {
  salonBusinessId?: string | null;
  branchId: string;
  appointmentId?: string | null;
  customerProfileId: string;
  invoiceNumber?: string | null;
  invoiceDate: string;
  subtotalAmount?: number | null;
  taxAmount?: number | null;
  discountAmount?: number | null;
  totalAmount?: number | null;
  paymentStatus?: PaymentStatus | null;
  items?: InvoiceItemRequest[] | null;
}

export interface InvoiceItemResponse {
  id: string;
  invoiceId: string;
  serviceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceResponse {
  id: string;
  salonBusinessId: string;
  branchId: string;
  appointmentId: string | null;
  customerProfileId: string;
  invoiceNumber: string;
  invoiceDate: string;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  items: InvoiceItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRequest {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status?: PaymentStatus | null;
  transactionReference?: string | null;
  paidAt?: string | null;
}

export interface PaymentResponse {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionReference: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffEarningResponse {
  id: string;
  salonBusinessId: string;
  salonName: string;
  salonCode: string;
  staffProfileId: string;
  staffCode: string;
  staffDisplayName: string;
  branchId: string | null;
  branchName: string | null;
  appointmentId: string;
  invoiceId: string;
  serviceId: string;
  serviceName: string;
  commissionPercentage: number;
  grossAmount: number;
  earningAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalonDashboardSummaryResponse {
  salonBusinessId: string;
  salonCode: string;
  salonName: string;
  ownerName: string;
  ownerUsername: string;
  active: boolean;
  currentPlanName: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  currentMonthRevenue: number;
  staffCount: number;
  customerCount: number;
  todayAppointments: number;
}

export interface SuperAdminDashboardResponse {
  totalSalons: number;
  activeSalons: number;
  inactiveSalons: number;
  activeMemberships: number;
  trialMemberships: number;
  inactiveMemberships: number;
  suspendedMemberships: number;
  expiredMemberships: number;
  totalOwners: number;
  totalStaff: number;
  totalCustomers: number;
  todayRevenue: number;
  currentMonthRevenue: number;
  salons: SalonDashboardSummaryResponse[];
}

export interface StaffPerformanceResponse {
  staffId: string;
  staffCode: string;
  staffName: string;
  compensationType: StaffCompensationType;
  monthAppointmentsHandled: number;
  monthRevenueGenerated: number;
  monthCommissionEarned: number;
  estimatedMonthlyPayout: number;
}

export interface OwnerDashboardResponse {
  salonBusinessId: string;
  salonCode: string;
  salonName: string;
  todayRevenue: number;
  currentMonthRevenue: number;
  todayCustomersServed: number;
  monthCustomersServed: number;
  totalStaff: number;
  activeStaff: number;
  todayAppointments: number;
  monthAppointments: number;
  staffPerformance: StaffPerformanceResponse[];
}

export interface PayrollStaffSummaryResponse {
  staffId: string;
  staffCode: string;
  staffName: string;
  compensationType: StaffCompensationType;
  fixedSalary: number;
  revenueSharePercentage: number;
  commissionPercentage: number;
  revenueGenerated: number;
  commissionEarned: number;
  totalPayout: number;
  appointmentsHandled: number;
}

export interface PayrollSummaryResponse {
  salonBusinessId: string;
  salonCode: string;
  year: number;
  month: number;
  totalPayroll: number;
  staff: PayrollStaffSummaryResponse[];
}

export interface BackendErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  requestId?: string;
  validationErrors?: Record<string, string> | null;
}
