import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { useAuth } from "@/features/auth/AuthProvider";
import { api, parseApiError } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { InvoiceResponse, PaymentResponse, SalonBusinessResponse } from "@/types/api";

/**
 * Payment list and support view backed by /api/payments and the invoice list
 * endpoint used to resolve invoice labels.
 */
export function PaymentsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const supportSalonId = searchParams.get("salonBusinessId") ?? "";
  const [salonBusinessId, setSalonBusinessId] = useState(supportSalonId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canLoadSupportView = !isSuperAdmin || Boolean(salonBusinessId);

  useEffect(() => {
    if (isSuperAdmin) {
      setSalonBusinessId(supportSalonId);
    }
  }, [isSuperAdmin, supportSalonId]);

  // Super-admin support mode resolves salon context first so payment browsing
  // stays read-only and tenant-scoped.
  const salonsQuery = useQuery({
    queryKey: ["payments", "salons"],
    queryFn: async () => (await api.get<SalonBusinessResponse[]>("/api/salons")).data,
    enabled: isSuperAdmin,
  });
  const invoicesQuery = useQuery({
    queryKey: ["payments", "invoices", isSuperAdmin ? salonBusinessId : "current-salon"],
    queryFn: async () =>
      (
        await api.get<InvoiceResponse[]>("/api/invoices", {
          params: isSuperAdmin ? { salonBusinessId } : undefined,
        })
      ).data,
    enabled: canLoadSupportView,
  });
  const paymentsQuery = useQuery({
    queryKey: ["payments", "list", isSuperAdmin ? salonBusinessId : "current-salon"],
    queryFn: async () =>
      (
        await api.get<PaymentResponse[]>("/api/payments", {
          params: isSuperAdmin ? { salonBusinessId } : undefined,
        })
      ).data,
    enabled: canLoadSupportView,
  });

  const selectedSalon = (salonsQuery.data ?? []).find((salon) => salon.id === salonBusinessId);
  const invoiceMap = Object.fromEntries((invoicesQuery.data ?? []).map((invoice) => [invoice.id, invoice]));

  if (isSuperAdmin && !supportSalonId && !salonsQuery.isLoading) {
    return (
      <ErrorState
        title="Salon context required"
        description="Open payments from a salon support link to keep the superadmin view scoped and read-only."
      />
    );
  }

  if (salonsQuery.isLoading || invoicesQuery.isLoading || paymentsQuery.isLoading) {
    return <LoadingSpinner label="Loading payments..." />;
  }

  if (salonsQuery.isError || invoicesQuery.isError || paymentsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load payments"
        description={
          parseApiError(salonsQuery.error) ||
          parseApiError(invoicesQuery.error) ||
          parseApiError(paymentsQuery.error)
        }
      />
    );
  }

  const records = (paymentsQuery.data ?? []).filter((payment) => {
    const invoice = invoiceMap[payment.invoiceId];
    const matchesStatus = !status || payment.status === status;
    const matchesSearch =
      !search.trim() ||
      [
        invoice?.invoiceNumber ?? "",
        payment.paymentMethod,
        payment.status,
        payment.transactionReference ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isSuperAdmin ? "Payment Support" : "Payments"}
        title={isSuperAdmin ? "Payment Support" : "Payments"}
        description={
          isSuperAdmin
            ? `Read-only support view for ${selectedSalon?.businessName ?? "the selected salon"} payments.`
            : "Invoice-linked payments with status tracking and transaction references."
        }
        action={
          isSuperAdmin ? (
            <Button variant="outline" asChild>
              <Link to={`${routes.salons}/${salonBusinessId}`}>Back to salon</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={`${routes.payments}/new`}>
                <Plus className="h-4 w-4" />
                New Payment
              </Link>
            </Button>
          )
        }
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search by invoice, method, status, or transaction reference"
        filters={
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              placeholder="Filter by payment status"
              options={[
                "PENDING",
                "PAID",
                "PARTIAL",
                "FAILED",
                "REFUNDED",
              ].map((item) => ({ label: item, value: item }))}
            />
          </div>
        }
      />

      <DataTable
        data={records}
        columns={[
          {
            id: "invoice",
            header: "Invoice",
            cell: (record) => (
              <div>
                <p className="font-semibold">
                  {invoiceMap[record.invoiceId]?.invoiceNumber ?? record.invoiceId}
                </p>
                <p className="text-xs text-muted-foreground">
                  {invoiceMap[record.invoiceId]?.invoiceDate ?? "Invoice date unavailable"}
                </p>
              </div>
            ),
          },
          {
            id: "amount",
            header: "Amount",
            cell: (record) => formatCurrency(record.amount),
            sortingValue: (record) => record.amount,
          },
          { id: "method", header: "Method", cell: (record) => record.paymentMethod },
          { id: "status", header: "Status", cell: (record) => <StatusBadge status={record.status} /> },
          { id: "paidAt", header: "Paid At", cell: (record) => formatDateTime(record.paidAt) },
          {
            id: "actions",
            header: "Actions",
            cell: (record) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`${routes.payments}/${record.id}`}>View</Link>
                </Button>
                {!isSuperAdmin ? (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`${routes.payments}/${record.id}/edit`}>Edit</Link>
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]}
        emptyTitle="No payments found"
        emptyDescription={
          isSuperAdmin
            ? "This salon has no payments for the current support view."
            : "Create a payment or adjust the current filters."
        }
        mobileCard={(record) => (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {invoiceMap[record.invoiceId]?.invoiceNumber ?? record.invoiceId}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(record.paidAt)}</p>
                </div>
                <StatusBadge status={record.status} />
              </div>
              <p className="text-sm text-muted-foreground">{record.paymentMethod}</p>
              <p className="font-semibold">{formatCurrency(record.amount)}</p>
              <Button variant="outline" asChild>
                <Link to={`${routes.payments}/${record.id}`}>View payment</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      />
    </div>
  );
}
