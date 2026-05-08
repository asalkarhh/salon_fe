import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { api, parseApiError } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { OwnerResponse } from "@/types/api";

function ownerMatchesSearch(owner: OwnerResponse, search: string) {
  const needle = search.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  return [
    owner.fullName,
    owner.username,
    owner.email,
    owner.phone,
    owner.businessName,
    owner.salonCode,
    owner.planName ?? "",
    owner.subscriptionStatus ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export function OwnersPage() {
  const [search, setSearch] = useState("");

  const ownersQuery = useQuery({
    queryKey: ["owners"],
    queryFn: async () => (await api.get<OwnerResponse[]>("/api/owners")).data,
  });

  const owners = useMemo(
    () => (ownersQuery.data ?? []).filter((owner) => ownerMatchesSearch(owner, search)),
    [ownersQuery.data, search],
  );

  if (ownersQuery.isError) {
    return (
      <ErrorState
        title="Unable to load owners"
        description={parseApiError(ownersQuery.error)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner Management"
        title="Owners"
        description="Superadmin workspace for salon owner onboarding, account review, and linked salon visibility."
        action={
          <Button asChild>
            <Link to={`${routes.owners}/new`}>Create Owner</Link>
          </Button>
        }
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search owners, salons, plans, or contact details"
      />

      <DataTable
        data={owners}
        loading={ownersQuery.isLoading}
        emptyTitle="No owners found"
        emptyDescription="Create the first salon owner or widen the current search."
        columns={[
          {
            id: "owner",
            header: "Owner",
            cell: (owner) => (
              <div>
                <p className="font-semibold">{owner.fullName}</p>
                <p className="text-xs text-muted-foreground">{owner.username}</p>
              </div>
            ),
            sortingValue: (owner) => owner.fullName,
          },
          {
            id: "salon",
            header: "Salon",
            cell: (owner) => (
              <div>
                <p>{owner.businessName}</p>
                <p className="text-xs text-muted-foreground">{owner.salonCode}</p>
              </div>
            ),
            sortingValue: (owner) => owner.businessName,
          },
          {
            id: "subscription",
            header: "Subscription",
            cell: (owner) => (
              <div className="space-y-1">
                <p>{owner.planName ?? "-"}</p>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={owner.subscriptionStatus ?? undefined} />
                  <span className="text-xs text-muted-foreground">
                    Trial ends {formatDate(owner.trialEndsOn)}
                  </span>
                </div>
              </div>
            ),
          },
          {
            id: "branches",
            header: "Branches",
            cell: (owner) => owner.branchCount,
            sortingValue: (owner) => owner.branchCount,
          },
          {
            id: "status",
            header: "Status",
            cell: (owner) => (
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={owner.status} />
                <StatusBadge status={owner.salonActive ? "ACTIVE" : "SUSPENDED"} />
              </div>
            ),
          },
          {
            id: "actions",
            header: "Actions",
            cell: (owner) => (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`${routes.owners}/${owner.id}`}>View</Link>
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link to={`${routes.owners}/${owner.id}/edit`}>Edit</Link>
                </Button>
              </div>
            ),
          },
        ]}
        mobileCard={(owner) => (
          <Card>
            <CardContent className="space-y-2 p-5">
              <p className="text-sm font-semibold">{owner.fullName}</p>
              <p className="text-xs text-muted-foreground">{owner.businessName}</p>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={owner.status} />
                <StatusBadge status={owner.subscriptionStatus ?? undefined} />
              </div>
              <p className="text-xs text-muted-foreground">
                Created {formatDateTime(owner.createdAt)}
              </p>
            </CardContent>
          </Card>
        )}
      />
    </div>
  );
}
