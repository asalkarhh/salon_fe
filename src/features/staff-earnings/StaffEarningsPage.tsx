import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { api, parseApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { StaffEarningResponse, StaffResponse } from "@/types/api";

export function StaffEarningsPage() {
  const [staffId, setStaffId] = useState("");

  const staffQuery = useQuery({
    queryKey: ["staff-earnings", "staff-options"],
    queryFn: async () => (await api.get<StaffResponse[]>("/api/staff")).data,
  });

  const earningsQuery = useQuery({
    queryKey: ["staff-earnings", staffId],
    queryFn: async () =>
      (
        await api.get<StaffEarningResponse[]>("/api/staff-earnings", {
          params: staffId ? { staffId } : undefined,
        })
      ).data,
  });

  if (staffQuery.isLoading || earningsQuery.isLoading) {
    return <LoadingSpinner label="Loading staff earnings..." />;
  }

  if (staffQuery.isError || earningsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load staff earnings"
        description={parseApiError(staffQuery.error) || parseApiError(earningsQuery.error)}
      />
    );
  }

  const chartData = (earningsQuery.data ?? []).map((earning) => ({
    name: earning.serviceId.slice(0, 8),
    earningAmount: earning.earningAmount,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Revenue Share"
        title="Staff Earnings"
        description="Accessible earning records with optional staff-level filtering and charted payout totals."
      />

      <Card>
        <CardContent className="p-6">
          <Select
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
            placeholder="Filter by staff"
            options={(staffQuery.data ?? []).map((staff) => ({
              label: `${staff.displayName} (${staff.staffCode})`,
              value: staff.id,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Earning Chart</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#8f7a83" fontSize={12} />
              <YAxis stroke="#8f7a83" fontSize={12} />
              <Tooltip />
              <Bar dataKey="earningAmount" radius={[10, 10, 0, 0]} fill="hsl(var(--chart-4))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Earning Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(earningsQuery.data ?? []).map((earning) => (
            <div
              key={earning.id}
              className="grid gap-3 rounded-3xl border border-border/70 bg-secondary/25 p-5 md:grid-cols-4"
            >
              <span className="text-sm text-muted-foreground">Staff {earning.staffProfileId.slice(0, 8)}</span>
              <span className="text-sm text-muted-foreground">Service {earning.serviceId.slice(0, 8)}</span>
              <span className="text-sm text-muted-foreground">Gross {formatCurrency(earning.grossAmount)}</span>
              <span className="text-sm font-semibold text-foreground">
                Earned {formatCurrency(earning.earningAmount)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
