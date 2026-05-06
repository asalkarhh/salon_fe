import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export function ProtectedRoute() {
  const { hydrated, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!hydrated) {
    return <LoadingSpinner label="Restoring your salon workspace..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
