import asalkarLogo from "@/assets/asalkar-logo.png";
import { cn } from "@/lib/utils";

interface BusinessLogoProps {
  compact?: boolean;
  invert?: boolean;
  className?: string;
}

export function BusinessLogo({ compact = false, invert = false, className }: BusinessLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-sm ring-1 ring-black/5">
        <img
          src={asalkarLogo}
          alt="Asalkar TechWork logo"
          className="h-full w-full object-contain"
        />
      </div>
      <div className="min-w-0">
        <p className={cn("text-xs uppercase tracking-[0.3em] text-muted-foreground", invert && "text-white/70")}>
          Powered By
        </p>
        <p
          className={cn(
            "truncate font-display text-lg font-semibold text-foreground",
            compact && "text-base",
            invert && "text-white",
          )}
        >
          Asalkar TechWork
        </p>
      </div>
    </div>
  );
}
