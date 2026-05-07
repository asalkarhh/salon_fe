import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Textarea } from "@/components/ui/textarea";
import { api, parseApiError } from "@/lib/api";
import { routes } from "@/config/routes";
import { useAuth } from "@/features/auth/AuthProvider";
import { toSalonSelectOption } from "@/lib/select-options";
import { formatCurrency } from "@/lib/utils";
import type {
  AppointmentRequest,
  AppointmentResponse,
  BranchResponse,
  CustomerResponse,
  SalonBusinessResponse,
  ServiceResponse,
  StaffResponse,
} from "@/types/api";

const serviceRowSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  price: z.number().min(0, "Price must be zero or more"),
  durationMinutes: z.number().min(0, "Duration must be zero or more"),
});

const schema = z.object({
  salonBusinessId: z.string().optional(),
  branchId: z.string().min(1, "Branch is required"),
  customerProfileId: z.string().min(1, "Customer is required"),
  staffProfileId: z.string().min(1, "Staff is required"),
  appointmentDate: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  services: z.array(serviceRowSchema).min(1, "At least one service is required"),
});

type Values = z.infer<typeof schema>;

export function AppointmentFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      salonBusinessId: "",
      branchId: "",
      customerProfileId: "",
      staffProfileId: "",
      appointmentDate: "",
      startTime: "",
      endTime: "",
      status: "BOOKED",
      notes: "",
      services: [{ serviceId: "", price: 0, durationMinutes: 0 }],
    },
  });

  const fieldsArray = useFieldArray({
    control: form.control,
    name: "services",
  });

  const salonsQuery = useQuery({
    queryKey: ["appointment-form", "salons"],
    queryFn: async () => (await api.get<SalonBusinessResponse[]>("/api/salons")).data,
    enabled: user?.role === "SUPER_ADMIN",
  });
  const branchesQuery = useQuery({
    queryKey: ["appointment-form", "branches"],
    queryFn: async () => (await api.get<BranchResponse[]>("/api/branches")).data,
  });
  const customersQuery = useQuery({
    queryKey: ["appointment-form", "customers"],
    queryFn: async () => (await api.get<CustomerResponse[]>("/api/customers")).data,
  });
  const staffQuery = useQuery({
    queryKey: ["appointment-form", "staff"],
    queryFn: async () => (await api.get<StaffResponse[]>("/api/staff")).data,
  });
  const servicesQuery = useQuery({
    queryKey: ["appointment-form", "services"],
    queryFn: async () => (await api.get<ServiceResponse[]>("/api/services")).data,
  });

  const recordQuery = useQuery({
    queryKey: ["appointment-form", "detail", id],
    queryFn: async () => (await api.get<AppointmentResponse>(`/api/appointments/${id}`)).data,
    enabled: mode === "edit" && Boolean(id),
  });

  useEffect(() => {
    if (recordQuery.data) {
      form.reset({
        salonBusinessId: recordQuery.data.salonBusinessId,
        branchId: recordQuery.data.branchId,
        customerProfileId: recordQuery.data.customerProfileId,
        staffProfileId: recordQuery.data.staffProfileId,
        appointmentDate: recordQuery.data.appointmentDate,
        startTime: recordQuery.data.startTime.slice(0, 5),
        endTime: recordQuery.data.endTime?.slice(0, 5) ?? "",
        status: recordQuery.data.status,
        notes: recordQuery.data.notes ?? "",
        services: recordQuery.data.services.map((service) => ({
          serviceId: service.serviceId,
          price: service.price,
          durationMinutes: service.durationMinutes,
        })),
      });
    }
  }, [form, recordQuery.data]);

  const selectedSalonId = form.watch("salonBusinessId");
  const serviceRows = form.watch("services");

  const handleSalonChange = (salonBusinessId: string) => {
    form.setValue("salonBusinessId", salonBusinessId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.setValue("branchId", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("customerProfileId", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("staffProfileId", "", { shouldDirty: true, shouldValidate: true });
    fieldsArray.replace([{ serviceId: "", price: 0, durationMinutes: 0 }]);
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

  const filteredStaff = useMemo(() => {
    if (user?.role !== "SUPER_ADMIN" || !selectedSalonId) {
      return staffQuery.data ?? [];
    }
    return (staffQuery.data ?? []).filter((staff) => staff.salonBusinessId === selectedSalonId);
  }, [selectedSalonId, staffQuery.data, user?.role]);

  const filteredServices = useMemo(() => {
    if (user?.role !== "SUPER_ADMIN" || !selectedSalonId) {
      return servicesQuery.data ?? [];
    }
    return (servicesQuery.data ?? []).filter((service) => service.salonBusinessId === selectedSalonId);
  }, [selectedSalonId, servicesQuery.data, user?.role]);

  const totals = useMemo(
    () =>
      serviceRows.reduce(
        (accumulator, item) => ({
          amount: accumulator.amount + Number(item.price ?? 0),
          duration: accumulator.duration + Number(item.durationMinutes ?? 0),
        }),
        { amount: 0, duration: 0 },
      ),
    [serviceRows],
  );

  const saveMutation = useMutation({
    mutationFn: async (payload: AppointmentRequest) => {
      if (mode === "create") {
        return (await api.post<AppointmentResponse>("/api/appointments", payload)).data;
      }
      return (await api.put<AppointmentResponse>(`/api/appointments/${id}`, payload)).data;
    },
    onSuccess: (response) => {
      toast.success("Appointment saved");
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      navigate(`${routes.appointments}/${response.id}`);
    },
    onError: (error) => toast.error(parseApiError(error)),
  });

  if (
    salonsQuery.isLoading ||
    branchesQuery.isLoading ||
    customersQuery.isLoading ||
    staffQuery.isLoading ||
    servicesQuery.isLoading ||
    recordQuery.isLoading
  ) {
    return <LoadingSpinner label="Loading appointment form..." />;
  }

  if (
    salonsQuery.isError ||
    branchesQuery.isError ||
    customersQuery.isError ||
    staffQuery.isError ||
    servicesQuery.isError ||
    recordQuery.isError
  ) {
    return (
      <ErrorState
        title="Unable to load appointment form"
        description={
          parseApiError(salonsQuery.error) ||
          parseApiError(branchesQuery.error) ||
          parseApiError(customersQuery.error) ||
          parseApiError(staffQuery.error) ||
          parseApiError(servicesQuery.error) ||
          parseApiError(recordQuery.error)
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Appointments"
        title={mode === "create" ? "New Appointment" : "Edit Appointment"}
        description="The service rows below map directly to the backend `services[]` appointment payload."
      />

      <form
        className="space-y-6"
        onSubmit={form.handleSubmit((values) =>
          saveMutation.mutate({
            salonBusinessId: values.salonBusinessId || undefined,
            branchId: values.branchId,
            customerProfileId: values.customerProfileId,
            staffProfileId: values.staffProfileId,
            appointmentDate: values.appointmentDate,
            startTime: values.startTime.length === 5 ? `${values.startTime}:00` : values.startTime,
            endTime: values.endTime
              ? values.endTime.length === 5
                ? `${values.endTime}:00`
                : values.endTime
              : undefined,
            status: (values.status || undefined) as AppointmentRequest["status"],
            notes: values.notes || undefined,
            services: values.services,
          }),
        )}
      >
        <FormSection title="Appointment details">
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
            <div className="space-y-2">
              <Label htmlFor="staffProfileId">Staff</Label>
              <Select
                id="staffProfileId"
                placeholder="Choose staff"
                options={filteredStaff.map((staff) => ({
                  label: `${staff.displayName} (${staff.staffCode})`,
                  value: staff.id,
                }))}
                {...form.register("staffProfileId")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointmentDate">Appointment Date</Label>
              <Input id="appointmentDate" type="date" {...form.register("appointmentDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" type="time" {...form.register("startTime")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" type="time" {...form.register("endTime")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                options={[
                  "BOOKED",
                  "CONFIRMED",
                  "IN_PROGRESS",
                  "COMPLETED",
                  "CANCELLED",
                  "NO_SHOW",
                ].map((status) => ({ label: status, value: status }))}
                {...form.register("status")}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...form.register("notes")} />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Services"
          description={`Approx. total ${formatCurrency(totals.amount)} / ${totals.duration} mins`}
        >
          <div className="space-y-4">
            {fieldsArray.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-4 rounded-3xl border border-border/70 bg-secondary/25 p-4 md:grid-cols-[1.5fr_1fr_1fr_auto]"
              >
                <Select
                  placeholder="Choose service"
                  options={filteredServices.map((service) => ({
                    label: `${service.name} / ${formatCurrency(service.price)}`,
                    value: service.id,
                  }))}
                  {...form.register(`services.${index}.serviceId` as const)}
                  onChange={(event) => {
                    form.setValue(`services.${index}.serviceId`, event.target.value);
                    const matched = filteredServices.find((service) => service.id === event.target.value);
                    if (matched) {
                      form.setValue(`services.${index}.price`, matched.price);
                      form.setValue(`services.${index}.durationMinutes`, matched.durationMinutes);
                    }
                  }}
                />
                <Input
                  type="number"
                  step="0.01"
                  {...form.register(`services.${index}.price` as const, {
                    setValueAs: (value) => Number(value),
                  })}
                />
                <Input
                  type="number"
                  {...form.register(`services.${index}.durationMinutes` as const, {
                    setValueAs: (value) => Number(value),
                  })}
                />
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fieldsArray.remove(index)}
                    disabled={fieldsArray.fields.length === 1}
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
                fieldsArray.append({ serviceId: "", price: 0, durationMinutes: 0 })
              }
            >
              <PlusCircle className="h-4 w-4" />
              Add service
            </Button>
          </div>
        </FormSection>

        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save appointment"}
        </Button>
      </form>
    </div>
  );
}
