export function LoadingSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
