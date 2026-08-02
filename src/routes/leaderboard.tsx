import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, Medal, Trophy, TrendingUp, Users } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { fetchLeaderboard, money, type LeaderRow } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — HopeX" },
      {
        name: "description",
        content: "See the top HopeX earners, investors and referrers ranked in real time.",
      },
      { property: "og:title", content: "Leaderboard — HopeX" },
      { property: "og:description", content: "Top earners and referrers on HopeX." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <Leaderboard />
      </DashboardLayout>
    </AuthGuard>
  ),
});

type Metric = "earnings" | "invested" | "referralEarnings";

const METRICS: { key: Metric; label: string; icon: typeof Trophy }[] = [
  { key: "earnings", label: "Top earners", icon: Trophy },
  { key: "invested", label: "Top investors", icon: TrendingUp },
  { key: "referralEarnings", label: "Top referrers", icon: Users },
];

const PODIUM = [
  { ring: "bg-gold/25 text-gold", icon: Crown },
  { ring: "bg-muted text-muted-foreground", icon: Medal },
  { ring: "bg-warning/20 text-warning", icon: Medal },
];

function Leaderboard() {
  const { t } = useT();
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [metric, setMetric] = useState<Metric>("earnings");

  useEffect(() => {
    void fetchLeaderboard().then(setRows);
  }, []);

  const sorted = [...(rows ?? [])].sort((a, b) => b[metric] - a[metric]).slice(0, 20);

  return (
    <div className="space-y-5">
      <SectionTitle
        title={t("Leaderboard")}
        subtitle={t("The highest performing HopeX investors this season.")}
      />

      <div className="grid grid-cols-3 gap-2">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={cn(
              "btn-glass flex h-[4.25rem] flex-col items-center justify-center gap-1.5 text-[11px] font-bold",
              metric === m.key ? "btn-glass-primary" : "text-foreground",
            )}
          >
            <m.icon className="h-4.5 w-4.5" />
            {t(m.label)}
          </button>
        ))}
      </div>

      {rows === null ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl glass-soft" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <GlassCard className="text-center text-sm text-muted-foreground">
          {t("No results yet — be the first to make the board.")}
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-3 items-end gap-2">
            {[1, 0, 2].map((idx) => {
              const row = sorted[idx];
              if (!row) return <div key={idx} />;
              const p = PODIUM[idx];
              return (
                <GlassCard
                  key={idx}
                  glow={idx === 0}
                  className={cn("p-3 text-center", idx === 0 && "pb-5 pt-6")}
                >
                  <span
                    className={cn("mx-auto grid h-11 w-11 place-items-center rounded-2xl", p.ring)}
                  >
                    <p.icon className="h-5 w-5" />
                  </span>
                  <p className="mt-2 truncate text-xs font-bold">{row.name}</p>
                  <p className="truncate font-display text-sm font-extrabold text-success">
                    {money(row[metric])}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    #{idx + 1}
                  </p>
                </GlassCard>
              );
            })}
          </div>

          <GlassCard className="divide-y divide-border/40 p-2">
            {sorted.map((row, i) => (
              <div key={`${row.name}-${i}`} className="flex items-center gap-3 p-3">
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black",
                    i < 3 ? "gradient-brand text-primary-foreground" : "glass-soft",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{row.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {t("Invested")} {money(row.invested)}
                  </span>
                </span>
                <span className="shrink-0 font-display text-sm font-extrabold text-success">
                  {money(row[metric])}
                </span>
              </div>
            ))}
          </GlassCard>
        </>
      )}

      <p className="text-center text-[11px] text-muted-foreground">
        {t("Names are partly hidden to protect investor privacy.")}
      </p>
    </div>
  );
}
