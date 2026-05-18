import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Ticket, WalletCards } from "lucide-react";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { api, parseApiError } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { AppointmentResponse, QueueTokenResponse, StaffEarningResponse } from "@/types/api";

/**
 * Staff summary screen that combines appointments, queue tokens, and the
 * self-service earnings endpoint.
 */
export function StaffDashboard() {
  // Staff-facing cards intentionally reuse the same operational endpoints the
  // detailed modules use, keeping the summary honest and role-scoped.
  const appointmentsQuery = useQuery({
    queryKey: ["staff-dashboard", "appointments"],
    queryFn: async () => (await api.get<AppointmentResponse[]>("/api/appointments")).data,
  });
  const queueQuery = useQuery({
    queryKey: ["staff-dashboard", "queue"],
    queryFn: async () => (await api.get<QueueTokenResponse[]>("/api/queue-tokens")).data,
  });
  const earningsQuery = useQuery({
    queryKey: ["staff-dashboard", "earnings"],
    queryFn: async () =>
      (await api.get<StaffEarningResponse[]>("/api/staff-earnings/my-earnings")).data,
  });

  const isLoading =
    appointmentsQuery.isLoading || queueQuery.isLoading || earningsQuery.isLoading;
  const isError = appointmentsQuery.isError || queueQuery.isError || earningsQuery.isError;

  if (isLoading) {
    return <LoadingSpinner label="Loading staff dashboard..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Unable to load staff dashboard"
        description={
          parseApiError(appointmentsQuery.error) ||
          parseApiError(queueQuery.error) ||
          parseApiError(earningsQuery.error)
        }
      />
    );
  }

  const earnings = earningsQuery.data ?? [];
  const totalEarnings = earnings.reduce((sum, item) => sum + item.earningAmount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Staff Workspace"
        title="Operational Summary"
        description="Quick snapshot of the appointments, queue tokens, and earnings available to the current staff account."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Appointments"
          value={formatNumber(appointmentsQuery.data?.length)}
          icon={CalendarClock}
        />
        <StatCard
          label="Queue Tokens"
          value={formatNumber(queueQuery.data?.length)}
          icon={Ticket}
        />
        <StatCard
          label="My Earnings"
          value={formatCurrency(totalEarnings)}
          icon={WalletCards}
        />
      </div>
    </div>
  );
}
