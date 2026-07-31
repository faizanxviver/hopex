import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/store";
import type { ReactNode } from "react";

export function GlassCard({
  children,
  className,
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5",
        glow && "glow",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  accent?: "primary" | "gold" | "success";
}) {
  return (
    <GlassCard className="relative overflow-hidden">
      <div
        className={cn(
          "absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl opacity-40",
          accent === "gold" ? "bg-gold" : accent === "success" ? "bg-success" : "bg-primary",
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 truncate font-display text-2xl font-extrabold sm:text-3xl">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {icon ? (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
            {icon}
          </span>
        ) : null}
      </div>
    </GlassCard>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-primary/12 text-primary border-primary/30",
    processing: "bg-primary/12 text-primary border-primary/30",
    approved: "bg-success/15 text-success border-success/30",
    completed: "bg-success/15 text-success border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        map[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
