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
  Building2,
  Crown,
  Users,
  WalletCards,
} from "lucide-react";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { api, parseApiError } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { SuperAdminDashboardResponse } from "@/types/api";

/**
 * Super-admin summary screen backed by GET /api/dashboard/super-admin.
 */
export function SuperAdminDashboard() {
  // Loads the platform-wide dashboard aggregate from the dedicated backend
  // summary endpoint instead of composing separate client-side queries.
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "super-admin"],
    queryFn: async () =>
      (await api.get<SuperAdminDashboardResponse>("/api/dashboard/super-admin")).data,
  });

  if (dashboardQuery.isLoading) {
    return <LoadingSpinner label="Loading super admin dashboard..." />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <ErrorState
        title="Unable to load super admin dashboard"
        description={parseApiError(dashboardQuery.error)}
      />
    );
  }

  const data = dashboardQuery.data;
  const membershipChartData = [
    { name: "Active", value: data.activeMemberships },
    { name: "Trial", value: data.trialMemberships },
    { name: "Inactive", value: data.inactiveMemberships },
    { name: "Suspended", value: data.suspendedMemberships },
    { name: "Expired", value: data.expiredMemberships },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform Overview"
        title="Super Admin Dashboard"
        description="Real-time platform revenue, tenant health, and onboarding flow directly from the backend summary endpoint."
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to={routes.createOwner}>Create Salon Owner</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={routes.salons}>View Salons</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={routes.subscriptions}>View Subscriptions</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Salons" value={formatNumber(data.totalSalons)} icon={Building2} />
        <StatCard label="Today Revenue" value={formatCurrency(data.todayRevenue)} icon={WalletCards} />
        <StatCard label="Owners" value={formatNumber(data.totalOwners)} icon={Crown} />
        <StatCard label="Customers" value={formatNumber(data.totalCustomers)} icon={Users} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Membership Mix</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={membershipChartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#8f7a83" fontSize={12} />
                <YAxis stroke="#8f7a83" fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform KPIs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-secondary/40 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Active Salons</p>
              <p className="mt-3 font-display text-4xl">{formatNumber(data.activeSalons)}</p>
            </div>
            <div className="rounded-2xl bg-secondary/40 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Monthly Revenue</p>
              <p className="mt-3 font-display text-4xl">{formatCurrency(data.currentMonthRevenue)}</p>
            </div>
            <div className="rounded-2xl bg-secondary/40 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Staff</p>
              <p className="mt-3 font-display text-4xl">{formatNumber(data.totalStaff)}</p>
            </div>
            <div className="rounded-2xl bg-secondary/40 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Trial Memberships</p>
              <p className="mt-3 font-display text-4xl">{formatNumber(data.trialMemberships)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salon Portfolio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.salons.map((salon) => (
            <div
              key={salon.salonBusinessId}
              className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-secondary/25 p-5 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold">{salon.salonName}</p>
                  <StatusBadge status={salon.subscriptionStatus ?? undefined} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {salon.salonCode} • {salon.ownerName} ({salon.ownerUsername})
                </p>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3 lg:text-right">
                <span>{formatCurrency(salon.currentMonthRevenue)} revenue</span>
                <span>{formatNumber(salon.staffCount)} staff</span>
                <span>{formatNumber(salon.todayAppointments)} today</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
