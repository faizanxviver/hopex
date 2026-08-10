import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  BadgeCheck,
  CalendarClock,
  Crown,
  HandCoins,
  Lock,
  Target,
  Users,
} from "lucide-react";
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
      { title: "Weekly Rank Salary — HopeX" },
      {
        name: "description",
        content:
          "Grow your level 1 team investment and collect a weekly HopeX rank salary — no member targets.",
      },
      { property: "og:url", content: "https://hopex.site/salary" },
      { property: "og:title", content: "Weekly Rank Salary — HopeX" },
      { property: "og:description", content: "Weekly salary for every HopeX rank." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://hopex.site/salary" }],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <Salary />
      </DashboardLayout>
    </AuthGuard>
  ),
});

function countdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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
    <div className="space-y-5 pb-20">
      <SectionTitle
        title={t("Weekly rank salary")}
        subtitle={t(
          "Your rank depends only on the total investment of your level 1 team. Claim every 7 days.",
        )}
      />

      {/* Hero */}
      <GlassCard glow className="relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gold/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-[11px] font-bold text-gold">
            <Crown className="h-3 w-3" /> {s.current ? s.current.rank : t("Unranked")}
          </span>
          <p className="mt-3 font-display text-4xl font-black tracking-tight sm:text-5xl">
            {money(s.current?.salary ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("Your weekly salary")}</p>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl glass-soft px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Target className="h-3 w-3" /> {t("Level 1 investment")}
              </p>
              <p className="mt-0.5 truncate font-display text-lg font-extrabold">
                {money(s.invested)}
              </p>
            </div>
            <div className="rounded-2xl glass-soft px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Users className="h-3 w-3" /> {t("Direct team")}
              </p>
              <p className="mt-0.5 font-display text-lg font-extrabold">{s.team}</p>
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
                ? `${t("Next claim in")} ${countdown(s.nextClaimIn)}`
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
          <div className="mt-3">
            <div className="flex justify-between text-xs">
              <span>{t("Level 1 investment")}</span>
              <span className="font-bold">
                {money(s.invested)} / {money(s.next.invested)}
              </span>
            </div>
            <Progress
              value={Math.min(100, (s.invested / Math.max(1, s.next.invested)) * 100)}
              className="mt-1.5 h-2"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("Still needed")}: {money(Math.max(0, s.next.invested - s.invested))}
            </p>
          </div>
        </GlassCard>
      ) : null}

      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("All ranks")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {s.tiers.map((tier) => {
            const reached = s.invested >= tier.invested;
            const canClaim =
              reached && s.claimable && s.current?.rank === tier.rank;
            return (
              <GlassCard
                key={tier.rank}
                className={cn(
                  "relative overflow-hidden p-4",
                  reached && "ring-1 ring-success/40",
                )}
              >
                {reached ? (
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-success/15 blur-2xl" />
                ) : null}
                <div className="relative">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 font-display text-base font-extrabold">
                      {reached ? (
                        <BadgeCheck className="h-4 w-4 text-success" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      {tier.rank}
                    </p>
                    <p className="font-display text-base font-extrabold text-gold">
                      {money(tier.salary)}
                      <span className="ml-1 text-[10px] font-bold text-muted-foreground">
                        /{t("week")}
                      </span>
                    </p>
                  </div>

                  <div className="mt-2.5">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{t("Level 1 investment")}</span>
                      <span className="font-bold">
                        {money(Math.min(s.invested, tier.invested))} / {money(tier.invested)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, (s.invested / Math.max(1, tier.invested)) * 100)}
                      className="mt-1.5 h-1.5"
                    />
                  </div>

                  <button
                    onClick={() => void claim()}
                    disabled={!canClaim || busy}
                    className={cn(
                      "btn-glass mt-3 flex h-11 w-full items-center justify-center gap-2 text-xs font-bold",
                      canClaim
                        ? "btn-glass-primary"
                        : "text-muted-foreground disabled:opacity-60",
                    )}
                  >
                    <HandCoins className="h-4 w-4" />
                    {canClaim
                      ? t("Claim salary")
                      : !reached
                        ? t("Locked")
                        : s.current?.rank === tier.rank
                          ? `${t("Next claim in")} ${countdown(s.nextClaimIn)}`
                          : t("Higher rank active")}
                  </button>
                </div>
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
