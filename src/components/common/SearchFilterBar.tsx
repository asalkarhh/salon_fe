import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filters?: React.ReactNode;
  action?: React.ReactNode;
}

export function SearchFilterBar({
  searchValue,
  onSearchChange,
  placeholder = "Search records",
  filters,
  action,
}: SearchFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-panel lg:flex-row lg:items-center lg:justify-between">
      <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={placeholder}
            className="pl-11"
          />
        </div>
        {filters}
      </div>
      {action}
    </div>
  );
}
