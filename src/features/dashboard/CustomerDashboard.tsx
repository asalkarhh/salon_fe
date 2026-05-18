import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { api, parseApiError } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { AppointmentResponse } from "@/types/api";

/**
 * Customer summary screen backed only by the appointment list endpoint because
 * that is the current backend surface available to customers.
 */
export function CustomerDashboard() {
  const appointmentsQuery = useQuery({
    queryKey: ["customer-dashboard", "appointments"],
    queryFn: async () => (await api.get<AppointmentResponse[]>("/api/appointments")).data,
  });

  if (appointmentsQuery.isLoading) {
    return <LoadingSpinner label="Loading customer dashboard..." />;
  }

  if (appointmentsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load customer dashboard"
        description={parseApiError(appointmentsQuery.error)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customer View"
        title="Appointment Snapshot"
        description="This customer workspace is limited to appointment visibility because the current backend exposes customer access only through appointment endpoints."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Visible Appointments"
          value={formatNumber(appointmentsQuery.data?.length)}
          icon={CalendarClock}
        />
      </div>
    </div>
  );
}
