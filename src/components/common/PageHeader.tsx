import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-panel sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-3xl space-y-2">
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="section-title">{title}</h1>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {action ? (
        action
      ) : actionLabel && onAction ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : null}
    </div>
  );
}
