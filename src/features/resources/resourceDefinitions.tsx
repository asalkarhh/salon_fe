import { z } from "zod";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { api } from "@/lib/api";
import { toSalonSelectOption } from "@/lib/select-options";
import { formatCurrency, formatDate, formatDateTime, labelize } from "@/lib/utils";
import { routes } from "@/config/routes";
import { SubscriptionStatusActions } from "@/features/subscriptions/SubscriptionStatusActions";
import type {
  BranchCreateRequest,
  BranchResponse,
  CustomerRequest,
  CustomerResponse,
  PaymentRequest,
  PaymentResponse,
  PlanRequest,
  PlanResponse,
  SalonBusinessResponse,
  ServiceCategoryRequest,
  ServiceCategoryResponse,
  ServiceRequest,
  ServiceResponse,
  StaffRequest,
  StaffResponse,
  SubscriptionRequest,
  SubscriptionResponse,
  UpdateSalonBusinessRequest,
} from "@/types/api";
import type { Role } from "@/types/enums";
import type { LookupDefinition, ResourceDefinition } from "@/features/resources/resource-types";

const emptyToUndefined = <T,>(schema: z.ZodType<T>) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const optionalString = () => emptyToUndefined(z.string().trim());
const optionalEmail = () => emptyToUndefined(z.string().trim().email("Enter a valid email"));
const optionalNumber = () => z.preprocess((value) => (value === "" ? undefined : value), z.number().optional());

const subscriptionStatusOptions = [
  "TRIAL",
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "EXPIRED",
  "CANCELLED",
].map((status) => ({ label: labelize(status), value: status }));

const compensationTypeOptions = [
  "FIXED_SALARY",
  "REVENUE_PERCENTAGE",
  "FIXED_PLUS_COMMISSION",
].map((status) => ({ label: labelize(status), value: status }));

const paymentMethodOptions = ["CASH", "CARD", "UPI", "ONLINE"].map((method) => ({
  label: method,
  value: method,
}));

const customerGenderOptions = ["Male", "Female"].map((gender) => ({
  label: gender,
  value: gender,
}));

const paymentStatusOptions = [
  "PENDING",
  "PAID",
  "PARTIAL",
  "FAILED",
  "REFUNDED",
].map((status) => ({ label: labelize(status), value: status }));

function cleanPayload<T>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  ) as Record<string, unknown>;
}

function lookupOption<T extends { id: string }>(
  item: T,
  label: string,
) {
  return {
    label,
    value: item.id,
  };
}

const salonLookup: LookupDefinition<SalonBusinessResponse> = {
  key: "salons",
  queryKey: () => ["lookup", "salons"],
  queryFn: async () => (await api.get<SalonBusinessResponse[]>("/api/salons")).data,
  enabled: ({ user }) => user.role === "SUPER_ADMIN",
  toOption: toSalonSelectOption,
};

const planLookup: LookupDefinition<PlanResponse> = {
  key: "plans",
  queryKey: () => ["lookup", "plans"],
  queryFn: async () => (await api.get<PlanResponse[]>("/api/subscriptions/plans")).data,
  toOption: (item) => lookupOption(item, `${item.name} â€¢ ${formatCurrency(item.monthlyPrice)}`),
};

const branchLookup: LookupDefinition<BranchResponse> = {
  key: "branches",
  queryKey: (context) => [
    "lookup",
    "branches",
    context.user.role,
    context.values.salonBusinessId,
    context.filters.salonBusinessId,
  ],
  queryFn: async (context) => {
    const salonBusinessId = String(
      context.values.salonBusinessId ?? context.filters.salonBusinessId ?? "",
    );
    const params = salonBusinessId ? { salonBusinessId } : undefined;
    return (await api.get<BranchResponse[]>("/api/branches", { params })).data;
  },
  toOption: (item) => ({
    label: item.branchName,
    value: item.id,
    description: item.salonName ? `${item.salonName} (${item.salonCode})` : undefined,
    keywords: [item.salonName, item.salonCode].filter(Boolean) as string[],
  }),
};

const categoryLookup: LookupDefinition<ServiceCategoryResponse> = {
  key: "serviceCategories",
  queryKey: (context) => [
    "lookup",
    "service-categories",
    context.user.role,
    context.values.salonBusinessId,
    context.filters.salonBusinessId,
  ],
  queryFn: async (context) => {
    const salonBusinessId = String(
      context.values.salonBusinessId ?? context.filters.salonBusinessId ?? "",
    );
    const params = salonBusinessId ? { salonBusinessId } : undefined;
    return (await api.get<ServiceCategoryResponse[]>("/api/services/categories", { params })).data;
  },
  toOption: (item) => lookupOption(item, item.name),
};

function normalizeCustomerGender(gender?: string | null) {
  if (!gender) {
    return "";
  }
  const normalized = gender.trim().toLowerCase();
  if (normalized === "male") {
    return "Male";
  }
  if (normalized === "female") {
    return "Female";
  }
  return gender;
}

export const serviceLookup: LookupDefinition<ServiceResponse> = {
  key: "services",
  queryKey: (context) => [
    "lookup",
    "services",
    context.user.role,
    context.values.salonBusinessId,
    context.filters.salonBusinessId,
  ],
  queryFn: async (context) => {
    const salonBusinessId = String(
      context.values.salonBusinessId ?? context.filters.salonBusinessId ?? "",
    );
    const params =
      context.user.role === "SUPER_ADMIN" && salonBusinessId
        ? { salonBusinessId }
        : undefined;
    return (await api.get<ServiceResponse[]>("/api/services", { params })).data;
  },
  toOption: (item) => lookupOption(item, `${item.name} â€¢ ${formatCurrency(item.price)}`),
};

export const customerLookup: LookupDefinition<CustomerResponse> = {
  key: "customers",
  queryKey: () => ["lookup", "customers"],
  queryFn: async () => (await api.get<CustomerResponse[]>("/api/customers")).data,
  toOption: (item) => lookupOption(item, `${item.firstName} ${item.lastName ?? ""}`.trim()),
};

export const staffLookup: LookupDefinition<StaffResponse> = {
  key: "staff",
  queryKey: (context) => [
    "lookup",
    "staff",
    context.user.role,
    context.values.salonBusinessId,
    context.filters.salonBusinessId,
    context.values.branchId,
    context.filters.branchId,
  ],
  queryFn: async (context) => {
    const salonBusinessId = String(
      context.values.salonBusinessId ?? context.filters.salonBusinessId ?? "",
    );
    const branchId = String(context.values.branchId ?? context.filters.branchId ?? "");
    const params = {
      ...(salonBusinessId ? { salonBusinessId } : {}),
      ...(branchId ? { branchId } : {}),
    };
    return (await api.get<StaffResponse[]>("/api/staff", { params })).data;
  },
  toOption: (item) => ({
    label: `${item.displayName}${item.staffCode ? ` (${item.staffCode})` : ""}`,
    value: item.id,
    description: [item.branchName, item.salonName].filter(Boolean).join(" / ") || undefined,
    keywords: [item.fullName, item.email, item.phone, item.branchName, item.salonName].filter(Boolean) as string[],
  }),
};

