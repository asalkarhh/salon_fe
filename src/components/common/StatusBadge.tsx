import { Badge } from "@/components/ui/badge";
import { labelize } from "@/lib/utils";

const statusVariantMap: Record<
  string,
  "default" | "success" | "warning" | "danger" | "info" | "outline"
> = {
  ACTIVE: "success",
  BOOKED: "warning",
  CANCELLED: "danger",
  COMPLETED: "success",
  CONFIRMED: "info",
  EXPIRED: "danger",
  FAILED: "danger",
  INACTIVE: "outline",
  IN_PROGRESS: "warning",
  NO_SHOW: "danger",
  PAID: "success",
  PARTIAL: "warning",
  PENDING: "outline",
  REFUNDED: "info",
  SUSPENDED: "danger",
  TRIAL: "info",
  WAITING: "warning",
};

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) {
    return <Badge variant="outline">—</Badge>;
  }

  return <Badge variant={statusVariantMap[status] ?? "default"}>{labelize(status)}</Badge>;
}
