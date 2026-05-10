import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Receipt } from "lucide-react";
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
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import type {
  AppointmentResponse,
  BranchResponse,
  CustomerResponse,
  InvoiceResponse,
  PaymentResponse,
} from "@/types/api";

type BillingTab = "invoices" | "payments";

const paymentStatusOptions = [
  "PENDING",
  "PAID",
  "PARTIAL",
  "FAILED",
  "REFUNDED",
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

export function OwnerBillingPage() {
  const [activeTab, setActiveTab] = useState<BillingTab>("invoices");
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  const branchesQuery = useQuery({
    queryKey: ["owner-billing", "branches"],
    queryFn: async () => (await api.get<BranchResponse[]>("/api/branches")).data,
  });
  const customersQuery = useQuery({
    queryKey: ["owner-billing", "customers"],
    queryFn: async () => (await api.get<CustomerResponse[]>("/api/customers")).data,
  });
  const appointmentsQuery = useQuery({
    queryKey: ["owner-billing", "appointments"],
    queryFn: async () => (await api.get<AppointmentResponse[]>("/api/appointments")).data,
  });
  const invoicesQuery = useQuery({
    queryKey: ["owner-billing", "invoices"],
    queryFn: async () => (await api.get<InvoiceResponse[]>("/api/invoices")).data,
  });
  const paymentsQuery = useQuery({
    queryKey: ["owner-billing", "payments"],
    queryFn: async () => (await api.get<PaymentResponse[]>("/api/payments")).data,
  });

  const isLoading =
    branchesQuery.isLoading
    || customersQuery.isLoading
    || appointmentsQuery.isLoading
    || invoicesQuery.isLoading
    || paymentsQuery.isLoading;

  if (isLoading) {
    return <LoadingSpinner label="Loading billing..." />;
  }

  if (
    branchesQuery.isError
    || customersQuery.isError
    || appointmentsQuery.isError
    || invoicesQuery.isError
    || paymentsQuery.isError
  ) {
    return (
      <ErrorState
        title="Unable to load billing"
        description={
          parseApiError(branchesQuery.error)
          || parseApiError(customersQuery.error)
          || parseApiError(appointmentsQuery.error)
          || parseApiError(invoicesQuery.error)
          || parseApiError(paymentsQuery.error)
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
  const appointmentMap = Object.fromEntries(
    (appointmentsQuery.data ?? []).map((appointment) => [
      appointment.id,
      `${appointment.appointmentDate} ${appointment.startTime.slice(0, 5)}`,
    ]),
  );
  const invoiceMap = Object.fromEntries((invoicesQuery.data ?? []).map((invoice) => [invoice.id, invoice]));

  const invoiceRecords = (invoicesQuery.data ?? []).filter((invoice) => {
    const matchesBranch = !branchId || invoice.branchId === branchId;
    const matchesStatus = !invoiceStatus || invoice.paymentStatus === invoiceStatus;
    const matchesSearch =
      !search.trim()
      || [
        invoice.invoiceNumber,
        customerMap[invoice.customerProfileId] ?? "",
        branchMap[invoice.branchId] ?? "",
        appointmentMap[invoice.appointmentId ?? ""] ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesBranch && matchesStatus && matchesSearch;
  });

  const paymentRecords = (paymentsQuery.data ?? []).filter((payment) => {
    const linkedInvoice = invoiceMap[payment.invoiceId];
    const matchesBranch = !branchId || linkedInvoice?.branchId === branchId;
    const matchesStatus = !paymentStatus || payment.status === paymentStatus;
    const matchesSearch =
      !search.trim()
      || [
        linkedInvoice?.invoiceNumber ?? "",
        branchMap[linkedInvoice?.branchId ?? ""] ?? "",
        payment.paymentMethod,
        payment.status,
        payment.transactionReference ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesBranch && matchesStatus && matchesSearch;
  });

  const openInvoicesCount = (invoicesQuery.data ?? []).filter(
    (invoice) => invoice.paymentStatus !== "PAID" && invoice.paymentStatus !== "REFUNDED",
  ).length;
  const recordedPaymentsTotal = (paymentsQuery.data ?? []).reduce(
    (sum, payment) => sum + Number(payment.amount ?? 0),
    0,
  );

  const branchOptions = (branchesQuery.data ?? []).map((branch) => ({
    label: branch.branchName,
    value: branch.id,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner Operations"
        title="Billing"
        description="Create bills, review collections, and record payments from one place instead of jumping between separate billing modules."
        action={(
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to={`${routes.invoices}/new`}>
                <Receipt className="h-4 w-4" />
                Create Bill
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`${routes.payments}/new`}>
                <CreditCard className="h-4 w-4" />
                Collect Payment
              </Link>
            </Button>
          </div>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/15 bg-primary/5">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Needs Collection</p>
            <p className="mt-3 font-display text-4xl">{openInvoicesCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Invoices that are still pending or partially paid.</p>
          </CardContent>
        </Card>
        <Card className="border-secondary/70">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Payments Recorded</p>
            <p className="mt-3 font-display text-4xl">{formatCurrency(recordedPaymentsTotal)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Total payment amount captured in the current salon.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Switch between bills and collected payments</p>
            <p className="text-sm text-muted-foreground">Owners can follow the full cash-collection flow without changing modules.</p>
          </div>
          <div className="inline-flex rounded-2xl border border-border/80 bg-secondary/30 p-1">
            {[
              { key: "invoices", label: "Bills" },
              { key: "payments", label: "Payments" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as BillingTab)}
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
          activeTab === "invoices"
            ? "Search by invoice number, branch, customer, or appointment"
            : "Search by invoice, branch, method, status, or reference"
        }
        filters={(
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              placeholder="Filter by branch"
              options={branchOptions}
            />
            <Select
              value={activeTab === "invoices" ? invoiceStatus : paymentStatus}
              onChange={(event) =>
                activeTab === "invoices"
                  ? setInvoiceStatus(event.target.value)
                  : setPaymentStatus(event.target.value)
              }
              placeholder="Filter by payment status"
              options={paymentStatusOptions}
            />
          </div>
        )}
      />

      {activeTab === "invoices" ? (
        <DataTable
          data={invoiceRecords}
          columns={[
            {
              id: "invoiceNumber",
              header: "Bill",
              cell: (record) => (
                <div>
                  <p className="font-semibold">{record.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">{record.invoiceDate}</p>
                </div>
              ),
            },
            { id: "branch", header: "Branch", cell: (record) => branchMap[record.branchId] ?? record.branchId },
            { id: "customer", header: "Customer", cell: (record) => customerMap[record.customerProfileId] ?? record.customerProfileId },
            {
              id: "total",
              header: "Total",
              cell: (record) => formatCurrency(record.totalAmount),
              sortingValue: (record) => record.totalAmount,
            },
            { id: "status", header: "Payment Status", cell: (record) => <StatusBadge status={record.paymentStatus} /> },
            {
              id: "actions",
              header: "Actions",
              cell: (record) => (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`${routes.invoices}/${record.id}`}>View</Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`${routes.invoices}/${record.id}/edit`}>Edit</Link>
                  </Button>
                  {record.paymentStatus !== "PAID" && record.paymentStatus !== "REFUNDED" ? (
                    <Button size="sm" asChild>
                      <Link to={buildPath(`${routes.payments}/new`, { invoiceId: record.id })}>
                        <CreditCard className="h-4 w-4" />
                        Collect Payment
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
          emptyTitle="No bills found"
          emptyDescription="Create a bill or adjust your current filters."
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
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" asChild>
                    <Link to={`${routes.invoices}/${record.id}`}>View</Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to={`${routes.invoices}/${record.id}/edit`}>Edit</Link>
                  </Button>
                  {record.paymentStatus !== "PAID" && record.paymentStatus !== "REFUNDED" ? (
                    <Button asChild>
                      <Link to={buildPath(`${routes.payments}/new`, { invoiceId: record.id })}>
                        Collect Payment
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )}
        />
      ) : (
        <DataTable
          data={paymentRecords}
          columns={[
            {
              id: "invoice",
              header: "Bill",
              cell: (record) => (
                <div>
                  <p className="font-semibold">
                    {invoiceMap[record.invoiceId]?.invoiceNumber ?? record.invoiceId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {branchMap[invoiceMap[record.invoiceId]?.branchId ?? ""] ?? "Branch unavailable"}
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
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`${routes.payments}/${record.id}`}>View</Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`${routes.payments}/${record.id}/edit`}>Edit</Link>
                  </Button>
                </div>
              ),
            },
          ]}
          emptyTitle="No payments found"
          emptyDescription="Record a payment or adjust your current filters."
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
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" asChild>
                    <Link to={`${routes.payments}/${record.id}`}>View</Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to={`${routes.payments}/${record.id}/edit`}>Edit</Link>
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
