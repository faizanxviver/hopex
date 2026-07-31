import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Coins,
  Timer,
  Wallet2,
  PiggyBank,
  HandCoins,
  Ticket,
  UsersRound,
  Rocket,
  Gem,
  Share2,
  TicketPercent,
} from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard } from "@/components/glass";
import { useT } from "@/lib/i18n";
import {
  activeInvestments,
  dailyIncome,
  depositBalance,
  liveEarnings,
  money,
  nextPayoutIn,
  useStore,
} from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — HopeX" },
      {
        name: "description",
        content: "Track your live investment income, balances and daily payouts in one place.",
      },
      { property: "og:title", content: "Dashboard — HopeX" },
      { property: "og:description", content: "Live earnings, balances and instant actions." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <Dashboard />
      </DashboardLayout>
    </AuthGuard>
  ),
});

function countdown(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function Dashboard() {
  const { db, user, claimEarnings } = useStore();
  const { t } = useT();
  const [tick, setTick] = useState(() => Date.now());

  // Smooth, fast-looking ticker: repaint on every animation frame.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setTick(Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const running = useMemo(() => (user ? activeInvestments(db, user.id) : []), [db, user]);
  const live = user ? liveEarnings(db, user.id, tick) : 0;
  const nextIn = user ? nextPayoutIn(db, user.id, tick) : null;

  // Auto-claim whenever a 24-hour cycle completes while the dashboard is open.
  useEffect(() => {
    if (nextIn !== 0) return;
    void claimEarnings();
  }, [nextIn, claimEarnings]);

  if (!user) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-brand font-display text-base font-black text-primary-foreground">
          {user.name[0]}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t("Good to see you")}</p>
          <h1 className="truncate font-display text-xl font-extrabold sm:text-2xl">{user.name}</h1>
        </div>
      </div>

      {/* Balance hero */}
      <GlassCard className="relative overflow-hidden p-6 sm:p-8" glow>
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("Withdrawable balance")}
          </p>
          <p className="mt-2 font-display text-4xl font-black tracking-tight sm:text-5xl">
            {money(user.balance)}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-2xl glass-soft px-3 py-2">
            <PiggyBank className="h-4 w-4 shrink-0 text-gold" />
            <span className="text-xs text-muted-foreground">{t("Deposit balance")}</span>
            <span className="text-sm font-bold">{money(depositBalance(db, user.id))}</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link
              to="/deposit"
              className="btn-glass btn-glass-primary grid h-14 place-items-center text-base font-bold"
            >
              {t("Deposit")}
            </Link>
            <Link
              to="/withdraw"
              className="btn-glass grid h-14 place-items-center text-base font-bold text-foreground"
            >
              {t("Withdraw")}
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              { to: "/plans", icon: Gem, label: "Invest" },
              { to: "/referrals", icon: Share2, label: "Refer" },
              { to: "/promo", icon: TicketPercent, label: "Promo code" },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="btn-glass flex h-[4.5rem] flex-col items-center justify-center gap-1.5 text-[11px] font-bold text-foreground"
              >
                <a.icon className="h-5 w-5 text-primary" />
                {t(a.label)}
              </Link>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Live earnings */}
      {running.length > 0 ? (
        <GlassCard className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-14 -bottom-10 h-40 w-40 rounded-full bg-success/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Coins className="h-4 w-4 text-success" /> {t("Live earnings")}
              </p>
              <span className="animate-tick inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> live
              </span>
            </div>

            <p className="mt-3 font-display text-3xl font-black tabular-nums text-success transition-none sm:text-4xl">
              {live.toFixed(8)}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl glass-soft px-4 py-3">
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" /> {t("Next payout in")}
                </p>
                <p className="mt-1 font-display text-xl font-extrabold tabular-nums">
                  {nextIn === null ? "—" : countdown(nextIn)}
                </p>
              </div>
              <div className="rounded-2xl glass-soft px-4 py-3">
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <HandCoins className="h-3.5 w-3.5" /> {t("Daily income")}
                </p>
                <p className="mt-1 font-display text-xl font-extrabold">
                  {money(dailyIncome(db, user.id))}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {t("Auto-credited to your withdrawable balance every 24 hours.")}
            </p>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="flex flex-wrap items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Rocket className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-extrabold">
              {t("Activate a plan to start earning")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Your income ticker starts the moment your first plan goes live.")}
            </p>
          </div>
          <Link
            to="/plans"
            className="btn-glass btn-glass-gold grid h-12 shrink-0 place-items-center px-6 text-sm font-bold"
          >
            {t("Invest")}
          </Link>
        </GlassCard>
      )}

      {/* Compact wallet strip */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <UsersRound className="h-3.5 w-3.5" /> {t("Referral income")}
          </p>
          <p className="mt-1 truncate font-display text-xl font-extrabold text-gold">
            {money(user.referralEarnings)}
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Wallet2 className="h-3.5 w-3.5" /> {t("Active plans")}
          </p>
          <p className="mt-1 font-display text-xl font-extrabold">{running.length}</p>
        </GlassCard>
      </div>

      <Link
        to="/transactions"
        className="btn-glass flex h-12 items-center justify-center gap-2 text-sm font-semibold text-foreground"
      >
        <Ticket className="h-4 w-4" /> {t("All transactions")}
      </Link>
    </div>
  );
}
