import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MinusCircle, PlusCircle } from "lucide-react";
import { ErrorState } from "@/components/common/ErrorState";
import { FormSection } from "@/components/common/FormSection";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select } from "@/components/ui/select";
import { api, parseApiError } from "@/lib/api";
import { routes } from "@/config/routes";
import { formatCurrency } from "@/lib/utils";
import { toSalonSelectOption } from "@/lib/select-options";
import { useAuth } from "@/features/auth/AuthProvider";
import { logValidationFailure } from "@/lib/form-logging";
import { logger, summarizeError } from "@/lib/logger";
import type {
  AppointmentResponse,
  BranchResponse,
  CustomerResponse,
  InvoiceRequest,
  InvoiceResponse,
  SalonBusinessResponse,
  ServiceResponse,
} from "@/types/api";

const itemSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be zero or more"),
  lineTotal: z.number().min(0, "Line total must be zero or more"),
});

const schema = z.object({
  salonBusinessId: z.string().optional(),
  branchId: z.string().min(1, "Branch is required"),
  appointmentId: z.string().optional(),
  customerProfileId: z.string().min(1, "Customer is required"),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  taxAmount: z.number().min(0, "Tax must be zero or more"),
  discountAmount: z.number().min(0, "Discount must be zero or more"),
  paymentStatus: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one invoice item is required"),
});

type Values = z.infer<typeof schema>;

/**
 * Invoice create/edit form that mirrors the backend invoice DTO, including
 * nested line items and derived totals.
 */
