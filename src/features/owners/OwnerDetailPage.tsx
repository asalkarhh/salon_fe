import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/common/ErrorState";
import { FormSection } from "@/components/common/FormSection";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { api, parseApiError } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { OwnerResponse } from "@/types/api";

function detailItem(label: string, value: React.ReactNode) {
  return (
    <div className="rounded-2xl border border-border/80 bg-secondary/25 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <div className="mt-3 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export function OwnerDetailPage() {
  const { id } = useParams();

  const ownerQuery = useQuery({
    queryKey: ["owners", id],
    queryFn: async () => (await api.get<OwnerResponse>(`/api/owners/${id}`)).data,
    enabled: Boolean(id),
  });

  if (ownerQuery.isLoading) {
    return <LoadingSpinner label="Loading owner..." />;
  }

  if (ownerQuery.isError || !ownerQuery.data) {
    return (
      <ErrorState
        title="Unable to load owner"
        description={parseApiError(ownerQuery.error)}
      />
    );
  }

  const owner = ownerQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner Detail"
        title={owner.fullName}
        description="Superadmin detail view for owner identity, linked salon, and current subscription."
        action={
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link to={`${routes.salons}/${owner.salonBusinessId}`}>Open Salon</Link>
            </Button>
            <Button asChild>
              <Link to={`${routes.owners}/${owner.id}/edit`}>Edit</Link>
            </Button>
          </div>
        }
      />

      <FormSection title="Owner Information">
        <div className="grid gap-5 md:grid-cols-2">
          {detailItem("Full Name", owner.fullName)}
          {detailItem("Username", owner.username)}
          {detailItem("Email", owner.email)}
          {detailItem("Phone", owner.phone)}
          {detailItem("Account Status", <StatusBadge status={owner.status} />)}
          {detailItem("Created", formatDateTime(owner.createdAt))}
        </div>
      </FormSection>

      <FormSection title="Salon Information">
        <div className="grid gap-5 md:grid-cols-2">
          {detailItem("Business Name", owner.businessName)}
          {detailItem("Salon Code", owner.salonCode)}
          {detailItem("Salon Status", <StatusBadge status={owner.salonActive ? "ACTIVE" : "SUSPENDED"} />)}
          {detailItem("Branch Count", owner.branchCount)}
        </div>
      </FormSection>

      <FormSection title="Subscription">
        <div className="grid gap-5 md:grid-cols-2">
          {detailItem("Plan", owner.planName ?? "-")}
          {detailItem("Subscription Status", <StatusBadge status={owner.subscriptionStatus ?? undefined} />)}
          {detailItem("Trial Ends On", formatDate(owner.trialEndsOn))}
          {detailItem("Updated", formatDateTime(owner.updatedAt))}
        </div>
      </FormSection>
    </div>
  );
}
