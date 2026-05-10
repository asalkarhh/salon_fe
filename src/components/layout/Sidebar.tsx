import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { BusinessLogo } from "@/components/layout/BusinessLogo";
import { getMenuItems } from "@/config/menu";
import { useAuth } from "@/features/auth/AuthProvider";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { logout, user } = useAuth();

  return (
    <aside className="hidden min-h-screen w-[290px] shrink-0 border-r border-white/60 bg-white/80 px-5 py-6 backdrop-blur lg:flex lg:flex-col">
      <div className="glass-panel p-5">
        <BusinessLogo />
        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Premium Suite
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold">{APP_NAME}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Exact frontend mapping for your salon backend modules.
        </p>
      </div>

      <nav className="mt-6 flex-1 space-y-2">
        {getMenuItems(user?.role as never).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
      </nav>

      <button
        type="button"
        onClick={logout}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-medium text-foreground transition hover:bg-secondary/70"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </aside>
  );
}
