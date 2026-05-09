import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { logger } from "@/lib/logger";
import type { Role } from "@/types/enums";

export function RoleGuard({
  roles,
  children,
}: {
  roles: readonly Role[];
  children?: ReactNode;
}) {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!user || !roles.includes(user.role as Role)) {
      logger.info("authz", "role_guard_redirected", {
        pathname: location.pathname,
        requiredRoles: roles,
        currentRole: user?.role,
      });
    }
  }, [location.pathname, roles, user]);

  if (!user || !roles.includes(user.role as Role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
