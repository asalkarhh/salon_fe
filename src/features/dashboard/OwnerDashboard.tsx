import { Link } from "react-router-dom";
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
import {
  CalendarClock,
  CreditCard,
  Users,
  Wallet,
} from "lucide-react";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { api, parseApiError } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { OwnerDashboardResponse } from "@/types/api";

const checklist = [
  { label: "Confirm salon", to: routes.mySalon },
  { label: "Set up service catalog", to: routes.services },
  { label: "Add customer", to: routes.customers },
  { label: "Add staff", to: routes.staff },
  { label: "Create appointment", to: routes.appointments },
  { label: "Create invoice", to: routes.invoices },
  { label: "Record payment", to: routes.payments },
];

export function OwnerDashboard() {
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "owner"],
    queryFn: async () => (await api.get<OwnerDashboardResponse>("/api/dashboard/owner")).data,
  });

  if (dashboardQuery.isLoading) {
    return <LoadingSpinner label="Loading owner dashboard..." />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <ErrorState
        title="Unable to load owner dashboard"
        description={parseApiError(dashboardQuery.error)}
      />
    );
  }

  const data = dashboardQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Salon Overview"
        title={data.salonName}
        description={`Track revenue, appointments, customer visits, and staff performance for ${data.salonCode}.`}
        action={
          <Button asChild>
            <Link to={routes.payroll}>Payroll Dashboard</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today Revenue" value={formatCurrency(data.todayRevenue)} icon={Wallet} />
        <StatCard label="Month Revenue" value={formatCurrency(data.currentMonthRevenue)} icon={CreditCard} />
        <StatCard label="Today Appointments" value={formatNumber(data.todayAppointments)} icon={CalendarClock} />
        <StatCard label="Active Staff" value={`${formatNumber(data.activeStaff)} / ${formatNumber(data.totalStaff)}`} icon={Users} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Staff Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.staffPerformance}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="staffName" stroke="#8f7a83" fontSize={12} />
                <YAxis stroke="#8f7a83" fontSize={12} />
                <Tooltip />
                <Bar dataKey="monthRevenueGenerated" radius={[10, 10, 0, 0]} fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklist.map((item, index) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/25 px-4 py-3 text-sm transition hover:bg-secondary/50"
              >
                <span>
                  {index + 1}. {item.label}
                </span>
                <span className="text-muted-foreground">Open</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Customers Served Today</p>
            <p className="mt-3 font-display text-4xl">{formatNumber(data.todayCustomersServed)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Customers This Month</p>
            <p className="mt-3 font-display text-4xl">{formatNumber(data.monthCustomersServed)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Appointments This Month</p>
            <p className="mt-3 font-display text-4xl">{formatNumber(data.monthAppointments)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/35 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Salon Code</p>
            <p className="mt-3 font-display text-4xl">{data.salonCode}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