const invoiceLookup: LookupDefinition<{ id: string; invoiceNumber: string }> = {
  key: "invoices",
  queryKey: () => ["lookup", "invoices"],
  queryFn: async () => (await api.get<{ id: string; invoiceNumber: string }[]>("/api/invoices")).data,
  toOption: (item) => lookupOption(item, item.invoiceNumber),
};

const salonSchema = () =>
  z.object({
    businessName: z.string().trim().min(1, "Business name is required"),
    email: optionalEmail(),
    phone: optionalString(),
    address: optionalString(),
    city: optionalString(),
    state: optionalString(),
    country: optionalString(),
    pincode: optionalString(),
  });

const planSchema = () =>
  z.object({
    name: z.string().trim().min(1, "Plan name is required"),
    description: optionalString(),
    monthlyPrice: z.number().min(0, "Monthly price must be zero or more"),
    yearlyPrice: optionalNumber(),
    maxBranches: optionalNumber(),
    maxStaff: optionalNumber(),
    active: z.boolean().default(true),
  });

const subscriptionSchema = () =>
  z.object({
    salonBusinessId: z.string().trim().min(1, "Salon is required"),
    planId: z.string().trim().min(1, "Plan is required"),
    status: z.string().trim().optional(),
    startDate: z.string().trim().min(1, "Start date is required"),
    endDate: optionalString(),
    trialEndsOn: optionalString(),
    billingAmount: optionalNumber(),
    autoRenew: z.boolean().default(true),
  });

const branchSchema = () =>
  z.object({
    branchName: z.string().trim().min(1, "Branch name is required"),
    phone: optionalString(),
    address: optionalString(),
    city: optionalString(),
    state: optionalString(),
    pincode: optionalString(),
  });

const serviceCategorySchema = () =>
  z.object({
    salonBusinessId: optionalString(),
    name: z.string().trim().min(1, "Category name is required"),
    description: optionalString(),
    displayOrder: optionalNumber(),
    active: z.boolean().default(true),
  });

const serviceSchema = () =>
  z.object({
    salonBusinessId: optionalString(),
    serviceCategoryId: z.string().trim().min(1, "Category is required"),
    name: z.string().trim().min(1, "Service name is required"),
    description: optionalString(),
    price: z.number().min(0, "Price must be zero or more"),
    durationMinutes: z.number().min(0, "Duration must be zero or more"),
    active: z.boolean().default(true),
  });

const customerSchema = () =>
  z.object({
    salonBusinessId: optionalString(),
    branchId: z.string().trim().min(1, "Branch is required"),
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: optionalString(),
    email: optionalEmail(),
    phone: z.string().trim().min(1, "Phone is required"),
    gender: optionalString(),
    dateOfBirth: optionalString(),
    notes: optionalString(),
  });

const staffCreateSchema = () =>
  z.object({
    fullName: z.string().trim().min(1, "Full name is required"),
    username: optionalString(),
    email: z.string().trim().email("Valid email is required"),
    phone: optionalString(),
    password: z.string().trim().min(1, "Password is required"),
    branchId: optionalString(),
    displayName: z.string().trim().min(1, "Display name is required"),
    designation: optionalString(),
    bio: optionalString(),
    baseSalary: optionalNumber(),
    revenueSharePercentage: optionalNumber(),
    commissionPercentage: optionalNumber(),
    hourlyRate: optionalNumber(),
    hireDate: optionalString(),
    compensationType: optionalString(),
    active: z.boolean().default(true),
  });

const staffEditSchema = () =>
  z.object({
    fullName: optionalString(),
    username: optionalString(),
    email: optionalEmail(),
    phone: optionalString(),
    password: optionalString(),
    branchId: optionalString(),
    displayName: z.string().trim().min(1, "Display name is required"),
    designation: optionalString(),
    bio: optionalString(),
    baseSalary: optionalNumber(),
    revenueSharePercentage: optionalNumber(),
    commissionPercentage: optionalNumber(),
    hourlyRate: optionalNumber(),
    hireDate: optionalString(),
    compensationType: optionalString(),
    active: z.boolean().default(true),
  });

const paymentSchema = () =>
  z.object({
    invoiceId: z.string().trim().min(1, "Invoice is required"),
    amount: z.number().min(0, "Amount must be zero or more"),
    paymentMethod: z.string().trim().min(1, "Payment method is required"),
    status: optionalString(),
    transactionReference: optionalString(),
    paidAt: optionalString(),
  });

