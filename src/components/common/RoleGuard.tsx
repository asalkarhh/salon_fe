import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Role } from "@/types/enums";

export function RoleGuard({
  roles,
  children,
}: {
  roles: readonly Role[];
  children?: ReactNode;
}) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role as Role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
