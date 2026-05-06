import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, parseApiError } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { StaffEarningResponse } from "@/types/api";

export function MyEarningsPage() {
  const earningsQuery = useQuery({
    queryKey: ["my-earnings"],
    queryFn: async () =>
      (await api.get<StaffEarningResponse[]>("/api/staff-earnings/my-earnings")).data,
  });

  if (earningsQuery.isLoading) {
    return <LoadingSpinner label="Loading your earnings..." />;
  }

  if (earningsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load your earnings"
        description={parseApiError(earningsQuery.error)}
      />
    );
  }

  const total = (earningsQuery.data ?? []).reduce(
    (sum, entry) => sum + entry.earningAmount,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Staff Earnings"
        title="My Earnings"
        description="This page uses the dedicated staff self-service earnings endpoint."
      />

      <Card>
        <CardContent className="p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Total Earned</p>
          <p className="mt-3 font-display text-4xl">{formatCurrency(total)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Earning History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(earningsQuery.data ?? []).map((earning) => (
            <div
              key={earning.id}
              className="grid gap-3 rounded-3xl border border-border/70 bg-secondary/25 p-5 md:grid-cols-4"
            >
              <span className="text-sm text-muted-foreground">Service {earning.serviceId.slice(0, 8)}</span>
              <span className="text-sm text-muted-foreground">Invoice {earning.invoiceId.slice(0, 8)}</span>
              <span className="text-sm text-muted-foreground">{formatDateTime(earning.createdAt)}</span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(earning.earningAmount)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
