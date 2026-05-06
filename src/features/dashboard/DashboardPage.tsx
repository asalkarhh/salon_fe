import { useAuth } from "@/features/auth/AuthProvider";
import { CustomerDashboard } from "@/features/dashboard/CustomerDashboard";
import { OwnerDashboard } from "@/features/dashboard/OwnerDashboard";
import { StaffDashboard } from "@/features/dashboard/StaffDashboard";
import { SuperAdminDashboard } from "@/features/dashboard/SuperAdminDashboard";

export function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === "SUPER_ADMIN") {
    return <SuperAdminDashboard />;
  }

  if (user?.role === "SALON_OWNER") {
    return <OwnerDashboard />;
  }

  if (user?.role === "STAFF") {
    return <StaffDashboard />;
  }

  return <CustomerDashboard />;
}
