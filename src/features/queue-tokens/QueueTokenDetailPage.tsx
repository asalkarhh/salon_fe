import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";
import { api, parseApiError } from "@/lib/api";
import type {
  BranchResponse,
  CustomerResponse,
  QueueTokenResponse,
  QueueTokenStatusUpdateRequest,
} from "@/types/api";

const statuses = ["WAITING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export function QueueTokenDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tokenQuery = useQuery({
    queryKey: ["queue-token", id],
    queryFn: async () => (await api.get<QueueTokenResponse>(`/api/queue-tokens/${id}`)).data,
    enabled: Boolean(id),
  });
  const branchesQuery = useQuery({
    queryKey: ["queue-token", "branches"],
    queryFn: async () => (await api.get<BranchResponse[]>("/api/branches")).data,
  });
  const customersQuery = useQuery({
    queryKey: ["queue-token", "customers"],
    queryFn: async () => (await api.get<CustomerResponse[]>("/api/customers")).data,
  });

  const patchMutation = useMutation({
    mutationFn: async (payload: QueueTokenStatusUpdateRequest) =>
      (await api.patch<QueueTokenResponse>(`/api/queue-tokens/${id}/status`, payload)).data,
    onSuccess: () => {
      toast.success("Queue status updated");
      void queryClient.invalidateQueries({ queryKey: ["queue-token", id] });
      void queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
    onError: (error) => toast.error(parseApiError(error)),
  });

  if (tokenQuery.isLoading || branchesQuery.isLoading || customersQuery.isLoading) {
    return <LoadingSpinner label="Loading queue token..." />;
  }

  if (tokenQuery.isError || branchesQuery.isError || customersQuery.isError || !tokenQuery.data) {
    return (
      <ErrorState
        title="Unable to load queue token"
        description={
          parseApiError(tokenQuery.error) ||
          parseApiError(branchesQuery.error) ||
          parseApiError(customersQuery.error)
        }
      />
    );
  }

  const branch = (branchesQuery.data ?? []).find((item) => item.id === tokenQuery.data.branchId);
  const customer = (customersQuery.data ?? []).find(
    (item) => item.id === tokenQuery.data.customerProfileId,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Queue Detail"
        title={`Token ${tokenQuery.data.tokenNumber}`}
        description={
          user?.role === "SUPER_ADMIN"
            ? "Read-only support view for queue status and timestamps."
            : "Live queue status and timestamps for this branch token."
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Branch</p>
            <p className="mt-2 text-sm font-medium">{branch?.branchName ?? tokenQuery.data.branchId}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Customer</p>
            <p className="mt-2 text-sm font-medium">
              {customer ? `${customer.firstName} ${customer.lastName ?? ""}`.trim() : tokenQuery.data.customerProfileId}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Token Date</p>
            <p className="mt-2 text-sm font-medium">{tokenQuery.data.tokenDate}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Status</p>
            <div className="mt-2">
              <StatusBadge status={tokenQuery.data.status} />
            </div>
          </div>
        </CardContent>
      </Card>

      {user?.role === "SALON_OWNER" || user?.role === "STAFF" ? (
        <Card>
          <CardHeader>
            <CardTitle>Update Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {statuses.map((status) => (
              <Button
                key={status}
                variant={tokenQuery.data?.status === status ? "default" : "outline"}
                onClick={() => patchMutation.mutate({ status })}
                disabled={patchMutation.isPending}
              >
                {status}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
