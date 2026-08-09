import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  Crown,
  Gift,
  CheckCircle2,
  X,

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
  salaryStatus,
  useStore,
} from "@/lib/store";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
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
  const { db, user, claimEarnings, refresh } = useStore();
  const { t } = useT();
  const [tick, setTick] = useState(() => Date.now());
  const [claiming, setClaiming] = useState(false);

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

  const salary = salaryStatus(db, user, tick);

  const claimSalary = async () => {
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_salary");
    setClaiming(false);
    if (error) return toast.error(error.message.replace(/^.*?:\s*/, ""));
    toast.success(`${t("Salary credited")} — ${money(Number(data))}`);
    void refresh();
  };

  return (
    <div className="space-y-5">
      <WithdrawalApprovedPopup />

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

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { to: "/plans", icon: Gem, label: "Invest", tint: "bg-emerald-500/10 text-emerald-500" },
              { to: "/referrals", icon: UsersRound, label: "Team", tint: "bg-blue-500/10 text-blue-500" },
              { to: "/promo", icon: TicketPercent, label: "Promo", tint: "bg-purple-500/10 text-purple-500" },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="relative flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/5 transition-all hover:scale-105 active:scale-95 group"
              >
                <span className={cn("grid h-10 w-10 place-items-center rounded-xl transition-transform group-hover:scale-110", a.tint)}>
                  <a.icon className="h-5 w-5" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">{t(a.label)}</span>
              </Link>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Free reward task */}
      {db.settings.rewardActive && db.settings.rewardAmount > 0 ? (
        <Link to="/reward" className="reward-3d relative block overflow-hidden rounded-[2rem] p-5">
          <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-gold/35 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <span className="reward-coin grid h-14 w-14 shrink-0 place-items-center rounded-2xl">
              <Gift className="h-6 w-6 text-primary-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                {t("Free reward")}
              </p>
              <p className="truncate font-display text-2xl font-black text-gradient">
                {money(db.settings.rewardAmount)}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {t("Complete one simple task and get it free")}
              </p>
            </div>
            <span className="btn-glass btn-glass-gold grid h-11 shrink-0 place-items-center px-4 text-xs font-black">
              {t("Get free")}
            </span>
          </div>
        </Link>
      ) : null}

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

      {/* Rank salary */}
      <GlassCard className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/20 text-gold">
                <Crown className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {t("Rank salary")}
                </p>
                <p className="truncate font-display text-lg font-extrabold">
                  {salary.current ? salary.current.rank : t("Unranked")} ·{" "}
                  <span className="text-gold">{money(salary.current?.salary ?? 0)}</span>
                </p>
              </div>
            </div>
            {salary.claimable ? (
              <button
                onClick={claimSalary}
                disabled={claiming}
                className="btn-glass btn-glass-gold h-10 shrink-0 px-4 text-xs font-bold disabled:opacity-60"
              >
                {claiming ? "…" : t("Claim")}
              </button>
            ) : (
              <Link
                to="/salary"
                className="btn-glass grid h-10 shrink-0 place-items-center px-4 text-xs font-bold text-foreground"
              >
                {t("Details")}
              </Link>
            )}
          </div>
          {salary.next ? (
            <>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full gradient-brand"
                  style={{
                    width: `${Math.min(100, (salary.team / salary.next.team) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {salary.team}/{salary.next.team} {t("members")} → {salary.next.rank} ·{" "}
                {money(salary.next.salary)}
              </p>
            </>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">{t("Highest rank reached")}</p>
          )}
        </div>
      </GlassCard>

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

function WithdrawalApprovedPopup() {
  const { db, user } = useStore();
  const { t } = useT();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    try {
      setDismissed(JSON.parse(localStorage.getItem("hopex.proof.dismissed") ?? "[]"));
    } catch {
      setDismissed([]);
    }
  }, []);

  const withdrawal = db.transactions.find(
    (x) =>
      x.userId === user?.id &&
      x.type === "withdraw" &&
      (x.status === "approved" || x.status === "completed") &&
      !x.proofUrl &&
      !dismissed.includes(x.id),
  );

  if (!withdrawal) return null;

  const close = () => {
    const next = [...dismissed, withdrawal.id];
    setDismissed(next);
    try {
      localStorage.setItem("hopex.proof.dismissed", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" onClick={close} />
      <div className="animate-rise relative w-full max-w-sm rounded-[2rem] border border-border/50 bg-background/40 p-7 text-center shadow-[var(--shadow-elegant)] backdrop-blur-2xl">
        <button
          onClick={close}
          aria-label={t("Close")}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/50 text-muted-foreground backdrop-blur-md transition hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl gradient-brand text-primary-foreground">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="mt-6 font-display text-2xl font-black">{t("Payment Received!")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Your withdrawal of")}{" "}
          <span className="font-bold text-foreground">{money(withdrawal.amount)}</span>{" "}
          {t("has been approved and sent.")}
        </p>

        <div className="mt-8 space-y-3">
          <button
            onClick={() => {
              close();
              navigate({ to: "/withdraw-proof" });
            }}
            className="btn-glass btn-glass-gold flex h-13 w-full items-center justify-center gap-2 text-sm font-black"
          >
            <Gift className="h-5 w-5" /> {t("Upload Proof & Get")} {money(db.settings.proofRewardAmount)}
          </button>
          <button
            onClick={close}
            className="btn-glass flex h-13 w-full items-center justify-center gap-2 text-sm font-bold text-muted-foreground"
          >
            <X className="h-4 w-4" /> {t("Maybe later")}
          </button>
        </div>
      </div>
    </div>
  );
}

