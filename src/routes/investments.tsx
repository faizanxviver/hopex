import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Coins, Gem, TrendingUp } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { Progress } from "@/components/ui/progress";
import { investmentProgress, money, myInvestments, useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/investments")({
  head: () => ({
    meta: [
      { title: "My Active Plans — HopeX" },
      {
        name: "description",
        content: "Track every investment plan you own, its daily income, progress and total earnings.",
      },
      { property: "og:title", content: "My Active Plans — HopeX" },
      { property: "og:description", content: "Daily income, progress and earnings per plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <Investments />
      </DashboardLayout>
    </AuthGuard>
  ),
});

function Investments() {
  const { db, user } = useStore();
  const { t } = useT();
  if (!user) return null;

  const list = myInvestments(db, user.id);
  const totalDaily = list.reduce((a, i) => a + (i.amount * i.dailyRoi) / 100, 0);
  const totalEarned = list.reduce((a, i) => a + i.earned, 0);
  const totalCapital = list.reduce((a, i) => a + i.amount, 0);

  return (
    <div className="space-y-5">
      <SectionTitle title={t("My active plans")} subtitle={t("Every plan you own and what it pays.")} />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: t("Invested"), value: money(totalCapital), icon: Gem, tone: "" },
          { label: t("Daily income"), value: money(totalDaily), icon: Coins, tone: "text-success" },
          { label: t("Earned"), value: money(totalEarned), icon: TrendingUp, tone: "text-gold" },
        ].map((s) => (
          <GlassCard key={s.label} className="p-3 sm:p-4">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              <s.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{s.label}</span>
            </p>
            <p className={`mt-1 truncate font-display text-base font-extrabold sm:text-xl ${s.tone}`}>
              {s.value}
            </p>
          </GlassCard>
        ))}
      </div>

      {list.length === 0 ? (
        <GlassCard className="text-center" glow>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Gem className="h-6 w-6" />
          </span>
          <p className="mt-4 font-display text-lg font-extrabold">{t("No active plans yet")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Activate a plan to start earning daily income.")}
          </p>
          <Link
            to="/plans"
            className="btn-glass btn-glass-primary mx-auto mt-5 flex h-12 max-w-xs items-center justify-center text-sm font-bold"
          >
            {t("Investment plans")}
          </Link>
        </GlassCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((inv) => {
            const { pct, daysLeft } = investmentProgress(inv);
            const daily = (inv.amount * inv.dailyRoi) / 100;
            const done = daysLeft <= 0;
            return (
              <GlassCard key={inv.id} className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-extrabold">{inv.planName}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {new Date(inv.startedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                        done ? "bg-muted text-muted-foreground" : "bg-success/15 text-success"
                      }`}
                    >
                      {done ? t("Completed") : t("Running")}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Cell label={t("Price")} value={money(inv.amount)} />
                    <Cell label={t("Daily")} value={money(daily)} tone="text-success" />
                    <Cell label={t("Earned")} value={money(inv.earned)} tone="text-gold" />
                  </div>

                  <Progress value={pct} className="mt-4 h-2" />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>{pct.toFixed(0)}% {t("complete")}</span>
                    <span>{daysLeft} {t("days left")}</span>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl glass-soft p-3">
      <p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-bold ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
