import { useEffect, useState } from "react";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";
import { api, parseApiError } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { BranchResponse, SalonBusinessResponse, StaffEarningResponse, StaffResponse } from "@/types/api";

function totalOf(records: StaffEarningResponse[], selector: (record: StaffEarningResponse) => number) {
  return records.reduce((sum, record) => sum + selector(record), 0);
}

/**
 * Earnings analytics screen backed by /api/staff-earnings plus salon, branch,
 * and staff lookups for filtering.
 */
export function StaffEarningsPage() {
  const { user } = useAuth();
  const [salonBusinessId, setSalonBusinessId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [staffId, setStaffId] = useState("");

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    setBranchId("");
    setStaffId("");
  }, [salonBusinessId]);

  useEffect(() => {
    setStaffId("");
  }, [branchId]);

  // The page loads filter lookups first, then fetches earnings through the
  // backend earnings endpoint using the currently selected filter set.
  const salonsQuery = useQuery({
    queryKey: ["staff-earnings", "salons"],
    queryFn: async () => (await api.get<SalonBusinessResponse[]>("/api/salons")).data,
    enabled: isSuperAdmin,
  });

  const branchesQuery = useQuery({
    queryKey: ["staff-earnings", "branches", salonBusinessId, isSuperAdmin],
    queryFn: async () =>
      (
        await api.get<BranchResponse[]>("/api/branches", {
          params: salonBusinessId ? { salonBusinessId } : undefined,
        })
      ).data,
  });

  const staffQuery = useQuery({
    queryKey: ["staff-earnings", "staff", salonBusinessId, branchId],
    queryFn: async () =>
      (
        await api.get<StaffResponse[]>("/api/staff", {
          params: {
            ...(salonBusinessId ? { salonBusinessId } : {}),
            ...(branchId ? { branchId } : {}),
          },
        })
      ).data,
  });

  const earningsQuery = useQuery({
    queryKey: ["staff-earnings", "records", salonBusinessId, branchId, staffId],
    queryFn: async () =>
      (
        await api.get<StaffEarningResponse[]>("/api/staff-earnings", {
          params: {
            ...(salonBusinessId ? { salonBusinessId } : {}),
            ...(branchId ? { branchId } : {}),
            ...(staffId ? { staffId } : {}),
          },
        })
      ).data,
  });

  const isLoading =
    earningsQuery.isLoading ||
    branchesQuery.isLoading ||
    staffQuery.isLoading ||
    (isSuperAdmin && salonsQuery.isLoading);

  const error =
    parseApiError(earningsQuery.error) ||
    parseApiError(branchesQuery.error) ||
    parseApiError(staffQuery.error) ||
    parseApiError(salonsQuery.error);

  const earnings = earningsQuery.data ?? [];
  const totalGross = totalOf(earnings, (record) => record.grossAmount);
  const totalEarned = totalOf(earnings, (record) => record.earningAmount);
  const chartData = earnings.map((earning) => ({
    name: earning.serviceName,
    earningAmount: earning.earningAmount,
  }));

  if (isLoading) {
    return <LoadingSpinner label="Loading staff earnings..." />;
  }

  if (earningsQuery.isError || branchesQuery.isError || staffQuery.isError || salonsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load staff earnings"
        description={error}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Revenue Share"
        title="Staff Earnings"
        description="Filter earnings by salon, branch, and staff so superadmin and owners can inspect payouts with proper business context."
      />

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-3">
          {isSuperAdmin ? (
            <SearchableSelect
              value={salonBusinessId}
              onValueChange={setSalonBusinessId}
              placeholder="Filter by salon"
              searchPlaceholder="Search salon"
              options={(salonsQuery.data ?? []).map((salon) => ({
                label: salon.businessName,
                value: salon.id,
                description: salon.salonCode,
              }))}
            />
          ) : null}

          <SearchableSelect
            value={branchId}
            onValueChange={setBranchId}
            placeholder="Filter by branch"
            searchPlaceholder="Search branch"
            options={(branchesQuery.data ?? []).map((branch) => ({
              label: branch.branchName,
              value: branch.id,
              description: branch.salonName,
            }))}
          />

          <SearchableSelect
            value={staffId}
            onValueChange={setStaffId}
            placeholder="Filter by staff"
            searchPlaceholder="Search staff"
            options={(staffQuery.data ?? []).map((staff) => ({
              label: `${staff.displayName} (${staff.staffCode})`,
              value: staff.id,
              description: [staff.branchName, staff.salonName].filter(Boolean).join(" / "),
            }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Records</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{earnings.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gross Revenue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatCurrency(totalGross)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Earned</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatCurrency(totalEarned)}</CardContent>
        </Card>
      </div>

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
          {earnings.length ? (
            earnings.map((earning) => (
              <div
                key={earning.id}
                className="grid gap-3 rounded-3xl border border-border/70 bg-secondary/25 p-5 md:grid-cols-5"
              >
                <div>
                  <p className="font-medium">{earning.staffDisplayName}</p>
                  <p className="text-xs text-muted-foreground">{earning.staffCode}</p>
                </div>
                <div>
                  <p className="font-medium">{earning.serviceName}</p>
                  <p className="text-xs text-muted-foreground">
                    {earning.branchName ?? earning.salonName}
                  </p>
                </div>
                <div>
                  <p className="font-medium">{formatCurrency(earning.grossAmount)}</p>
                  <p className="text-xs text-muted-foreground">Gross</p>
                </div>
                <div>
                  <p className="font-medium">{formatCurrency(earning.earningAmount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {earning.commissionPercentage}% share
                  </p>
                </div>
                <div>
                  <p className="font-medium">{earning.salonName}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(earning.createdAt)}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No earning records match the current filters.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
