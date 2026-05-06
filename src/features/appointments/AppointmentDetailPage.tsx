import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, parseApiError } from "@/lib/api";
import { formatCurrency, formatTime } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import type {
  AppointmentResponse,
  AppointmentStatusUpdateRequest,
  BranchResponse,
  CustomerResponse,
  ServiceResponse,
  StaffResponse,
} from "@/types/api";

const statuses = ["BOOKED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

export function AppointmentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const appointmentQuery = useQuery({
    queryKey: ["appointment", id],
    queryFn: async () => (await api.get<AppointmentResponse>(`/api/appointments/${id}`)).data,
    enabled: Boolean(id),
  });
  const branchesQuery = useQuery({
    queryKey: ["appointment", "branches"],
    queryFn: async () => (await api.get<BranchResponse[]>("/api/branches")).data,
  });
  const customersQuery = useQuery({
    queryKey: ["appointment", "customers"],
    queryFn: async () => (await api.get<CustomerResponse[]>("/api/customers")).data,
  });
  const staffQuery = useQuery({
    queryKey: ["appointment", "staff"],
    queryFn: async () => (await api.get<StaffResponse[]>("/api/staff")).data,
  });
  const servicesQuery = useQuery({
    queryKey: ["appointment", "services"],
    queryFn: async () => (await api.get<ServiceResponse[]>("/api/services")).data,
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: AppointmentStatusUpdateRequest) =>
      (await api.patch<AppointmentResponse>(`/api/appointments/${id}/status`, payload)).data,
    onSuccess: () => {
      toast.success("Appointment status updated");
      void queryClient.invalidateQueries({ queryKey: ["appointment", id] });
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) => toast.error(parseApiError(error)),
  });

  if (
    appointmentQuery.isLoading ||
    branchesQuery.isLoading ||
    customersQuery.isLoading ||
    staffQuery.isLoading ||
    servicesQuery.isLoading
  ) {
    return <LoadingSpinner label="Loading appointment..." />;
  }

  if (
    appointmentQuery.isError ||
    branchesQuery.isError ||
    customersQuery.isError ||
    staffQuery.isError ||
    servicesQuery.isError ||
    !appointmentQuery.data
  ) {
    return (
      <ErrorState
        title="Unable to load appointment"
        description={
          parseApiError(appointmentQuery.error) ||
          parseApiError(branchesQuery.error) ||
          parseApiError(customersQuery.error) ||
          parseApiError(staffQuery.error) ||
          parseApiError(servicesQuery.error)
        }
      />
    );
  }

  const appointment = appointmentQuery.data;
  const branch = (branchesQuery.data ?? []).find((item) => item.id === appointment.branchId);
  const customer = (customersQuery.data ?? []).find((item) => item.id === appointment.customerProfileId);
  const staff = (staffQuery.data ?? []).find((item) => item.id === appointment.staffProfileId);
  const serviceMap = Object.fromEntries((servicesQuery.data ?? []).map((service) => [service.id, service.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Appointment Detail"
        title={`${appointment.appointmentDate} / ${formatTime(appointment.startTime)}`}
        description="Appointment detail, nested service items, and backend status patch controls."
      />

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Branch</p>
            <p className="mt-2 text-sm font-medium">{branch?.branchName ?? appointment.branchId}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Customer</p>
            <p className="mt-2 text-sm font-medium">
              {customer ? `${customer.firstName} ${customer.lastName ?? ""}`.trim() : appointment.customerProfileId}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Staff</p>
            <p className="mt-2 text-sm font-medium">{staff?.displayName ?? appointment.staffProfileId}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Status</p>
            <div className="mt-2">
              <StatusBadge status={appointment.status} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appointment.services.map((service) => (
            <div
              key={service.id}
              className="grid gap-3 rounded-3xl border border-border/70 bg-secondary/25 p-4 md:grid-cols-3"
            >
              <span>{serviceMap[service.serviceId] ?? service.serviceId}</span>
              <span>{service.durationMinutes} mins</span>
              <span>{formatCurrency(service.price)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {user?.role !== "CUSTOMER" ? (
        <Card>
          <CardHeader>
            <CardTitle>Update Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {statuses.map((status) => (
              <Button
                key={status}
                variant={appointment.status === status ? "default" : "outline"}
                onClick={() => statusMutation.mutate({ status })}
                disabled={statusMutation.isPending}
              >
                {status}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
