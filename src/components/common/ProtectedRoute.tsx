import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { logger } from "@/lib/logger";

export function ProtectedRoute() {
  const { hydrated, isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      logger.info("auth", "protected_route_redirected", {
        pathname: location.pathname,
      });
    }
  }, [hydrated, isAuthenticated, location.pathname]);

  if (!hydrated) {
    return <LoadingSpinner label="Restoring your salon workspace..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
