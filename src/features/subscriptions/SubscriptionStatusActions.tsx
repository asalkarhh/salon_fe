import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { api, parseApiError } from "@/lib/api";
import { labelize } from "@/lib/utils";
import type { SubscriptionResponse, SubscriptionStatusUpdateRequest } from "@/types/api";
import type { SubscriptionStatus } from "@/types/enums";

const compactStatuses: SubscriptionStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const fullStatuses: SubscriptionStatus[] = [
  "TRIAL",
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "EXPIRED",
  "CANCELLED",
];

interface SubscriptionStatusActionsProps {
  subscription: SubscriptionResponse;
  compact?: boolean;
}

export function SubscriptionStatusActions({
  subscription,
  compact = false,
}: SubscriptionStatusActionsProps) {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (status: SubscriptionStatus) =>
      (
        await api.patch<SubscriptionResponse>(
          `/api/subscriptions/${subscription.id}/status`,
          { status } satisfies SubscriptionStatusUpdateRequest,
        )
      ).data,
    onSuccess: () => {
      toast.success("Subscription status updated");
      void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["owners"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(parseApiError(error)),
  });

  const statuses = compact ? compactStatuses : fullStatuses;

  return (
    <div className="flex flex-wrap gap-2">
      {statuses
        .filter((status) => status !== subscription.status)
        .map((status) => (
          <ConfirmDialog
            key={status}
            title={`Set Subscription To ${labelize(status)}`}
            description={`This will change the current subscription status from ${labelize(subscription.status)} to ${labelize(status)}.`}
            actionLabel={`Set ${labelize(status)}`}
            onConfirm={() => updateStatusMutation.mutate(status)}
            destructive={status === "SUSPENDED" || status === "EXPIRED" || status === "CANCELLED"}
            trigger={
              <Button
                size="sm"
                variant={compact ? "outline" : "secondary"}
                disabled={updateStatusMutation.isPending}
              >
                {labelize(status)}
              </Button>
            }
          />
        ))}
    </div>
  );
}
