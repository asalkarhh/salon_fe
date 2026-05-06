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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, parseApiError } from "@/lib/api";
import { formatCurrency, formatNumber, labelize } from "@/lib/utils";
import type { PayrollSummaryResponse } from "@/types/api";

const today = new Date();

export function PayrollPage() {
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const payrollQuery = useQuery({
    queryKey: ["dashboard", "payroll", year, month],
    queryFn: async () =>
      (
        await api.get<PayrollSummaryResponse>("/api/dashboard/owner/payroll", {
          params: { year, month },
        })
      ).data,
  });

  if (payrollQuery.isLoading) {
    return <LoadingSpinner label="Loading payroll dashboard..." />;
  }

  if (payrollQuery.isError || !payrollQuery.data) {
    return (
      <ErrorState
        title="Unable to load payroll"
        description={parseApiError(payrollQuery.error)}
      />
    );
  }

  const data = payrollQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner Payroll"
        title={`Payroll / ${data.salonCode}`}
        description="Monthly payroll summary powered by the backend payroll dashboard endpoint."
      />

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="payroll-year">Year</Label>
            <Input
              id="payroll-year"
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payroll-month">Month</Label>
            <Input
              id="payroll-month"
              type="number"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={() => payrollQuery.refetch()}>Refresh</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Total Payroll</p>
            <p className="mt-3 font-display text-4xl">{formatCurrency(data.totalPayroll)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Staff Count</p>
            <p className="mt-3 font-display text-4xl">{formatNumber(data.staff.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Period</p>
            <p className="mt-3 font-display text-4xl">{data.month}/{data.year}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout by Staff</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.staff}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="staffName" stroke="#8f7a83" fontSize={12} />
              <YAxis stroke="#8f7a83" fontSize={12} />
              <Tooltip />
              <Bar dataKey="totalPayout" radius={[10, 10, 0, 0]} fill="hsl(var(--chart-3))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Detail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.staff.map((staff) => (
            <div
              key={staff.staffId}
              className="grid gap-3 rounded-3xl border border-border/70 bg-secondary/25 p-5 md:grid-cols-5"
            >
              <div>
                <p className="font-semibold">{staff.staffName}</p>
                <p className="text-sm text-muted-foreground">{staff.staffCode}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                {labelize(staff.compensationType)}
              </div>
              <div className="text-sm text-muted-foreground">
                Revenue {formatCurrency(staff.revenueGenerated)}
              </div>
              <div className="text-sm text-muted-foreground">
                Commission {formatCurrency(staff.commissionEarned)}
              </div>
              <div className="text-sm font-semibold text-foreground">
                Payout {formatCurrency(staff.totalPayout)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