function detailCard(title: string, lines: React.ReactNode[]) {
  return (
    <Card className="h-full">
      <CardContent className="space-y-2 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{title}</p>
        {lines.map((line, index) => (
          <div key={index} className="text-sm text-foreground">
            {line}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export const resourceRegistry = {
  salons: {
    key: "salons",
    title: "Salons",
    singular: "Salon",
    description: "Platform-wide salon directory, status management, and owner-linked business details.",
    roles: ["SUPER_ADMIN"] satisfies Role[],
    editRoles: ["SUPER_ADMIN"] satisfies Role[],
    listPath: routes.salons,
    detailPath: (id) => `${routes.salons}/${id}`,
    editPath: (id) => `${routes.salons}/${id}/edit`,
    schema: salonSchema,
    defaultValues: () => ({
      businessName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
    }),
    toPayload: (values) => cleanPayload(values as UpdateSalonBusinessRequest),
    toFormValues: (record) => ({
      businessName: record.businessName,
      email: record.email ?? "",
      phone: record.phone ?? "",
      address: record.address ?? "",
      city: record.city ?? "",
      state: record.state ?? "",
      country: record.country ?? "",
      pincode: record.pincode ?? "",
    }),
    fields: [
      { name: "businessName", label: "Business name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "address", label: "Address", type: "textarea", gridSpan: 2 },
      { name: "city", label: "City", type: "text" },
      { name: "state", label: "State", type: "text" },
      { name: "country", label: "Country", type: "text" },
      { name: "pincode", label: "Pincode", type: "text" },
    ],
    listQuery: async () => (await api.get<SalonBusinessResponse[]>("/api/salons")).data,
    getQuery: async (id) => (await api.get<SalonBusinessResponse>(`/api/salons/${id}`)).data,
    updateMutation: async (id, payload) =>
      (await api.put<SalonBusinessResponse>(`/api/salons/${id}`, payload)).data,
    activateMutation: async (id) => (await api.patch(`/api/salons/${id}/activate`)).data,
    deactivateMutation: async (id) => (await api.patch(`/api/salons/${id}/suspend`)).data,
    toggleActive: {
      isActive: (record) => record.isActive,
      activeLabel: "Activate",
      inactiveLabel: "Suspend",
    },
    columns: () => [
      {
        id: "businessName",
        header: "Salon",
        cell: (record) => (
          <div>
            <p className="font-semibold">{record.businessName}</p>
            <p className="text-xs text-muted-foreground">{record.salonCode}</p>
          </div>
        ),
        sortingValue: (record) => record.businessName,
      },
      {
        id: "owner",
        header: "Owner",
        cell: (record) => (
          <div>
            <p>{record.ownerName}</p>
            <p className="text-xs text-muted-foreground">{record.ownerUsername}</p>
          </div>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        cell: (record) => (
          <div className="space-y-1">
            <p>{record.email ?? "â€”"}</p>
            <p className="text-xs text-muted-foreground">{record.phone ?? "â€”"}</p>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (record) => <StatusBadge status={record.isActive ? "ACTIVE" : "SUSPENDED"} />,
      },
    ],
    mobileCard: (record) =>
      detailCard(record.businessName, [
        <span key="code">{record.salonCode}</span>,
        <span key="owner">Owner: {record.ownerName}</span>,
        <StatusBadge key="status" status={record.isActive ? "ACTIVE" : "SUSPENDED"} />,
      ]),
    detailFields: () => [
      { label: "Salon Code", value: (record) => record.salonCode },
      { label: "Business Name", value: (record) => record.businessName },
      { label: "Owner", value: (record) => `${record.ownerName} (${record.ownerUsername})` },
      { label: "Email", value: (record) => record.email ?? "â€”" },
      { label: "Phone", value: (record) => record.phone ?? "â€”" },
      { label: "Address", value: (record) => record.address ?? "â€”" },
      { label: "City", value: (record) => record.city ?? "â€”" },
      { label: "State", value: (record) => record.state ?? "â€”" },
      { label: "Country", value: (record) => record.country ?? "â€”" },
      { label: "Pincode", value: (record) => record.pincode ?? "â€”" },
      { label: "Status", value: (record) => <StatusBadge status={record.isActive ? "ACTIVE" : "SUSPENDED"} /> },
      { label: "Created", value: (record) => formatDateTime(record.createdAt) },
    ],
    detailExtra: (record, _helpers, user) =>
      user.role === "SUPER_ADMIN" ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Support Views</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Open salon-scoped, read-only operational views for support without exposing those modules in the main superadmin navigation.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link to={`${routes.appointments}?salonBusinessId=${record.id}`}>Appointments</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`${routes.queueTokens}?salonBusinessId=${record.id}`}>Queue Tokens</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`${routes.invoices}?salonBusinessId=${record.id}`}>Invoices</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`${routes.payments}?salonBusinessId=${record.id}`}>Payments</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null,
    searchValues: (record) => [record.businessName, record.salonCode, record.ownerName, record.ownerUsername],
  } satisfies ResourceDefinition<SalonBusinessResponse, UpdateSalonBusinessRequest>,
  plans: {
    key: "plans",
    title: "Plans",
    singular: "Plan",
    description: "Subscription plan catalog used by superadmin when onboarding and managing salon memberships.",
    roles: ["SUPER_ADMIN"] satisfies Role[],
    createRoles: ["SUPER_ADMIN"] satisfies Role[],
    editRoles: ["SUPER_ADMIN"] satisfies Role[],
    listPath: routes.plans,
    createPath: `${routes.plans}/new`,
    detailPath: (id) => `${routes.plans}/${id}`,
    editPath: (id) => `${routes.plans}/${id}/edit`,
    schema: planSchema,
    defaultValues: () => ({
      name: "",
      description: "",
      monthlyPrice: 0,
      yearlyPrice: undefined,
      maxBranches: undefined,
      maxStaff: undefined,
      active: true,
    }),
    toPayload: (values) => cleanPayload(values as PlanRequest),
    toFormValues: (record) => ({
      name: record.name,
      description: record.description ?? "",
      monthlyPrice: record.monthlyPrice,
      yearlyPrice: record.yearlyPrice ?? undefined,
      maxBranches: record.maxBranches ?? undefined,
      maxStaff: record.maxStaff ?? undefined,
      active: record.active,
    }),
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "description", label: "Description", type: "textarea", gridSpan: 2 },
      { name: "monthlyPrice", label: "Monthly Price", type: "currency" },
      { name: "yearlyPrice", label: "Yearly Price", type: "currency" },
      { name: "maxBranches", label: "Max Branches", type: "number" },
      { name: "maxStaff", label: "Max Staff", type: "number" },
      { name: "active", label: "Active", type: "checkbox", gridSpan: 2 },
    ],
    listQuery: async () => (await api.get<PlanResponse[]>("/api/subscriptions/plans")).data,
    getQuery: async (id) => (await api.get<PlanResponse>(`/api/subscriptions/plans/${id}`)).data,
    createMutation: async (payload) =>
      (await api.post<PlanResponse>("/api/subscriptions/plans", payload)).data,
    updateMutation: async (id, payload) =>
      (await api.put<PlanResponse>(`/api/subscriptions/plans/${id}`, payload)).data,
    columns: () => [
      { id: "name", header: "Plan", cell: (record) => record.name, sortingValue: (record) => record.name },
      { id: "monthlyPrice", header: "Monthly", cell: (record) => formatCurrency(record.monthlyPrice), sortingValue: (record) => record.monthlyPrice },
      { id: "yearlyPrice", header: "Yearly", cell: (record) => formatCurrency(record.yearlyPrice), sortingValue: (record) => record.yearlyPrice ?? 0 },
      { id: "limits", header: "Limits", cell: (record) => `${record.maxBranches ?? "âˆž"} branches / ${record.maxStaff ?? "âˆž"} staff` },
      { id: "status", header: "Status", cell: (record) => <StatusBadge status={record.active ? "ACTIVE" : "INACTIVE"} /> },
    ],
    mobileCard: (record) =>
      detailCard(record.name, [
        <span key="monthly">{formatCurrency(record.monthlyPrice)} monthly</span>,
        <span key="limits">{record.maxBranches ?? "âˆž"} branches / {record.maxStaff ?? "âˆž"} staff</span>,
        <StatusBadge key="status" status={record.active ? "ACTIVE" : "INACTIVE"} />,
      ]),
    detailFields: () => [
      { label: "Name", value: (record) => record.name },
      { label: "Description", value: (record) => record.description ?? "â€”" },
      { label: "Monthly Price", value: (record) => formatCurrency(record.monthlyPrice) },
      { label: "Yearly Price", value: (record) => formatCurrency(record.yearlyPrice) },
      { label: "Max Branches", value: (record) => record.maxBranches ?? "Unlimited" },
      { label: "Max Staff", value: (record) => record.maxStaff ?? "Unlimited" },
      { label: "Status", value: (record) => <StatusBadge status={record.active ? "ACTIVE" : "INACTIVE"} /> },
      { label: "Features", value: (record) => record.features.length ? record.features.map((feature) => feature.featureName).join(", ") : "No plan features seeded" },
    ],
    searchValues: (record) => [record.name, record.description ?? ""],
  } satisfies ResourceDefinition<PlanResponse, PlanRequest>,
  subscriptions: {
    key: "subscriptions",
    title: "Subscriptions",
    singular: "Subscription",
    description: "Plan assignment, billing dates, and lifecycle status for each salon membership.",
    roles: ["SUPER_ADMIN", "SALON_OWNER"] satisfies Role[],
    createRoles: ["SUPER_ADMIN"] satisfies Role[],
    editRoles: ["SUPER_ADMIN"] satisfies Role[],
    listPath: routes.subscriptions,
    createPath: `${routes.subscriptions}/new`,
    detailPath: (id) => `${routes.subscriptions}/${id}`,
    editPath: (id) => `${routes.subscriptions}/${id}/edit`,
    schema: subscriptionSchema,
    defaultValues: () => ({
      salonBusinessId: "",
      planId: "",
      status: "TRIAL",
      startDate: "",
      endDate: "",
      trialEndsOn: "",
      billingAmount: undefined,
      autoRenew: true,
    }),
    toPayload: (values) => cleanPayload(values as SubscriptionRequest),
    toFormValues: (record) => ({
      salonBusinessId: record.salonBusinessId,
      planId: record.planId,
      status: record.status,
      startDate: record.startDate,
      endDate: record.endDate ?? "",
      trialEndsOn: record.trialEndsOn ?? "",
      billingAmount: record.billingAmount ?? undefined,
      autoRenew: record.autoRenew,
    }),
    fields: [
      {
        name: "salonBusinessId",
        label: "Salon",
        type: "select",
        lookupKey: "salons",
        hidden: ({ user }) => user.role !== "SUPER_ADMIN",
      },
      { name: "planId", label: "Plan", type: "select", lookupKey: "plans" },
      { name: "status", label: "Status", type: "select", options: subscriptionStatusOptions },
      { name: "startDate", label: "Start Date", type: "date" },
      { name: "endDate", label: "End Date", type: "date" },
      { name: "trialEndsOn", label: "Trial Ends On", type: "date" },
      { name: "billingAmount", label: "Billing Amount", type: "currency" },
      { name: "autoRenew", label: "Auto Renew", type: "checkbox", gridSpan: 2 },
    ],
    lookupDefinitions: [salonLookup, planLookup],
    listFilters: [
      {
        name: "salonBusinessId",
        label: "Filter by salon",
        type: "select",
        lookupKey: "salons",
        hidden: ({ user }) => user.role !== "SUPER_ADMIN",
      },
    ],
    listQuery: async (user, filters) =>
      (
        await api.get<SubscriptionResponse[]>("/api/subscriptions", {
          params:
            user.role === "SUPER_ADMIN" && filters.salonBusinessId
              ? { salonBusinessId: filters.salonBusinessId }
              : undefined,
        })
      ).data,
    getQuery: async (id) => (await api.get<SubscriptionResponse>(`/api/subscriptions/${id}`)).data,
    createMutation: async (payload) =>
      (await api.post<SubscriptionResponse>("/api/subscriptions", payload)).data,
    updateMutation: async (id, payload) =>
      (await api.put<SubscriptionResponse>(`/api/subscriptions/${id}`, payload)).data,
    columns: (helpers) => [
      { id: "salon", header: "Salon", cell: (record) => helpers.lookupLabel("salons", record.salonBusinessId) },
      { id: "plan", header: "Plan", cell: (record) => helpers.lookupLabel("plans", record.planId) },
      { id: "status", header: "Status", cell: (record) => <StatusBadge status={record.status} /> },
      { id: "billing", header: "Billing", cell: (record) => formatCurrency(record.billingAmount) },
      {
        id: "manage",
        header: "Status Control",
        cell: (record) => <SubscriptionStatusActions subscription={record} compact />,
      },
      { id: "window", header: "Dates", cell: (record) => `${formatDate(record.startDate)} â†’ ${formatDate(record.endDate)}` },
    ],
    mobileCard: (record, helpers) =>
      detailCard(helpers.lookupLabel("salons", record.salonBusinessId), [
        <span key="plan">{helpers.lookupLabel("plans", record.planId)}</span>,
        <StatusBadge key="status" status={record.status} />,
        <span key="amount">{formatCurrency(record.billingAmount)}</span>,
      ]),
    detailFields: (helpers) => [
      { label: "Salon", value: (record) => helpers.lookupLabel("salons", record.salonBusinessId) },
      { label: "Plan", value: (record) => helpers.lookupLabel("plans", record.planId) },
      { label: "Status", value: (record) => <StatusBadge status={record.status} /> },
      { label: "Start Date", value: (record) => formatDate(record.startDate) },
      { label: "End Date", value: (record) => formatDate(record.endDate) },
      { label: "Trial Ends On", value: (record) => formatDate(record.trialEndsOn) },
      { label: "Billing Amount", value: (record) => formatCurrency(record.billingAmount) },
      { label: "Auto Renew", value: (record) => (record.autoRenew ? "Yes" : "No") },
    ],
    detailExtra: (record, _helpers, user) =>
      user.role === "SUPER_ADMIN" ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Status Control</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Change the subscription state directly from here without opening the edit form.
              </p>
            </div>
            <SubscriptionStatusActions subscription={record} />
          </CardContent>
        </Card>
      ) : null,
    searchValues: (record, helpers) => [
      helpers.lookupLabel("salons", record.salonBusinessId),
      helpers.lookupLabel("plans", record.planId),
      record.status,
    ],
  } satisfies ResourceDefinition<SubscriptionResponse, SubscriptionRequest>,
  branches: {
    key: "branches",
    title: "Branches",
    singular: "Branch",
    description: "Branch management for salon owners, including Starter plan branch-limit enforcement from the backend.",
    roles: ["SUPER_ADMIN", "SALON_OWNER"] satisfies Role[],
    createRoles: ["SALON_OWNER"] satisfies Role[],
    editRoles: ["SUPER_ADMIN", "SALON_OWNER"] satisfies Role[],
    listPath: routes.branches,
    createPath: `${routes.branches}/new`,
    detailPath: (id) => `${routes.branches}/${id}`,
    editPath: (id) => `${routes.branches}/${id}/edit`,
    schema: branchSchema,
    defaultValues: () => ({
      branchName: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
    }),
    toPayload: (values) => cleanPayload(values as BranchCreateRequest),
    toFormValues: (record) => ({
      branchName: record.branchName,
      phone: record.phone ?? "",
      address: record.address ?? "",
      city: record.city ?? "",
      state: record.state ?? "",
      pincode: record.pincode ?? "",
    }),
    fields: [
      { name: "branchName", label: "Branch Name", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "address", label: "Address", type: "textarea", gridSpan: 2 },
      { name: "city", label: "City", type: "text" },
      { name: "state", label: "State", type: "text" },
      { name: "pincode", label: "Pincode", type: "text" },
    ],
    lookupDefinitions: [salonLookup],
    listFilters: [
      {
        name: "salonBusinessId",
        label: "Filter by salon",
        type: "select",
        lookupKey: "salons",
        hidden: ({ user }) => user.role !== "SUPER_ADMIN",
      },
    ],
    listQuery: async (user, filters) =>
      (
        await api.get<BranchResponse[]>("/api/branches", {
          params:
            user.role === "SUPER_ADMIN" && filters.salonBusinessId
              ? { salonBusinessId: filters.salonBusinessId }
              : undefined,
        })
      ).data,
    getQuery: async (id) => (await api.get<BranchResponse>(`/api/branches/${id}`)).data,
    createMutation: async (payload) => (await api.post<BranchResponse>("/api/branches", payload)).data,
    updateMutation: async (id, payload) =>
      (await api.put<BranchResponse>(`/api/branches/${id}`, payload)).data,
    activateMutation: async (id) => (await api.patch(`/api/branches/${id}/activate`)).data,
    deactivateMutation: async (id) => (await api.patch(`/api/branches/${id}/deactivate`)).data,
    toggleActive: {
      isActive: (record) => record.isActive,
      activeLabel: "Activate",
      inactiveLabel: "Deactivate",
    },
    columns: () => [
      { id: "branchName", header: "Branch", cell: (record) => record.branchName, sortingValue: (record) => record.branchName },
      { id: "salon", header: "Salon", cell: (record) => record.salonName, sortingValue: (record) => record.salonName },
      { id: "phone", header: "Phone", cell: (record) => record.phone ?? "â€”" },
      { id: "city", header: "Location", cell: (record) => `${record.city ?? "â€”"}, ${record.state ?? "â€”"}` },
      { id: "status", header: "Status", cell: (record) => <StatusBadge status={record.isActive ? "ACTIVE" : "INACTIVE"} /> },
    ],
    mobileCard: (record) =>
      detailCard(record.branchName, [
        <span key="salon">{record.salonName}</span>,
        <span key="location">{record.city ?? "â€”"}, {record.state ?? "â€”"}</span>,
        <span key="phone">{record.phone ?? "â€”"}</span>,
        <StatusBadge key="status" status={record.isActive ? "ACTIVE" : "INACTIVE"} />,
      ]),
    detailFields: () => [
      { label: "Branch Name", value: (record) => record.branchName },
      { label: "Salon", value: (record) => `${record.salonName} (${record.salonCode})` },
      { label: "Phone", value: (record) => record.phone ?? "â€”" },
      { label: "Address", value: (record) => record.address ?? "â€”" },
      { label: "City", value: (record) => record.city ?? "â€”" },
      { label: "State", value: (record) => record.state ?? "â€”" },
      { label: "Pincode", value: (record) => record.pincode ?? "â€”" },
      { label: "Status", value: (record) => <StatusBadge status={record.isActive ? "ACTIVE" : "INACTIVE"} /> },
    ],
    searchValues: (record) => [
      record.branchName,
      record.salonName,
      record.salonCode,
      record.city ?? "",
      record.state ?? "",
      record.phone ?? "",
    ],
  } satisfies ResourceDefinition<BranchResponse, BranchCreateRequest>,
  serviceCategories: {
    key: "service-categories",
    title: "Service Categories",
    singular: "Service Category",
    description: "Owner-managed category taxonomy used to group salon services before pricing and appointment setup.",
    roles: ["SUPER_ADMIN", "SALON_OWNER"] satisfies Role[],
    createRoles: ["SUPER_ADMIN", "SALON_OWNER"] satisfies Role[],
    editRoles: ["SUPER_ADMIN", "SALON_OWNER"] satisfies Role[],
    listPath: routes.serviceCategories,
    createPath: `${routes.serviceCategories}/new`,
    detailPath: (id) => `${routes.serviceCategories}/${id}`,
    editPath: (id) => `${routes.serviceCategories}/${id}/edit`,
    schema: serviceCategorySchema,
    defaultValues: () => ({
      salonBusinessId: "",
      name: "",
      description: "",
      displayOrder: undefined,
      active: true,
    }),
    toPayload: (values) => cleanPayload(values as ServiceCategoryRequest),
    toFormValues: (record) => ({
      salonBusinessId: record.salonBusinessId,
      name: record.name,
      description: record.description ?? "",
      displayOrder: record.displayOrder ?? undefined,
      active: record.active,
    }),
    fields: [
      {
        name: "salonBusinessId",
        label: "Salon",
        type: "select",
        lookupKey: "salons",
        hidden: ({ user }) => user.role !== "SUPER_ADMIN",
      },
      { name: "name", label: "Category Name", type: "text" },
      { name: "description", label: "Description", type: "textarea", gridSpan: 2 },
      { name: "displayOrder", label: "Display Order", type: "number" },
      { name: "active", label: "Active", type: "checkbox", gridSpan: 2 },
    ],
    lookupDefinitions: [salonLookup],
    listFilters: [
      {
        name: "salonBusinessId",
        label: "Filter by salon",
        type: "select",
        lookupKey: "salons",
        hidden: ({ user }) => user.role !== "SUPER_ADMIN",
      },
    ],
    listQuery: async (user, filters) =>
      (
        await api.get<ServiceCategoryResponse[]>("/api/services/categories", {
          params:
            user.role === "SUPER_ADMIN" && filters.salonBusinessId
              ? { salonBusinessId: filters.salonBusinessId }
              : undefined,
        })
      ).data,
    getQuery: async (id) =>
      (await api.get<ServiceCategoryResponse>(`/api/services/categories/${id}`)).data,
    createMutation: async (payload) =>
      (await api.post<ServiceCategoryResponse>("/api/services/categories", payload)).data,
    updateMutation: async (id, payload) =>
      (await api.put<ServiceCategoryResponse>(`/api/services/categories/${id}`, payload)).data,
    activateMutation: async (id) => (await api.patch(`/api/services/categories/${id}/activate`)).data,
    deactivateMutation: async (id) => (await api.patch(`/api/services/categories/${id}/deactivate`)).data,
    toggleActive: {
      isActive: (record) => record.active,
      activeLabel: "Activate",
      inactiveLabel: "Deactivate",
    },
    columns: () => [
      { id: "name", header: "Category", cell: (record) => record.name },
      { id: "description", header: "Description", cell: (record) => record.description ?? "â€”" },
      { id: "displayOrder", header: "Order", cell: (record) => record.displayOrder ?? "â€”" },
      { id: "status", header: "Status", cell: (record) => <StatusBadge status={record.active ? "ACTIVE" : "INACTIVE"} /> },
    ],
    mobileCard: (record) =>
      detailCard(record.name, [
        <span key="description">{record.description ?? "No description"}</span>,
        <span key="order">Order: {record.displayOrder ?? "â€”"}</span>,
        <StatusBadge key="status" status={record.active ? "ACTIVE" : "INACTIVE"} />,
      ]),
    detailFields: () => [
      { label: "Name", value: (record) => record.name },
      { label: "Description", value: (record) => record.description ?? "â€”" },
      { label: "Display Order", value: (record) => record.displayOrder ?? "â€”" },
      { label: "Status", value: (record) => <StatusBadge status={record.active ? "ACTIVE" : "INACTIVE"} /> },
    ],
    searchValues: (record) => [record.name, record.description ?? ""],
  } satisfies ResourceDefinition<ServiceCategoryResponse, ServiceCategoryRequest>,
  services: {
    key: "services",
    title: "Services",
    singular: "Service",
    description: "Service catalog with category, price, duration, and activation state tied exactly to the backend DTOs.",
    roles: ["SUPER_ADMIN", "SALON_OWNER", "STAFF"] satisfies Role[],
    createRoles: ["SUPER_ADMIN", "SALON_OWNER"] satisfies Role[],
    editRoles: ["SUPER_ADMIN", "SALON_OWNER"] satisfies Role[],
    listPath: routes.services,
    createPath: `${routes.services}/new`,
    detailPath: (id) => `${routes.services}/${id}`,
    editPath: (id) => `${routes.services}/${id}/edit`,
    schema: serviceSchema,
    defaultValues: () => ({
      salonBusinessId: "",
      serviceCategoryId: "",
      name: "",
      description: "",
      price: 0,
      durationMinutes: 0,
      active: true,
    }),
    toPayload: (values) => cleanPayload(values as ServiceRequest),
    toFormValues: (record) => ({
      salonBusinessId: record.salonBusinessId,
      serviceCategoryId: record.serviceCategoryId,
      name: record.name,
      description: record.description ?? "",
      price: record.price,
      durationMinutes: record.durationMinutes,
      active: record.active,
    }),
    fields: [
      {
        name: "salonBusinessId",
        label: "Salon",
        type: "select",
        lookupKey: "salons",
        resetOnChange: ["serviceCategoryId"],
        hidden: ({ user }) => user.role !== "SUPER_ADMIN",
      },
      {
        name: "serviceCategoryId",
        label: "Category",
        type: "select",
        lookupKey: "serviceCategories",
      },
      { name: "name", label: "Service Name", type: "text" },
      { name: "description", label: "Description", type: "textarea", gridSpan: 2 },
      { name: "price", label: "Price", type: "currency" },
      { name: "durationMinutes", label: "Duration (minutes)", type: "number" },
      { name: "active", label: "Active", type: "checkbox", gridSpan: 2 },
    ],
    lookupDefinitions: [salonLookup, categoryLookup],
    listFilters: [
      {
        name: "salonBusinessId",
        label: "Filter by salon",
        type: "select",
        lookupKey: "salons",
        hidden: ({ user }) => user.role !== "SUPER_ADMIN",
      },
    ],
    listQuery: async (user, filters) =>
      (
        await api.get<ServiceResponse[]>("/api/services", {
          params:
            user.role === "SUPER_ADMIN" && filters.salonBusinessId
              ? { salonBusinessId: filters.salonBusinessId }
              : undefined,
        })
      ).data,
    getQuery: async (id) => (await api.get<ServiceResponse>(`/api/services/${id}`)).data,
    createMutation: async (payload) => (await api.post<ServiceResponse>("/api/services", payload)).data,
    updateMutation: async (id, payload) =>
      (await api.put<ServiceResponse>(`/api/services/${id}`, payload)).data,
    activateMutation: async (id) => (await api.patch(`/api/services/${id}/activate`)).data,
    deactivateMutation: async (id) => (await api.patch(`/api/services/${id}/deactivate`)).data,
    toggleActive: {
      isActive: (record) => record.active,
      activeLabel: "Activate",
      inactiveLabel: "Deactivate",
    },
    columns: (helpers) => [
      { id: "name", header: "Service", cell: (record) => record.name },
      { id: "category", header: "Category", cell: (record) => helpers.lookupLabel("serviceCategories", record.serviceCategoryId) },
      { id: "price", header: "Price", cell: (record) => formatCurrency(record.price), sortingValue: (record) => record.price },
      { id: "duration", header: "Duration", cell: (record) => `${record.durationMinutes} mins`, sortingValue: (record) => record.durationMinutes },
      { id: "status", header: "Status", cell: (record) => <StatusBadge status={record.active ? "ACTIVE" : "INACTIVE"} /> },
    ],
    mobileCard: (record, helpers) =>
      detailCard(record.name, [
        <span key="category">{helpers.lookupLabel("serviceCategories", record.serviceCategoryId)}</span>,
        <span key="price">{formatCurrency(record.price)} â€¢ {record.durationMinutes} mins</span>,
        <StatusBadge key="status" status={record.active ? "ACTIVE" : "INACTIVE"} />,
      ]),
    detailFields: (helpers) => [
      { label: "Name", value: (record) => record.name },
      { label: "Category", value: (record) => helpers.lookupLabel("serviceCategories", record.serviceCategoryId) },
      { label: "Description", value: (record) => record.description ?? "â€”" },
      { label: "Price", value: (record) => formatCurrency(record.price) },
      { label: "Duration", value: (record) => `${record.durationMinutes} minutes` },
      { label: "Status", value: (record) => <StatusBadge status={record.active ? "ACTIVE" : "INACTIVE"} /> },
      { label: "Created", value: (record) => formatDateTime(record.createdAt) },
    ],
    searchValues: (record, helpers) => [
      record.name,
      helpers.lookupLabel("serviceCategories", record.serviceCategoryId),
      record.description ?? "",
    ],
  } satisfies ResourceDefinition<ServiceResponse, ServiceRequest>,
  customers: {
    key: "customers",
    title: "Customers",
    singular: "Customer",
    description: "Customer profiles with salon-scoped identity, notes, and optional demographic details.",
    roles: ["SUPER_ADMIN", "SALON_OWNER", "STAFF"] satisfies Role[],
    createRoles: ["SUPER_ADMIN", "SALON_OWNER", "STAFF"] satisfies Role[],
    editRoles: ["SUPER_ADMIN", "SALON_OWNER", "STAFF"] satisfies Role[],
    toggleRoles: ["SUPER_ADMIN", "SALON_OWNER"] satisfies Role[],
    listPath: routes.customers,
    createPath: `${routes.customers}/new`,
    detailPath: (id) => `${routes.customers}/${id}`,
    editPath: (id) => `${routes.customers}/${id}/edit`,
    schema: customerSchema,
    defaultValues: () => ({
      salonBusinessId: "",
      branchId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: "",
      dateOfBirth: "",
      notes: "",
    }),
    toPayload: (values) => cleanPayload(values as CustomerRequest),
    toFormValues: (record) => ({
      salonBusinessId: record.salonBusinessId,
      branchId: record.branchId ?? "",
      firstName: record.firstName,
      lastName: record.lastName ?? "",
      email: record.email ?? "",
      phone: record.phone,
      gender: normalizeCustomerGender(record.gender),
      dateOfBirth: record.dateOfBirth ?? "",
      notes: record.notes ?? "",
    }),
    fields: [
      {
        name: "salonBusinessId",
        label: "Salon",
        type: "select",
        lookupKey: "salons",
        resetOnChange: ["branchId"],
        hidden: ({ user }) => user.role !== "SUPER_ADMIN",
      },
      {
        name: "branchId",
        label: "Branch",
        type: "select",
        lookupKey: "branches",
        searchable: true,
        disabled: ({ user, values }) => user.role === "SUPER_ADMIN" && !values.salonBusinessId,
      },
      { name: "firstName", label: "First Name", type: "text" },
      { name: "lastName", label: "Last Name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "gender", label: "Gender", type: "select", options: customerGenderOptions },
      { name: "dateOfBirth", label: "Date Of Birth", type: "date" },
      { name: "notes", label: "Notes", type: "textarea", gridSpan: 2 },
    ],
    lookupDefinitions: [salonLookup, branchLookup],
    listFilters: [
      {
        name: "salonBusinessId",
        label: "Filter by salon",
        type: "select",
        lookupKey: "salons",
        hidden: ({ user }) => user.role !== "SUPER_ADMIN",
      },
      {
        name: "branchId",
        label: "Filter by branch",
        type: "select",
        lookupKey: "branches",
        searchable: true,
      },
    ],
    listQuery: async (_user, filters) =>
      (
        await api.get<CustomerResponse[]>("/api/customers", {
          params: {
            ...(filters.salonBusinessId ? { salonBusinessId: filters.salonBusinessId } : {}),
            ...(filters.branchId ? { branchId: filters.branchId } : {}),
          },
        })
      ).data,
    getQuery: async (id) => (await api.get<CustomerResponse>(`/api/customers/${id}`)).data,
    createMutation: async (payload) =>
      (await api.post<CustomerResponse>("/api/customers", payload)).data,
    updateMutation: async (id, payload) =>
      (await api.put<CustomerResponse>(`/api/customers/${id}`, payload)).data,
    activateMutation: async (id) => (await api.patch(`/api/customers/${id}/activate`)).data,
    deactivateMutation: async (id) => (await api.patch(`/api/customers/${id}/deactivate`)).data,
    toggleActive: {
      isActive: (record) => record.active,
      activeLabel: "Activate",
      inactiveLabel: "Deactivate",
    },
    columns: (helpers) => [
      {
        id: "name",
        header: "Customer",
        cell: (record) => `${record.firstName} ${record.lastName ?? ""}`.trim(),
        sortingValue: (record) => `${record.firstName} ${record.lastName ?? ""}`.trim(),
      },
      { id: "phone", header: "Phone", cell: (record) => record.phone },
      { id: "email", header: "Email", cell: (record) => record.email ?? "-" },
      { id: "branch", header: "Branch", cell: (record) => helpers.lookupLabel("branches", record.branchId) },
      { id: "salon", header: "Salon", cell: (record) => helpers.lookupLabel("salons", record.salonBusinessId) },
      { id: "status", header: "Status", cell: (record) => <StatusBadge status={record.active ? "ACTIVE" : "INACTIVE"} /> },
    ],
    mobileCard: (record, helpers) =>
      detailCard(`${record.firstName} ${record.lastName ?? ""}`.trim(), [
        <span key="phone">{record.phone}</span>,
        <span key="email">{record.email ?? "-"}</span>,
        <span key="branch">{helpers.lookupLabel("branches", record.branchId)}</span>,
        <span key="dob">{formatDate(record.dateOfBirth)}</span>,
        <StatusBadge key="status" status={record.active ? "ACTIVE" : "INACTIVE"} />,
      ]),
    detailFields: (helpers) => [
      { label: "First Name", value: (record) => record.firstName },
      { label: "Last Name", value: (record) => record.lastName ?? "-" },
      { label: "Email", value: (record) => record.email ?? "-" },
      { label: "Phone", value: (record) => record.phone },
      { label: "Branch", value: (record) => helpers.lookupLabel("branches", record.branchId) },
      { label: "Salon", value: (record) => helpers.lookupLabel("salons", record.salonBusinessId) },
      { label: "Gender", value: (record) => normalizeCustomerGender(record.gender) || "-" },
      { label: "Date Of Birth", value: (record) => formatDate(record.dateOfBirth) },
      { label: "Notes", value: (record) => record.notes ?? "-" },
      { label: "Status", value: (record) => <StatusBadge status={record.active ? "ACTIVE" : "INACTIVE"} /> },
      { label: "Updated", value: (record) => formatDateTime(record.updatedAt) },
    ],
    searchValues: (record, helpers) => [
      record.firstName,
      record.lastName ?? "",
      record.email ?? "",
      record.phone,
      helpers.lookupLabel("branches", record.branchId),
      helpers.lookupLabel("salons", record.salonBusinessId),
    ],
    localFilter: (record, filters) =>
      (!filters.salonBusinessId || record.salonBusinessId === filters.salonBusinessId)
      && (!filters.branchId || record.branchId === filters.branchId),
  } satisfies ResourceDefinition<CustomerResponse, CustomerRequest>,
  staff: {
    key: "staff",
    title: "Staff",
    singular: "Staff",
    description: "Staff profiles, payroll settings, branch assignment, and activation state for salon teams.",
    roles: ["SUPER_ADMIN", "SALON_OWNER", "STAFF"] satisfies Role[],
    createRoles: ["SALON_OWNER"] satisfies Role[],
    editRoles: ["SALON_OWNER"] satisfies Role[],
    listPath: routes.staff,
    createPath: `${routes.staff}/new`,
    detailPath: (id) => `${routes.staff}/${id}`,
    editPath: (id) => `${routes.staff}/${id}/edit`,
    schema: (mode) => (mode === "create" ? staffCreateSchema() : staffEditSchema()),
    defaultValues: () => ({
      fullName: "",
      username: "",
      email: "",
      phone: "",
      password: "",
      branchId: "",
      displayName: "",
      designation: "",
      bio: "",
      baseSalary: undefined,
      revenueSharePercentage: undefined,
      commissionPercentage: undefined,
      hourlyRate: undefined,
      hireDate: "",
      compensationType: "",
      active: true,
    }),
    toPayload: (values) => cleanPayload(values as unknown as StaffRequest),
    toFormValues: (record) => ({
      branchId: record.branchId ?? "",
      displayName: record.displayName,
      designation: record.designation ?? "",
      bio: record.bio ?? "",
      baseSalary: record.baseSalary ?? undefined,
      revenueSharePercentage: record.revenueSharePercentage ?? undefined,
      commissionPercentage: record.commissionPercentage ?? undefined,
      hourlyRate: record.hourlyRate ?? undefined,
      hireDate: record.hireDate ?? "",
      compensationType: record.compensationType ?? "",
      active: record.active,
    }),
    fields: [
      { name: "fullName", label: "Full Name", type: "text", description: "Required when creating a new staff user." },
      { name: "username", label: "Username", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "password", label: "Password", type: "password", description: "Only used for new staff user creation." },
      { name: "branchId", label: "Branch", type: "select", lookupKey: "branches", searchable: true },
      { name: "displayName", label: "Display Name", type: "text" },
      { name: "designation", label: "Designation", type: "text" },
      { name: "bio", label: "Bio", type: "textarea", gridSpan: 2 },
      { name: "compensationType", label: "Compensation Type", type: "select", options: compensationTypeOptions },
      { name: "hireDate", label: "Hire Date", type: "date" },
      { name: "baseSalary", label: "Base Salary", type: "currency" },
      { name: "revenueSharePercentage", label: "Revenue Share %", type: "number" },
      { name: "commissionPercentage", label: "Commission %", type: "number" },
      { name: "hourlyRate", label: "Hourly Rate", type: "currency" },
      { name: "active", label: "Active", type: "checkbox", gridSpan: 2 },
    ],
    lookupDefinitions: [salonLookup, branchLookup],
    listFilters: [
      {
        name: "salonBusinessId",
        label: "Filter by salon",
        type: "select",
        lookupKey: "salons",
        hidden: ({ user }) => user.role !== "SUPER_ADMIN",
      },
      {
        name: "branchId",
        label: "Filter by branch",
        type: "select",
        lookupKey: "branches",
        searchable: true,
      },
    ],
    listQuery: async (_user, filters) =>
      (
        await api.get<StaffResponse[]>("/api/staff", {
          params: {
            ...(filters.salonBusinessId ? { salonBusinessId: filters.salonBusinessId } : {}),
            ...(filters.branchId ? { branchId: filters.branchId } : {}),
          },
        })
      ).data,
    getQuery: async (id) => (await api.get<StaffResponse>(`/api/staff/${id}`)).data,
    createMutation: async (payload) => (await api.post<StaffResponse>("/api/staff", payload)).data,
    updateMutation: async (id, payload) =>
      (await api.put<StaffResponse>(`/api/staff/${id}`, payload)).data,
    activateMutation: async (id) => (await api.patch(`/api/staff/${id}/activate`)).data,
    deactivateMutation: async (id) => (await api.patch(`/api/staff/${id}/deactivate`)).data,
    toggleActive: {
      isActive: (record) => record.active,
      activeLabel: "Activate",
      inactiveLabel: "Deactivate",
    },
    columns: () => [
      {
        id: "displayName",
        header: "Staff",
        cell: (record) => (
          <div>
            <p className="font-semibold">{record.displayName}</p>
            <p className="text-xs text-muted-foreground">{record.fullName}</p>
          </div>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        cell: (record) => (
          <div className="space-y-1">
            <p>{record.email ?? record.username}</p>
            <p className="text-xs text-muted-foreground">{record.phone ?? record.staffCode}</p>
          </div>
        ),
      },
      { id: "salon", header: "Salon", cell: (record) => record.salonName, sortingValue: (record) => record.salonName },
      { id: "branch", header: "Branch", cell: (record) => record.branchName ?? "Unassigned" },
      { id: "compensationType", header: "Compensation", cell: (record) => labelize(record.compensationType ?? "FIXED_SALARY") },
      { id: "active", header: "Status", cell: (record) => <StatusBadge status={record.active ? "ACTIVE" : "INACTIVE"} /> },
    ],
    mobileCard: (record) =>
      detailCard(record.displayName, [
        <span key="staffCode">{record.staffCode}</span>,
        <span key="salon">{record.salonName}</span>,
        <span key="branch">{record.branchName ?? "Unassigned"}</span>,
        <StatusBadge key="status" status={record.active ? "ACTIVE" : "INACTIVE"} />,
      ]),
    detailFields: () => [
      { label: "Display Name", value: (record) => record.displayName },
      { label: "Full Name", value: (record) => record.fullName },
      { label: "Staff Code", value: (record) => record.staffCode },
      { label: "Username", value: (record) => record.username },
      { label: "Email", value: (record) => record.email ?? "-" },
      { label: "Phone", value: (record) => record.phone ?? "-" },
      { label: "Salon", value: (record) => `${record.salonName} (${record.salonCode})` },
      { label: "Branch", value: (record) => record.branchName ?? "Unassigned" },
      { label: "Designation", value: (record) => record.designation ?? "â€”" },
      { label: "Bio", value: (record) => record.bio ?? "â€”" },
      { label: "Compensation Type", value: (record) => labelize(record.compensationType ?? "FIXED_SALARY") },
      { label: "Base Salary", value: (record) => formatCurrency(record.baseSalary) },
      { label: "Revenue Share %", value: (record) => record.revenueSharePercentage ?? "â€”" },
      { label: "Commission %", value: (record) => record.commissionPercentage ?? "â€”" },
      { label: "Hourly Rate", value: (record) => formatCurrency(record.hourlyRate) },
      { label: "Hire Date", value: (record) => formatDate(record.hireDate) },
    ],
    searchValues: (record) => [
      record.displayName,
      record.fullName,
      record.staffCode,
      record.email ?? "",
      record.phone ?? "",
      record.salonName,
      record.branchName ?? "",
      record.designation ?? "",
    ],
  } satisfies ResourceDefinition<StaffResponse, Record<string, unknown>>,
  payments: {
    key: "payments",
    title: "Payments",
    singular: "Payment",
    description: "Invoice-linked payments with backend payment-status recalculation and audit timestamps.",
    roles: ["SUPER_ADMIN", "SALON_OWNER", "STAFF"] satisfies Role[],
    createRoles: ["SALON_OWNER", "STAFF"] satisfies Role[],
    editRoles: ["SALON_OWNER", "STAFF"] satisfies Role[],
    listPath: routes.payments,
    createPath: `${routes.payments}/new`,
    detailPath: (id) => `${routes.payments}/${id}`,
    editPath: (id) => `${routes.payments}/${id}/edit`,
    schema: paymentSchema,
    defaultValues: () => ({
      invoiceId: "",
      amount: 0,
      paymentMethod: "",
      status: "PAID",
      transactionReference: "",
      paidAt: "",
    }),
    toPayload: (values) => cleanPayload(values as unknown as PaymentRequest),
    toFormValues: (record) => ({
      invoiceId: record.invoiceId,
      amount: record.amount,
      paymentMethod: record.paymentMethod,
      status: record.status,
      transactionReference: record.transactionReference ?? "",
      paidAt: record.paidAt ? record.paidAt.slice(0, 16) : "",
    }),
    fields: [
      { name: "invoiceId", label: "Invoice", type: "select", lookupKey: "invoices" },
      { name: "amount", label: "Amount", type: "currency" },
      { name: "paymentMethod", label: "Method", type: "select", options: paymentMethodOptions },
      { name: "status", label: "Status", type: "select", options: paymentStatusOptions },
      { name: "transactionReference", label: "Transaction Reference", type: "text" },
      { name: "paidAt", label: "Paid At", type: "datetime-local" },
    ],
    lookupDefinitions: [invoiceLookup],
    extraInvalidateKeys: ["invoices", "staff-earnings"],
    listQuery: async () => (await api.get<PaymentResponse[]>("/api/payments")).data,
    getQuery: async (id) => (await api.get<PaymentResponse>(`/api/payments/${id}`)).data,
    createMutation: async (payload) => (await api.post<PaymentResponse>("/api/payments", payload)).data,
    updateMutation: async (id, payload) =>
      (await api.put<PaymentResponse>(`/api/payments/${id}`, payload)).data,
    columns: (helpers) => [
      { id: "invoice", header: "Invoice", cell: (record) => helpers.lookupLabel("invoices", record.invoiceId) },
      { id: "amount", header: "Amount", cell: (record) => formatCurrency(record.amount), sortingValue: (record) => record.amount },
      { id: "method", header: "Method", cell: (record) => record.paymentMethod },
      { id: "status", header: "Status", cell: (record) => <StatusBadge status={record.status} /> },
      { id: "paidAt", header: "Paid At", cell: (record) => formatDateTime(record.paidAt) },
    ],
    mobileCard: (record, helpers) =>
      detailCard(helpers.lookupLabel("invoices", record.invoiceId), [
        <span key="amount">{formatCurrency(record.amount)}</span>,
        <StatusBadge key="status" status={record.status} />,
        <span key="paidAt">{formatDateTime(record.paidAt)}</span>,
      ]),
    detailFields: (helpers) => [
      { label: "Invoice", value: (record) => helpers.lookupLabel("invoices", record.invoiceId) },
      { label: "Amount", value: (record) => formatCurrency(record.amount) },
      { label: "Payment Method", value: (record) => record.paymentMethod },
      { label: "Status", value: (record) => <StatusBadge status={record.status} /> },
      { label: "Transaction Reference", value: (record) => record.transactionReference ?? "â€”" },
      { label: "Paid At", value: (record) => formatDateTime(record.paidAt) },
      { label: "Created", value: (record) => formatDateTime(record.createdAt) },
    ],
    searchValues: (record, helpers) => [
      helpers.lookupLabel("invoices", record.invoiceId),
      record.paymentMethod,
      record.status,
      record.transactionReference ?? "",
    ],
  } satisfies ResourceDefinition<PaymentResponse, Record<string, unknown>>,
} as const;

export type ResourceKey = keyof typeof resourceRegistry;

export function getResource(key: ResourceKey) {
  return resourceRegistry[key];
}

