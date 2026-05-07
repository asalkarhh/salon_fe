import { Menu, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { BusinessLogo } from "@/components/layout/BusinessLogo";
import { menuItems } from "@/config/menu";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import { Button } from "@/components/ui/button";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const items = useMemo(
    () => menuItems.filter((item) => user && item.roles.includes(user.role as never)),
    [user],
  );

  return (
    <>
      <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/35 lg:hidden">
          <div className="absolute right-0 top-0 flex h-full w-[min(88vw,360px)] flex-col border-l border-white/60 bg-white/95 p-5 shadow-panel backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <BusinessLogo compact />
                <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                  Navigation
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold">{APP_NAME}</h2>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="mt-6 flex-1 space-y-2 overflow-y-auto">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary/80 hover:text-foreground",
                      location.pathname.startsWith(item.to) && item.to !== "/dashboard"
                        ? "bg-primary text-primary-foreground hover:text-primary-foreground"
                        : "",
                      location.pathname === item.to
                        ? "bg-primary text-primary-foreground hover:text-primary-foreground"
                        : "",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <Button variant="outline" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