export function InvoiceFormPage({ mode }: { mode: "create" | "edit" }) {
  const formName = `invoices-${mode}`;
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const createPrefillAppliedRef = useRef(false);
  const createDefaultInvoiceDate = new Date().toISOString().slice(0, 10);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      salonBusinessId: "",
      branchId: "",
      appointmentId: "",
      customerProfileId: "",
      invoiceNumber: "",
      invoiceDate: createDefaultInvoiceDate,
      taxAmount: 0,
      discountAmount: 0,
      paymentStatus: "PENDING",
      items: [{ serviceId: "", description: "", quantity: 1, unitPrice: 0, lineTotal: 0 }],
    },
  });

  const itemsArray = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Supporting datasets are loaded up front so invoice creation can reference
  // valid salons, branches, appointments, customers, and services.
  const salonsQuery = useQuery({
    queryKey: ["invoice-form", "salons"],
    queryFn: async () => (await api.get<SalonBusinessResponse[]>("/api/salons")).data,
    enabled: user?.role === "SUPER_ADMIN",
  });
  const branchesQuery = useQuery({
    queryKey: ["invoice-form", "branches"],
    queryFn: async () => (await api.get<BranchResponse[]>("/api/branches")).data,
  });
  const customersQuery = useQuery({
    queryKey: ["invoice-form", "customers"],
    queryFn: async () => (await api.get<CustomerResponse[]>("/api/customers")).data,
  });
  const appointmentsQuery = useQuery({
    queryKey: ["invoice-form", "appointments"],
    queryFn: async () => (await api.get<AppointmentResponse[]>("/api/appointments")).data,
  });
  const servicesQuery = useQuery({
    queryKey: ["invoice-form", "services"],
    queryFn: async () => (await api.get<ServiceResponse[]>("/api/services")).data,
  });
  const recordQuery = useQuery({
    queryKey: ["invoice-form", "detail", id],
    queryFn: async () => (await api.get<InvoiceResponse>(`/api/invoices/${id}`)).data,
    enabled: mode === "edit" && Boolean(id),
  });

  useEffect(() => {
    if (recordQuery.data) {
      // Edit mode reconstructs the line items from GET /api/invoices/{id} so
      // the frontend can resubmit the full backend payload.
      logger.debug("forms", "invoice_record_loaded", {
        formName,
        recordId: id,
      });
      form.reset({
        salonBusinessId: recordQuery.data.salonBusinessId,
        branchId: recordQuery.data.branchId,
        appointmentId: recordQuery.data.appointmentId ?? "",
        customerProfileId: recordQuery.data.customerProfileId,
        invoiceNumber: recordQuery.data.invoiceNumber,
        invoiceDate: recordQuery.data.invoiceDate,
        taxAmount: recordQuery.data.taxAmount,
        discountAmount: recordQuery.data.discountAmount,
        paymentStatus: recordQuery.data.paymentStatus,
        items: recordQuery.data.items.map((item) => ({
          serviceId: item.serviceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      });
    }
  }, [form, recordQuery.data]);

  useEffect(() => {
    if (mode !== "create" || createPrefillAppliedRef.current) {
      return;
    }

    // Invoice creation can be prefixed from visits or queue screens so billing
    // starts with the known branch, customer, appointment, or business date.
    const nextValues = form.getValues();
    let changed = false;

    const branchId = searchParams.get("branchId");
    const appointmentId = searchParams.get("appointmentId");
    const customerProfileId = searchParams.get("customerProfileId");
    const invoiceDate = searchParams.get("invoiceDate");

    if (branchId) {
      nextValues.branchId = branchId;
      changed = true;
    }

    if (appointmentId) {
      nextValues.appointmentId = appointmentId;
      changed = true;
    }

    if (customerProfileId) {
      nextValues.customerProfileId = customerProfileId;
      changed = true;
    }

    if (invoiceDate) {
      nextValues.invoiceDate = invoiceDate;
      changed = true;
    }

    if (changed) {
      form.reset(nextValues);
    }

    createPrefillAppliedRef.current = true;
  }, [form, mode, searchParams]);

  const selectedSalonId = form.watch("salonBusinessId");
  const selectedAppointmentId = form.watch("appointmentId");
  const items = form.watch("items");
  const taxAmount = form.watch("taxAmount");
  const discountAmount = form.watch("discountAmount");

  const handleSalonChange = (salonBusinessId: string) => {
    logger.debug("forms", "invoice_salon_changed", {
      formName,
      recordId: id,
    });
    form.setValue("salonBusinessId", salonBusinessId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.setValue("branchId", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("appointmentId", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("customerProfileId", "", { shouldDirty: true, shouldValidate: true });
    itemsArray.replace([
      { serviceId: "", description: "", quantity: 1, unitPrice: 0, lineTotal: 0 },
    ]);
  };

  const filteredBranches = useMemo(() => {
    if (user?.role !== "SUPER_ADMIN" || !selectedSalonId) {
      return branchesQuery.data ?? [];
    }
    return (branchesQuery.data ?? []).filter((branch) => branch.salonBusinessId === selectedSalonId);
  }, [branchesQuery.data, selectedSalonId, user?.role]);

  const filteredCustomers = useMemo(() => {
    if (user?.role !== "SUPER_ADMIN" || !selectedSalonId) {
      return customersQuery.data ?? [];
    }
    return (customersQuery.data ?? []).filter((customer) => customer.salonBusinessId === selectedSalonId);
  }, [customersQuery.data, selectedSalonId, user?.role]);

  const filteredAppointments = useMemo(() => {
    if (user?.role !== "SUPER_ADMIN" || !selectedSalonId) {
      return appointmentsQuery.data ?? [];
    }
    return (appointmentsQuery.data ?? []).filter(
      (appointment) => appointment.salonBusinessId === selectedSalonId,
    );
  }, [appointmentsQuery.data, selectedSalonId, user?.role]);

  const filteredServices = useMemo(() => {
    if (user?.role !== "SUPER_ADMIN" || !selectedSalonId) {
      return servicesQuery.data ?? [];
    }
    return (servicesQuery.data ?? []).filter((service) => service.salonBusinessId === selectedSalonId);
  }, [servicesQuery.data, selectedSalonId, user?.role]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal ?? 0), 0);
    const total = subtotal + Number(taxAmount ?? 0) - Number(discountAmount ?? 0);
    return { subtotal, total };
  }, [discountAmount, items, taxAmount]);

  useEffect(() => {
    if (!selectedAppointmentId) {
      return;
    }

    // Choosing an appointment auto-fills branch and customer fields because the
    // backend invoice flow expects those references to match the appointment.
    const selectedAppointment = (appointmentsQuery.data ?? []).find(
      (appointment) => appointment.id === selectedAppointmentId,
    );

    if (!selectedAppointment) {
      return;
    }

    if (form.getValues("branchId") !== selectedAppointment.branchId) {
      form.setValue("branchId", selectedAppointment.branchId, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }

    if (form.getValues("customerProfileId") !== selectedAppointment.customerProfileId) {
      form.setValue("customerProfileId", selectedAppointment.customerProfileId, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  }, [appointmentsQuery.data, form, selectedAppointmentId]);

  const saveMutation = useMutation({
    mutationFn: async (payload: InvoiceRequest) => {
      if (mode === "create") {
        return (await api.post<InvoiceResponse>("/api/invoices", payload)).data;
      }
      return (await api.put<InvoiceResponse>(`/api/invoices/${id}`, payload)).data;
    },
    onSuccess: (response) => {
      logger.info("forms", "invoice_submission_succeeded", {
        formName,
        recordId: response.id,
      });
      toast.success("Invoice saved");
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      navigate(`${routes.invoices}/${response.id}`);
    },
    onError: (error) => {
      logger.error("forms", "invoice_submission_failed", {
        formName,
        recordId: id,
        error: summarizeError(error),
      });
      toast.error(parseApiError(error));
    },
  });

  if (
    salonsQuery.isLoading ||
    branchesQuery.isLoading ||
    customersQuery.isLoading ||
    appointmentsQuery.isLoading ||
    servicesQuery.isLoading ||
    recordQuery.isLoading
  ) {
    return <LoadingSpinner label="Loading invoice form..." />;
  }

  if (
    salonsQuery.isError ||
    branchesQuery.isError ||
    customersQuery.isError ||
    appointmentsQuery.isError ||
    servicesQuery.isError ||
    recordQuery.isError
  ) {
    return (
      <ErrorState
        title="Unable to load invoice form"
        description={
          parseApiError(salonsQuery.error) ||
          parseApiError(branchesQuery.error) ||
          parseApiError(customersQuery.error) ||
          parseApiError(appointmentsQuery.error) ||
          parseApiError(servicesQuery.error) ||
          parseApiError(recordQuery.error)
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Invoices"
        title={mode === "create" ? "New Invoice" : "Edit Invoice"}
        description="Invoice items, subtotal, tax, discount, and total are kept aligned with the backend invoice request model."
      />

      <form
        className="space-y-6"
        onSubmit={form.handleSubmit(
          (values) => {
            logger.info("forms", "invoice_submission_started", {
              formName,
              recordId: id,
              itemCount: values.items.length,
            });
            // Totals are derived client-side from the current item rows so the
            // payload stays aligned with the backend invoice calculation model.
            saveMutation.mutate({
              salonBusinessId: values.salonBusinessId || undefined,
              branchId: values.branchId,
              appointmentId: values.appointmentId || undefined,
              customerProfileId: values.customerProfileId,
              invoiceNumber: values.invoiceNumber || undefined,
              invoiceDate: values.invoiceDate,
              subtotalAmount: totals.subtotal,
              taxAmount: values.taxAmount,
              discountAmount: values.discountAmount,
              totalAmount: totals.total,
              paymentStatus: values.paymentStatus as InvoiceRequest["paymentStatus"],
              items: values.items,
            });
          },
          (errors) => logValidationFailure(formName, errors as Record<string, never>),
        )}
      >
        <FormSection title="Invoice details">
          <div className="grid gap-5 md:grid-cols-2">
            {user?.role === "SUPER_ADMIN" ? (
              <div className="space-y-2">
                <Label htmlFor="salonBusinessId">Salon</Label>
                <SearchableSelect
                  id="salonBusinessId"
                  value={selectedSalonId ?? ""}
                  placeholder="Choose salon"
                  searchPlaceholder="Search salon or owner"
                  options={(salonsQuery.data ?? []).map(toSalonSelectOption)}
                  onValueChange={handleSalonChange}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="branchId">Branch</Label>
              <Select
                id="branchId"
                placeholder="Choose branch"
                options={filteredBranches.map((branch) => ({
                  label: branch.branchName,
                  value: branch.id,
                }))}
                {...form.register("branchId")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointmentId">Appointment</Label>
              <Select
                id="appointmentId"
                placeholder="Optional appointment"
                options={filteredAppointments.map((appointment) => ({
                  label: `${appointment.appointmentDate} / ${appointment.startTime.slice(0, 5)}`,
                  value: appointment.id,
                }))}
                {...form.register("appointmentId")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerProfileId">Customer</Label>
              <Select
                id="customerProfileId"
                placeholder="Choose customer"
                options={filteredCustomers.map((customer) => ({
                  label: `${customer.firstName} ${customer.lastName ?? ""}`.trim(),
                  value: customer.id,
                }))}
                {...form.register("customerProfileId")}
              />
            </div>
            {mode === "edit" ? (
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  type="text"
                  value={form.watch("invoiceNumber") ?? ""}
                  disabled
                  readOnly
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/80 bg-secondary/25 p-4 md:col-span-2">
                <p className="text-sm font-medium text-foreground">Invoice number will be auto-generated</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Save the bill first and the system will assign the invoice number automatically.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input id="invoiceDate" type="date" {...form.register("invoiceDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxAmount">Tax Amount</Label>
              <Input
                id="taxAmount"
                type="number"
                step="0.01"
                {...form.register("taxAmount", {
                  setValueAs: (value) => Number(value),
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountAmount">Discount Amount</Label>
              <Input
                id="discountAmount"
                type="number"
                step="0.01"
                {...form.register("discountAmount", {
                  setValueAs: (value) => Number(value),
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <Select
                id="paymentStatus"
                options={[
                  "PENDING",
                  "PAID",
                  "PARTIAL",
                  "FAILED",
                  "REFUNDED",
                ].map((status) => ({ label: status, value: status }))}
                {...form.register("paymentStatus")}
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Invoice Items"
          description={`Subtotal ${formatCurrency(totals.subtotal)} / Total ${formatCurrency(totals.total)}`}
        >
          <div className="space-y-4">
            {itemsArray.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-4 rounded-3xl border border-border/70 bg-secondary/25 p-4 md:grid-cols-[1.3fr_1.5fr_0.7fr_0.9fr_0.9fr_auto]"
              >
                <Select
                  placeholder="Choose service"
                  options={filteredServices.map((service) => ({
                    label: `${service.name} / ${formatCurrency(service.price)}`,
                    value: service.id,
                  }))}
                  {...form.register(`items.${index}.serviceId` as const)}
                  onChange={(event) => {
                    form.setValue(`items.${index}.serviceId`, event.target.value);
                    const matched = filteredServices.find((service) => service.id === event.target.value);
                    if (matched) {
                      // Service selection seeds the invoice line from the service
                      // catalog so billing starts with the configured defaults.
                      form.setValue(`items.${index}.description`, matched.name);
                      form.setValue(`items.${index}.unitPrice`, matched.price);
                      form.setValue(
                        `items.${index}.lineTotal`,
                        matched.price * Number(form.getValues(`items.${index}.quantity`) || 1),
                      );
                    }
                  }}
                />
                <Input type="text" {...form.register(`items.${index}.description` as const)} />
                <Input
                  type="number"
                  {...form.register(`items.${index}.quantity` as const, {
                    setValueAs: (value) => Number(value),
                    onChange: () => {
                      const quantity = Number(form.getValues(`items.${index}.quantity`) || 0);
                      const unitPrice = Number(form.getValues(`items.${index}.unitPrice`) || 0);
                      form.setValue(`items.${index}.lineTotal`, quantity * unitPrice);
                    },
                  })}
                />
                <Input
                  type="number"
                  step="0.01"
                  {...form.register(`items.${index}.unitPrice` as const, {
                    setValueAs: (value) => Number(value),
                    onChange: () => {
                      const quantity = Number(form.getValues(`items.${index}.quantity`) || 0);
                      const unitPrice = Number(form.getValues(`items.${index}.unitPrice`) || 0);
                      form.setValue(`items.${index}.lineTotal`, quantity * unitPrice);
                    },
                  })}
                />
                <Input
                  type="number"
                  step="0.01"
                  {...form.register(`items.${index}.lineTotal` as const, {
                    setValueAs: (value) => Number(value),
                  })}
                />
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => itemsArray.remove(index)}
                    disabled={itemsArray.fields.length === 1}
                  >
                    <MinusCircle className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                itemsArray.append({
                  serviceId: "",
                  description: "",
                  quantity: 1,
                  unitPrice: 0,
                  lineTotal: 0,
                })
              }
            >
              <PlusCircle className="h-4 w-4" />
              Add item
            </Button>
          </div>
        </FormSection>

        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save invoice"}
        </Button>
      </form>
    </div>
  );
}
