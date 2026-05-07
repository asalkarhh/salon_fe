import { BusinessLogo } from "@/components/layout/BusinessLogo";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { ROLE_LABELS } from "@/lib/constants";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-white/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <MobileSidebar />
          <div className="lg:hidden">
            <BusinessLogo compact className="max-w-[210px]" />
          </div>
          <p className="hidden text-xs uppercase tracking-[0.32em] text-muted-foreground sm:block">
            Salon SaaS
          </p>
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              {user?.salonCode ? `${user.salonCode} Workspace` : "Platform Control Room"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-border/80 bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-sm font-semibold">{user?.fullName ?? "-"}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{user?.username ?? "-"}</span>
              <span>{user ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] : "-"}</span>
              {user?.salonCode ? <span>{user.salonCode}</span> : null}
            </div>
          </div>
          <Button variant="outline" className="hidden sm:inline-flex" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
