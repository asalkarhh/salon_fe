import { useEffect, useState } from "react";
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
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import type {
  AppointmentResponse,
  BranchResponse,
  CustomerResponse,
  InvoiceResponse,
  SalonBusinessResponse,
} from "@/types/api";

/**
 * Invoice list and super-admin support view backed by /api/invoices plus the
 * supporting branch, customer, appointment, and salon lookups.
 */
export function InvoicesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const supportSalonId = searchParams.get("salonBusinessId") ?? "";
  const [search, setSearch] = useState("");
  const [salonBusinessId, setSalonBusinessId] = useState(supportSalonId);
  const [paymentStatus, setPaymentStatus] = useState("");
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canLoadSupportView = !isSuperAdmin || Boolean(salonBusinessId);

  useEffect(() => {
    if (isSuperAdmin) {
      setSalonBusinessId(supportSalonId);
    }
  }, [isSuperAdmin, supportSalonId]);

  // Super-admin support mode resolves salon context first so the invoice list
  // stays read-only and tenant-scoped.
  const salonsQuery = useQuery({
    queryKey: ["invoices", "salons"],
    queryFn: async () => (await api.get<SalonBusinessResponse[]>("/api/salons")).data,
    enabled: isSuperAdmin,
  });
  const branchesQuery = useQuery({
    queryKey: ["invoices", "branches"],
    queryFn: async () => (await api.get<BranchResponse[]>("/api/branches")).data,
  });
  const customersQuery = useQuery({
    queryKey: ["invoices", "customers"],
    queryFn: async () => (await api.get<CustomerResponse[]>("/api/customers")).data,
  });
  const appointmentsQuery = useQuery({
    queryKey: ["invoices", "appointments"],
    queryFn: async () => (await api.get<AppointmentResponse[]>("/api/appointments")).data,
  });
  const invoicesQuery = useQuery({
    queryKey: ["invoices", "list", salonBusinessId],
    queryFn: async () =>
      (
        await api.get<InvoiceResponse[]>("/api/invoices", {
          params: { salonBusinessId: salonBusinessId || undefined },
        })
      ).data,
    enabled: canLoadSupportView,
  });
  const selectedSalon = (salonsQuery.data ?? []).find((salon) => salon.id === salonBusinessId);

  const branchMap = Object.fromEntries((branchesQuery.data ?? []).map((branch) => [branch.id, branch.branchName]));
  const customerMap = Object.fromEntries(
    (customersQuery.data ?? []).map((customer) => [
      customer.id,
      `${customer.firstName} ${customer.lastName ?? ""}`.trim(),
    ]),
  );
  const appointmentMap = Object.fromEntries(
    (appointmentsQuery.data ?? []).map((appointment) => [
      appointment.id,
      `${appointment.appointmentDate} ${appointment.startTime.slice(0, 5)}`,
    ]),
  );

  if (isSuperAdmin && !supportSalonId && !salonsQuery.isLoading) {
    return (
      <ErrorState
        title="Salon context required"
        description="Open invoices from a salon support link to keep the superadmin view scoped and read-only."
      />
    );
  }

  if (
    salonsQuery.isLoading ||
    branchesQuery.isLoading ||
    customersQuery.isLoading ||
    appointmentsQuery.isLoading ||
    invoicesQuery.isLoading
  ) {
    return <LoadingSpinner label="Loading invoices..." />;
  }

  if (
    salonsQuery.isError ||
    branchesQuery.isError ||
    customersQuery.isError ||
    appointmentsQuery.isError ||
    invoicesQuery.isError
  ) {
    return (
      <ErrorState
        title="Unable to load invoices"
        description={
          parseApiError(salonsQuery.error) ||
          parseApiError(branchesQuery.error) ||
          parseApiError(customersQuery.error) ||
          parseApiError(appointmentsQuery.error) ||
          parseApiError(invoicesQuery.error)
        }
      />
    );
  }

  const records = (invoicesQuery.data ?? []).filter((invoice) => {
    const matchesStatus = !paymentStatus || invoice.paymentStatus === paymentStatus;
    const matchesSearch =
      !search.trim() ||
      [
        invoice.invoiceNumber,
        customerMap[invoice.customerProfileId] ?? "",
        branchMap[invoice.branchId] ?? "",
        appointmentMap[invoice.appointmentId ?? ""] ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isSuperAdmin ? "Invoice Support" : "Billing"}
        title={isSuperAdmin ? "Invoice Support" : "Invoices"}
        description={
          isSuperAdmin
            ? `Read-only support view for ${selectedSalon?.businessName ?? "the selected salon"} invoices.`
            : "Invoice list with backend-aligned payment status, totals, and itemized drill-down."
        }
        action={
          isSuperAdmin ? (
            <Button variant="outline" asChild>
              <Link to={`${routes.salons}/${salonBusinessId}`}>Back to salon</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={`${routes.invoices}/new`}>
                <Plus className="h-4 w-4" />
                New Invoice
              </Link>
            </Button>
          )
        }
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search by invoice number, branch, customer, or appointment"
        filters={
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-2">
            <Select
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              placeholder="Filter by payment status"
              options={[
                "PENDING",
                "PAID",
                "PARTIAL",
                "FAILED",
                "REFUNDED",
              ].map((status) => ({ label: status, value: status }))}
            />
          </div>
        }
      />

      <DataTable
        data={records}
        columns={[
          {
            id: "invoiceNumber",
            header: "Invoice",
            cell: (record) => (
              <div>
                <p className="font-semibold">{record.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground">{record.invoiceDate}</p>
              </div>
            ),
          },
          { id: "branch", header: "Branch", cell: (record) => branchMap[record.branchId] ?? record.branchId },
          { id: "customer", header: "Customer", cell: (record) => customerMap[record.customerProfileId] ?? record.customerProfileId },
          { id: "total", header: "Total", cell: (record) => formatCurrency(record.totalAmount), sortingValue: (record) => record.totalAmount },
          { id: "status", header: "Payment Status", cell: (record) => <StatusBadge status={record.paymentStatus} /> },
          {
            id: "actions",
            header: "Actions",
            cell: (record) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`${routes.invoices}/${record.id}`}>View</Link>
                </Button>
                {user?.role === "SALON_OWNER" || user?.role === "STAFF" ? (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`${routes.invoices}/${record.id}/edit`}>Edit</Link>
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
                  <p className="font-semibold">{record.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">{record.invoiceDate}</p>
                </div>
                <StatusBadge status={record.paymentStatus} />
              </div>
              <p className="text-sm text-muted-foreground">
                {customerMap[record.customerProfileId] ?? "Customer"} / {branchMap[record.branchId] ?? "Branch"}
              </p>
              <p className="font-semibold">{formatCurrency(record.totalAmount)}</p>
              <Button variant="outline" asChild>
                <Link to={`${routes.invoices}/${record.id}`}>View invoice</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      />
    </div>
  );
}
