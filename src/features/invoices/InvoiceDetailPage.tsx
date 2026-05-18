import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, parseApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type {
  AppointmentResponse,
  BranchResponse,
  CustomerResponse,
  InvoiceResponse,
  ServiceResponse,
} from "@/types/api";

/**
 * Read-only invoice detail screen backed by the invoice detail endpoint and the
 * supporting lookups needed to render labels for related ids.
 */
export function InvoiceDetailPage() {
  const { id } = useParams();

  const invoiceQuery = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => (await api.get<InvoiceResponse>(`/api/invoices/${id}`)).data,
    enabled: Boolean(id),
  });
  const branchesQuery = useQuery({
    queryKey: ["invoice", "branches"],
    queryFn: async () => (await api.get<BranchResponse[]>("/api/branches")).data,
  });
  const customersQuery = useQuery({
    queryKey: ["invoice", "customers"],
    queryFn: async () => (await api.get<CustomerResponse[]>("/api/customers")).data,
  });
  const appointmentsQuery = useQuery({
    queryKey: ["invoice", "appointments"],
    queryFn: async () => (await api.get<AppointmentResponse[]>("/api/appointments")).data,
  });
  const servicesQuery = useQuery({
    queryKey: ["invoice", "services"],
    queryFn: async () => (await api.get<ServiceResponse[]>("/api/services")).data,
  });

  if (
    invoiceQuery.isLoading ||
    branchesQuery.isLoading ||
    customersQuery.isLoading ||
    appointmentsQuery.isLoading ||
    servicesQuery.isLoading
  ) {
    return <LoadingSpinner label="Loading invoice..." />;
  }

  if (
    invoiceQuery.isError ||
    branchesQuery.isError ||
    customersQuery.isError ||
    appointmentsQuery.isError ||
    servicesQuery.isError ||
    !invoiceQuery.data
  ) {
    return (
      <ErrorState
        title="Unable to load invoice"
        description={
          parseApiError(invoiceQuery.error) ||
          parseApiError(branchesQuery.error) ||
          parseApiError(customersQuery.error) ||
          parseApiError(appointmentsQuery.error) ||
          parseApiError(servicesQuery.error)
        }
      />
    );
  }

  const invoice = invoiceQuery.data;
  const branch = (branchesQuery.data ?? []).find((item) => item.id === invoice.branchId);
  const customer = (customersQuery.data ?? []).find((item) => item.id === invoice.customerProfileId);
  const appointment = (appointmentsQuery.data ?? []).find((item) => item.id === invoice.appointmentId);
  // Supporting lookups stay separate from the invoice detail call so the page
  // can render human-readable labels without expanding the invoice payload.
  const serviceMap = Object.fromEntries((servicesQuery.data ?? []).map((service) => [service.id, service.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Invoice Detail"
        title={invoice.invoiceNumber}
        description="Printable invoice summary with backend-calculated totals and itemized lines."
        action={<Button onClick={() => window.print()}>Print Invoice</Button>}
      />

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Branch</p>
            <p className="mt-2 text-sm font-medium">{branch?.branchName ?? invoice.branchId}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Customer</p>
            <p className="mt-2 text-sm font-medium">
              {customer ? `${customer.firstName} ${customer.lastName ?? ""}`.trim() : invoice.customerProfileId}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Appointment</p>
            <p className="mt-2 text-sm font-medium">
              {appointment ? `${appointment.appointmentDate} / ${appointment.startTime.slice(0, 5)}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Payment Status</p>
            <div className="mt-2">
              <StatusBadge status={invoice.paymentStatus} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoice.items.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-3xl border border-border/70 bg-secondary/25 p-4 md:grid-cols-4"
            >
              <span>{serviceMap[item.serviceId] ?? item.description}</span>
              <span>{item.quantity} x {formatCurrency(item.unitPrice)}</span>
              <span>{item.description}</span>
              <span className="font-semibold">{formatCurrency(item.lineTotal)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Subtotal</p>
            <p className="mt-3 font-display text-3xl">{formatCurrency(invoice.subtotalAmount)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Tax</p>
            <p className="mt-3 font-display text-3xl">{formatCurrency(invoice.taxAmount)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Discount</p>
            <p className="mt-3 font-display text-3xl">{formatCurrency(invoice.discountAmount)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Total</p>
            <p className="mt-3 font-display text-3xl">{formatCurrency(invoice.totalAmount)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
