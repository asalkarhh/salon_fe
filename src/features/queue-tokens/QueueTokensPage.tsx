import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { api, parseApiError } from "@/lib/api";
import { routes } from "@/config/routes";
import { useAuth } from "@/features/auth/AuthProvider";
import type {
  BranchResponse,
  CustomerResponse,
  QueueTokenResponse,
  SalonBusinessResponse,
} from "@/types/api";

/**
 * Queue token list and support view backed by /api/queue-tokens plus supporting
 * branch, customer, and salon lookups.
 */
export function QueueTokensPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const supportSalonId = searchParams.get("salonBusinessId") ?? "";
  const [search, setSearch] = useState("");
  const [salonBusinessId, setSalonBusinessId] = useState(supportSalonId);
  const [branchId, setBranchId] = useState("");
  const [tokenDate, setTokenDate] = useState("");
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canLoadSupportView = !isSuperAdmin || Boolean(salonBusinessId);

  useEffect(() => {
    if (isSuperAdmin) {
      setSalonBusinessId(supportSalonId);
      setBranchId("");
    }
  }, [isSuperAdmin, supportSalonId]);

  // Super-admin support mode resolves the salon first so queue browsing stays
  // scoped to a single tenant.
  const salonsQuery = useQuery({
    queryKey: ["queue", "salons"],
    queryFn: async () => (await api.get<SalonBusinessResponse[]>("/api/salons")).data,
    enabled: isSuperAdmin,
  });
  const branchesQuery = useQuery({
    queryKey: ["queue", "branches"],
    queryFn: async () => (await api.get<BranchResponse[]>("/api/branches")).data,
  });
  const customersQuery = useQuery({
    queryKey: ["queue", "customers"],
    queryFn: async () => (await api.get<CustomerResponse[]>("/api/customers")).data,
  });
  const queueQuery = useQuery({
    queryKey: ["queue", "list", salonBusinessId, branchId, tokenDate],
    queryFn: async () =>
      (
        await api.get<QueueTokenResponse[]>("/api/queue-tokens", {
          params: {
            salonBusinessId: salonBusinessId || undefined,
            branchId: branchId || undefined,
            tokenDate: tokenDate || undefined,
          },
        })
      ).data,
    enabled: canLoadSupportView,
  });
  const filteredBranches = useMemo(() => {
    if (!isSuperAdmin || !salonBusinessId) {
      return branchesQuery.data ?? [];
    }
    return (branchesQuery.data ?? []).filter((branch) => branch.salonBusinessId === salonBusinessId);
  }, [branchesQuery.data, isSuperAdmin, salonBusinessId]);
  const selectedSalon = (salonsQuery.data ?? []).find((salon) => salon.id === salonBusinessId);

  const branchMap = Object.fromEntries((branchesQuery.data ?? []).map((branch) => [branch.id, branch.branchName]));
  const customerMap = Object.fromEntries(
    (customersQuery.data ?? []).map((customer) => [
      customer.id,
      `${customer.firstName} ${customer.lastName ?? ""}`.trim(),
    ]),
  );

  if (isSuperAdmin && !supportSalonId && !salonsQuery.isLoading) {
    return (
      <ErrorState
        title="Salon context required"
        description="Open queue tokens from a salon support link to keep the superadmin view scoped and read-only."
      />
    );
  }

  if (queueQuery.isLoading || branchesQuery.isLoading || customersQuery.isLoading || salonsQuery.isLoading) {
    return <LoadingSpinner label="Loading queue tokens..." />;
  }

  if (queueQuery.isError || branchesQuery.isError || customersQuery.isError || salonsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load queue tokens"
        description={
          parseApiError(queueQuery.error) ||
          parseApiError(branchesQuery.error) ||
          parseApiError(customersQuery.error) ||
          parseApiError(salonsQuery.error)
        }
      />
    );
  }

  const records = (queueQuery.data ?? []).filter((token) => {
    const matchesSalon = !salonBusinessId || token.salonBusinessId === salonBusinessId;
    if (!search.trim()) {
      return matchesSalon;
    }

    return matchesSalon && [
      String(token.tokenNumber),
      branchMap[token.branchId] ?? "",
      customerMap[token.customerProfileId] ?? "",
      token.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isSuperAdmin ? "Queue Support" : "Queue Management"}
        title={isSuperAdmin ? "Queue Support" : "Queue Tokens"}
        description={
          isSuperAdmin
            ? `Read-only support view for ${selectedSalon?.businessName ?? "the selected salon"} queue tokens.`
            : "Track walk-ins, token order, and live queue status with branch and date filters."
        }
        action={
          isSuperAdmin ? (
            <Button variant="outline" asChild>
              <Link to={`${routes.salons}/${salonBusinessId}`}>Back to salon</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={`${routes.queueTokens}/new`}>
                <Plus className="h-4 w-4" />
                New Queue Token
              </Link>
            </Button>
          )
        }
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search by token, branch, customer, or status"
        filters={
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-2">
            <div>
              <Select
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                placeholder="Filter by branch"
                options={filteredBranches.map((branch) => ({
                  label: branch.branchName,
                  value: branch.id,
                }))}
              />
            </div>
            <input
              type="date"
              value={tokenDate}
              onChange={(event) => setTokenDate(event.target.value)}
              className="flex h-11 min-w-[220px] rounded-2xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>
        }
      />

      <DataTable
        data={records}
        columns={[
          {
            id: "token",
            header: "Token",
            cell: (record) => (
              <div>
                <p className="font-display text-3xl">{record.tokenNumber}</p>
                <p className="text-xs text-muted-foreground">{record.id.slice(0, 8)}</p>
              </div>
            ),
            sortingValue: (record) => record.tokenNumber,
          },
          {
            id: "branch",
            header: "Branch",
            cell: (record) => branchMap[record.branchId] ?? record.branchId,
          },
          {
            id: "customer",
            header: "Customer",
            cell: (record) => customerMap[record.customerProfileId] ?? record.customerProfileId,
          },
          {
            id: "status",
            header: "Status",
            cell: (record) => <StatusBadge status={record.status} />,
          },
          {
            id: "actions",
            header: "Actions",
            cell: (record) => (
              <Button size="sm" variant="outline" asChild>
                <Link to={`${routes.queueTokens}/${record.id}`}>View</Link>
              </Button>
            ),
          },
        ]}
        mobileCard={(record) => (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <p className="font-display text-4xl">{record.tokenNumber}</p>
                <StatusBadge status={record.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {branchMap[record.branchId] ?? "Branch"} / {customerMap[record.customerProfileId] ?? "Customer"}
              </p>
              <Button variant="outline" asChild>
                <Link to={`${routes.queueTokens}/${record.id}`}>View token</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      />
    </div>
  );
}
