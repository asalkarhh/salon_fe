import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { api, parseApiError } from "@/lib/api";
import { routes } from "@/config/routes";
import { useAuth } from "@/features/auth/AuthProvider";
import { formatTime } from "@/lib/utils";
import type {
  AppointmentResponse,
  BranchResponse,
  CustomerResponse,
  SalonBusinessResponse,
  StaffResponse,
} from "@/types/api";

export function AppointmentsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const supportSalonId = searchParams.get("salonBusinessId") ?? "";
  const [search, setSearch] = useState("");
  const [salonBusinessId, setSalonBusinessId] = useState(supportSalonId);
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canLoadSupportView = !isSuperAdmin || Boolean(salonBusinessId);

  useEffect(() => {
    if (isSuperAdmin) {
      setSalonBusinessId(supportSalonId);
      setBranchId("");
    }
  }, [isSuperAdmin, supportSalonId]);

  const salonsQuery = useQuery({
    queryKey: ["appointments", "salons"],
    queryFn: async () => (await api.get<SalonBusinessResponse[]>("/api/salons")).data,
    enabled: isSuperAdmin,
  });
  const branchesQuery = useQuery({
    queryKey: ["appointments", "branches"],
    queryFn: async () => (await api.get<BranchResponse[]>("/api/branches")).data,
  });
  const customersQuery = useQuery({
    queryKey: ["appointments", "customers"],
    queryFn: async () => (await api.get<CustomerResponse[]>("/api/customers")).data,
  });
  const staffQuery = useQuery({
    queryKey: ["appointments", "staff"],
    queryFn: async () => (await api.get<StaffResponse[]>("/api/staff")).data,
  });
  const appointmentsQuery = useQuery({
    queryKey: ["appointments", "list", salonBusinessId, branchId],
    queryFn: async () =>
      (
        await api.get<AppointmentResponse[]>("/api/appointments", {
          params: {
            salonBusinessId: salonBusinessId || undefined,
            branchId: branchId || undefined,
          },
        })
      ).data,
    enabled: canLoadSupportView,
  });
  const filteredBranches = useMemo(() => {
    if (!isSuperAdmin || !salonBusinessId) {
      return branchesQuery.data ?? [];
    }
    return (branchesQuery.data ?? []).filter((branch) => branch.salonBusinessId === salonBusinessId);
  }, [branchesQuery.data, isSuperAdmin, salonBusinessId]);
  const selectedSalon = (salonsQuery.data ?? []).find((salon) => salon.id === salonBusinessId);

  const branchMap = Object.fromEntries((branchesQuery.data ?? []).map((branch) => [branch.id, branch.branchName]));
  const customerMap = Object.fromEntries(
    (customersQuery.data ?? []).map((customer) => [
      customer.id,
      `${customer.firstName} ${customer.lastName ?? ""}`.trim(),
    ]),
  );
  const staffMap = Object.fromEntries((staffQuery.data ?? []).map((staff) => [staff.id, staff.displayName]));

  if (isSuperAdmin && !supportSalonId && !salonsQuery.isLoading) {
    return (
      <ErrorState
        title="Salon context required"
        description="Open appointments from a salon support link to keep the superadmin view scoped and read-only."
      />
    );
  }

  if (
    appointmentsQuery.isLoading ||
    branchesQuery.isLoading ||
    customersQuery.isLoading ||
    staffQuery.isLoading ||
    salonsQuery.isLoading
  ) {
    return <LoadingSpinner label="Loading appointments..." />;
  }

  if (
    appointmentsQuery.isError ||
    branchesQuery.isError ||
    customersQuery.isError ||
    staffQuery.isError ||
    salonsQuery.isError
  ) {
    return (
      <ErrorState
        title="Unable to load appointments"
        description={
          parseApiError(appointmentsQuery.error) ||
          parseApiError(branchesQuery.error) ||
          parseApiError(customersQuery.error) ||
          parseApiError(staffQuery.error) ||
          parseApiError(salonsQuery.error)
        }
      />
    );
  }

  const records = (appointmentsQuery.data ?? []).filter((appointment) => {
    const matchesStatus = !status || appointment.status === status;
    const matchesDate = !appointmentDate || appointment.appointmentDate === appointmentDate;
    const matchesSearch =
      !search.trim() ||
      [
        branchMap[appointment.branchId] ?? "",
        customerMap[appointment.customerProfileId] ?? "",
        staffMap[appointment.staffProfileId] ?? "",
        appointment.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesStatus && matchesDate && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isSuperAdmin ? "Appointment Support" : "Appointments"}
        title={isSuperAdmin ? "Appointment Support" : "Appointments"}
        description={
          isSuperAdmin
            ? `Read-only support view for ${selectedSalon?.businessName ?? "the selected salon"} appointments.`
            : "Browse, filter, and manage salon appointments exactly through the backend appointment endpoints."
        }
        action={
          isSuperAdmin ? (
            <Button variant="outline" asChild>
              <Link to={`${routes.salons}/${salonBusinessId}`}>Back to salon</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={`${routes.appointments}/new`}>
                <Plus className="h-4 w-4" />
                New Appointment
              </Link>
            </Button>
          )
        }
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search by branch, customer, staff, or status"
        filters={
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              placeholder="Filter by branch"
              options={filteredBranches.map((branch) => ({
                label: branch.branchName,
                value: branch.id,
              }))}
            />
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              placeholder="Filter by status"
              options={[
                "BOOKED",
                "CONFIRMED",
                "IN_PROGRESS",
                "COMPLETED",
                "CANCELLED",
                "NO_SHOW",
              ].map((item) => ({ label: item, value: item }))}
            />
            <input
              type="date"
              value={appointmentDate}
              onChange={(event) => setAppointmentDate(event.target.value)}
              className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>
        }
      />

      <DataTable
        data={records}
        columns={[
          {
            id: "date",
            header: "Date & Time",
            cell: (record) => (
              <div>
                <p className="font-semibold">{record.appointmentDate}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(record.startTime)} - {formatTime(record.endTime)}
                </p>
              </div>
            ),
          },
          { id: "branch", header: "Branch", cell: (record) => branchMap[record.branchId] ?? record.branchId },
          { id: "customer", header: "Customer", cell: (record) => customerMap[record.customerProfileId] ?? record.customerProfileId },
          { id: "staff", header: "Staff", cell: (record) => staffMap[record.staffProfileId] ?? record.staffProfileId },
          { id: "status", header: "Status", cell: (record) => <StatusBadge status={record.status} /> },
          {
            id: "actions",
            header: "Actions",
            cell: (record) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`${routes.appointments}/${record.id}`}>View</Link>
                </Button>
                {user?.role === "SALON_OWNER" || user?.role === "STAFF" ? (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`${routes.appointments}/${record.id}/edit`}>Edit</Link>
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]}
        mobileCard={(record) => (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{customerMap[record.customerProfileId] ?? "Customer"}</p>
                  <p className="text-sm text-muted-foreground">
                    {record.appointmentDate} / {formatTime(record.startTime)}
                  </p>
                </div>
                <StatusBadge status={record.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {branchMap[record.branchId] ?? "Branch"} / {staffMap[record.staffProfileId] ?? "Staff"}
              </p>
              <Button variant="outline" asChild>
                <Link to={`${routes.appointments}/${record.id}`}>View appointment</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      />
    </div>
  );
}
