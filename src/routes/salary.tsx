import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { BadgeCheck, CalendarClock, Crown, HandCoins, Target, Users } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { Progress } from "@/components/ui/progress";
import { money, salaryStatus, useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/salary")({
  head: () => ({
    meta: [
      { title: "Rank Salary — HopeX" },
      {
        name: "description",
        content: "Grow your team and investment to unlock a monthly HopeX rank salary.",
      },
      { property: "og:title", content: "Rank Salary — HopeX" },
      { property: "og:description", content: "Monthly salary for every HopeX rank." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <Salary />
      </DashboardLayout>
    </AuthGuard>
  ),
});

function days(ms: number) {
  return Math.ceil(ms / 86400000);
}

function Salary() {
  const { db, user, refresh } = useStore();
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(i);
  }, []);

  if (!user) return null;
  const s = salaryStatus(db, user, tick);

  const claim = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_salary");
    setBusy(false);
    if (error) return toast.error(error.message.replace(/^.*?:\s*/, ""));
    toast.success(`${t("Salary credited")} — ${money(Number(data))}`);
    void refresh();
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title={t("Rank salary")}
        subtitle={t("Build your team, hold an investment and collect a salary every 30 days.")}
      />

      <GlassCard glow className="relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-[11px] font-bold text-gold">
            <Crown className="h-3 w-3" /> {s.current ? s.current.rank : t("Unranked")}
          </span>
          <p className="mt-3 font-display text-4xl font-black tracking-tight">
            {money(s.current?.salary ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("Your monthly salary")}</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl glass-soft px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Users className="h-3 w-3" /> {t("Direct team")}
              </p>
              <p className="mt-0.5 font-display text-lg font-extrabold">{s.team}</p>
            </div>
            <div className="rounded-2xl glass-soft px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Target className="h-3 w-3" /> {t("Invested")}
              </p>
              <p className="mt-0.5 truncate font-display text-lg font-extrabold">
                {money(s.invested)}
              </p>
            </div>
          </div>

          <button
            onClick={() => void claim()}
            disabled={!s.claimable || busy}
            className="btn-glass btn-glass-primary mt-4 flex h-14 w-full items-center justify-center gap-2 text-base font-bold disabled:opacity-50"
          >
            <HandCoins className="h-5 w-5" />
            {s.claimable
              ? t("Claim salary")
              : s.current
                ? `${t("Next claim in")} ${days(s.nextClaimIn)} ${t("days")}`
                : t("Reach a rank to claim")}
          </button>

          {s.lastClaimAt ? (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarClock className="h-3 w-3" /> {t("Last claim")}{" "}
              {new Date(s.lastClaimAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>
      </GlassCard>

      {s.next ? (
        <GlassCard>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("Next rank")} · {s.next.rank}
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <div className="flex justify-between text-xs">
                <span>{t("Direct team")}</span>
                <span className="font-bold">
                  {s.team}/{s.next.team}
                </span>
              </div>
              <Progress value={Math.min(100, (s.team / s.next.team) * 100)} className="mt-1.5 h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs">
                <span>{t("Invested")}</span>
                <span className="font-bold">
                  {money(s.invested)}/{money(s.next.invested)}
                </span>
              </div>
              <Progress
                value={Math.min(100, (s.invested / s.next.invested) * 100)}
                className="mt-1.5 h-2"
              />
            </div>
          </div>
        </GlassCard>
      ) : null}

      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("All ranks")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {s.tiers.map((tier) => {
            const reached = s.team >= tier.team && s.invested >= tier.invested;
            return (
              <GlassCard
                key={tier.rank}
                className={cn("p-4", reached && "ring-1 ring-success/40")}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 font-display text-base font-extrabold">
                    {reached ? (
                      <BadgeCheck className="h-4 w-4 text-success" />
                    ) : (
                      <Crown className="h-4 w-4 text-muted-foreground" />
                    )}
                    {tier.rank}
                  </p>
                  <p className="font-display text-base font-extrabold text-gold">
                    {money(tier.salary)}
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {tier.team} {t("direct members")} · {money(tier.invested)} {t("invested")}
                </p>
              </GlassCard>
            );
          })}
        </div>
      </section>

      <Link
        to="/referrals"
        className="btn-glass flex h-12 items-center justify-center text-sm font-semibold text-foreground"
      >
        {t("Invite your team")}
      </Link>
    </div>
  );
}
