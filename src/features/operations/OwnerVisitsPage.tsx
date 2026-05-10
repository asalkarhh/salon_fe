import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Receipt, Ticket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Select } from "@/components/ui/select";
import { routes } from "@/config/routes";
import { api, parseApiError } from "@/lib/api";
import { cn, formatTime } from "@/lib/utils";
import type {
  AppointmentResponse,
  BranchResponse,
  CustomerResponse,
  QueueTokenResponse,
  StaffResponse,
} from "@/types/api";

type VisitsTab = "appointments" | "queue";

const appointmentStatusOptions = [
  "BOOKED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
].map((status) => ({ label: status, value: status }));

function buildPath(path: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export function OwnerVisitsPage() {
  const [activeTab, setActiveTab] = useState<VisitsTab>("appointments");
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [appointmentStatus, setAppointmentStatus] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [queueDate, setQueueDate] = useState("");

  const branchesQuery = useQuery({
    queryKey: ["owner-visits", "branches"],
    queryFn: async () => (await api.get<BranchResponse[]>("/api/branches")).data,
  });
  const customersQuery = useQuery({
    queryKey: ["owner-visits", "customers"],
    queryFn: async () => (await api.get<CustomerResponse[]>("/api/customers")).data,
  });
  const staffQuery = useQuery({
    queryKey: ["owner-visits", "staff"],
    queryFn: async () => (await api.get<StaffResponse[]>("/api/staff")).data,
  });
  const appointmentsQuery = useQuery({
    queryKey: ["owner-visits", "appointments"],
    queryFn: async () => (await api.get<AppointmentResponse[]>("/api/appointments")).data,
  });
  const queueQuery = useQuery({
    queryKey: ["owner-visits", "queue"],
    queryFn: async () => (await api.get<QueueTokenResponse[]>("/api/queue-tokens")).data,
  });

  const isLoading =
    branchesQuery.isLoading
    || customersQuery.isLoading
    || staffQuery.isLoading
    || appointmentsQuery.isLoading
    || queueQuery.isLoading;

  if (isLoading) {
    return <LoadingSpinner label="Loading visits..." />;
  }

  if (
    branchesQuery.isError
    || customersQuery.isError
    || staffQuery.isError
    || appointmentsQuery.isError
    || queueQuery.isError
  ) {
    return (
      <ErrorState
        title="Unable to load visits"
        description={
          parseApiError(branchesQuery.error)
          || parseApiError(customersQuery.error)
          || parseApiError(staffQuery.error)
          || parseApiError(appointmentsQuery.error)
          || parseApiError(queueQuery.error)
        }
      />
    );
  }

  const branchMap = Object.fromEntries((branchesQuery.data ?? []).map((branch) => [branch.id, branch.branchName]));
  const customerMap = Object.fromEntries(
    (customersQuery.data ?? []).map((customer) => [
      customer.id,
      `${customer.firstName} ${customer.lastName ?? ""}`.trim(),
    ]),
  );
  const staffMap = Object.fromEntries((staffQuery.data ?? []).map((staff) => [staff.id, staff.displayName]));

  const appointmentRecords = (appointmentsQuery.data ?? []).filter((appointment) => {
    const matchesBranch = !branchId || appointment.branchId === branchId;
    const matchesStatus = !appointmentStatus || appointment.status === appointmentStatus;
    const matchesDate = !appointmentDate || appointment.appointmentDate === appointmentDate;
    const matchesSearch =
      !search.trim()
      || [
        branchMap[appointment.branchId] ?? "",
        customerMap[appointment.customerProfileId] ?? "",
        staffMap[appointment.staffProfileId] ?? "",
        appointment.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesBranch && matchesStatus && matchesDate && matchesSearch;
  });

  const queueRecords = (queueQuery.data ?? []).filter((token) => {
    const matchesBranch = !branchId || token.branchId === branchId;
    const matchesDate = !queueDate || token.tokenDate === queueDate;
    const matchesSearch =
      !search.trim()
      || [
        String(token.tokenNumber),
        branchMap[token.branchId] ?? "",
        customerMap[token.customerProfileId] ?? "",
        token.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesBranch && matchesDate && matchesSearch;
  });

  const branchOptions = (branchesQuery.data ?? []).map((branch) => ({
    label: branch.branchName,
    value: branch.id,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner Operations"
        title="Visits"
        description="Use one place for scheduled bookings and walk-in tokens, then jump straight into billing when a visit is ready to close."
        action={(
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to={`${routes.appointments}/new`}>
                <CalendarClock className="h-4 w-4" />
                New Booking
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`${routes.queueTokens}/new`}>
                <Ticket className="h-4 w-4" />
                New Walk-in
              </Link>
            </Button>
          </div>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/15 bg-primary/5">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Scheduled Today</p>
            <p className="mt-3 font-display text-4xl">{appointmentRecords.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">Appointments matching your current filters.</p>
          </CardContent>
        </Card>
        <Card className="border-secondary/70">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Walk-ins In Queue</p>
            <p className="mt-3 font-display text-4xl">{queueRecords.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">Queue tokens matching your current filters.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Choose the visit type you want to manage</p>
            <p className="text-sm text-muted-foreground">Switch between scheduled appointments and walk-in queue without leaving the page.</p>
          </div>
          <div className="inline-flex rounded-2xl border border-border/80 bg-secondary/30 p-1">
            {[
              { key: "appointments", label: "Scheduled Appointments" },
              { key: "queue", label: "Walk-in Queue" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as VisitsTab)}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium transition",
                  activeTab === tab.key
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder={
          activeTab === "appointments"
            ? "Search by branch, customer, staff, or status"
            : "Search by token, branch, customer, or status"
        }
        filters={(
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              placeholder="Filter by branch"
              options={branchOptions}
            />
            {activeTab === "appointments" ? (
              <>
                <Select
                  value={appointmentStatus}
                  onChange={(event) => setAppointmentStatus(event.target.value)}
                  placeholder="Filter by status"
                  options={appointmentStatusOptions}
                />
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(event) => setAppointmentDate(event.target.value)}
                  className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </>
            ) : (
              <input
                type="date"
                value={queueDate}
                onChange={(event) => setQueueDate(event.target.value)}
                className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            )}
          </div>
        )}
      />

      {activeTab === "appointments" ? (
        <DataTable
          data={appointmentRecords}
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
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`${routes.appointments}/${record.id}`}>View</Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`${routes.appointments}/${record.id}/edit`}>Edit</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link
                      to={buildPath(`${routes.invoices}/new`, {
                        appointmentId: record.id,
                        invoiceDate: record.appointmentDate,
                      })}
                    >
                      <Receipt className="h-4 w-4" />
                      Create Bill
                    </Link>
                  </Button>
                </div>
              ),
            },
          ]}
          emptyTitle="No appointments found"
          emptyDescription="Add a booking or adjust your current filters."
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
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" asChild>
                    <Link to={`${routes.appointments}/${record.id}`}>View</Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to={`${routes.appointments}/${record.id}/edit`}>Edit</Link>
                  </Button>
                  <Button asChild>
                    <Link
                      to={buildPath(`${routes.invoices}/new`, {
                        appointmentId: record.id,
                        invoiceDate: record.appointmentDate,
                      })}
                    >
                      Create Bill
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        />
      ) : (
        <DataTable
          data={queueRecords}
          columns={[
            {
              id: "token",
              header: "Token",
              cell: (record) => (
                <div>
                  <p className="font-display text-3xl">{record.tokenNumber}</p>
                  <p className="text-xs text-muted-foreground">{record.tokenDate}</p>
                </div>
              ),
              sortingValue: (record) => record.tokenNumber,
            },
            { id: "branch", header: "Branch", cell: (record) => branchMap[record.branchId] ?? record.branchId },
            { id: "customer", header: "Customer", cell: (record) => customerMap[record.customerProfileId] ?? record.customerProfileId },
            { id: "status", header: "Status", cell: (record) => <StatusBadge status={record.status} /> },
            {
              id: "actions",
              header: "Actions",
              cell: (record) => (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`${routes.queueTokens}/${record.id}`}>View</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link
                      to={buildPath(`${routes.invoices}/new`, {
                        branchId: record.branchId,
                        customerProfileId: record.customerProfileId,
                        invoiceDate: record.tokenDate,
                      })}
                    >
                      <Receipt className="h-4 w-4" />
                      Create Bill
                    </Link>
                  </Button>
                </div>
              ),
            },
          ]}
          emptyTitle="No queue tokens found"
          emptyDescription="Add a walk-in or adjust your current filters."
          mobileCard={(record) => (
            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-4xl">{record.tokenNumber}</p>
                    <p className="text-sm text-muted-foreground">{record.tokenDate}</p>
                  </div>
                  <StatusBadge status={record.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {branchMap[record.branchId] ?? "Branch"} / {customerMap[record.customerProfileId] ?? "Customer"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" asChild>
                    <Link to={`${routes.queueTokens}/${record.id}`}>View</Link>
                  </Button>
                  <Button asChild>
                    <Link
                      to={buildPath(`${routes.invoices}/new`, {
                        branchId: record.branchId,
                        customerProfileId: record.customerProfileId,
                        invoiceDate: record.tokenDate,
                      })}
                    >
                      Create Bill
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        />
      )}
    </div>
  );
}
