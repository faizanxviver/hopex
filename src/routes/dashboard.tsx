import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Gem,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, StatCard, StatusBadge } from "@/components/glass";
import { Progress } from "@/components/ui/progress";
import {
  depositBalance,
  hasActivePlan,
  investmentProgress,
  money,
  pendingDeposits,
  referralTree,
  useStore,
} from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Aurum Capital" },
      { name: "description", content: "Track balances, active plans, earnings growth and referral income." },
      { property: "og:title", content: "Dashboard — Aurum Capital" },
      { property: "og:description", content: "Your investment wallet at a glance." },
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

const actions = [
  { to: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { to: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { to: "/plans", label: "Invest", icon: Gem },
  { to: "/referrals", label: "Referral", icon: Users },
] as const;

function Dashboard() {
  const { db, user, update } = useStore();
  const [popup, setPopup] = useState<{ id: string; title: string; body: string } | null>(null);

  const popups = db.notifications.filter((n) => n.userId === user?.id && n.popup && !n.read);

  useEffect(() => {
    if (popups.length && !popup) {
      const t = setTimeout(() => setPopup(popups[0]), 500);
      return () => clearTimeout(t);
    }
  }, [popups, popup]);

  if (!user) return null;

  const txs = db.transactions.filter((t) => t.userId === user.id);
  const investments = db.investments.filter((i) => i.userId === user.id);
  const levels = referralTree(db, user.referralCode);

  const chart = Array.from({ length: 12 }, (_, i) => ({
    day: `D${i * 3 + 1}`,
    earnings: Math.round(user.earnings * ((i + 1) / 12) * (0.85 + Math.random() * 0.3)),
  }));

  return (
    <div className="space-y-6">
      {popup ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
          <GlassCard className="animate-rise relative w-full max-w-sm text-center" glow>
            <button
              onClick={() => {
                update((d) => {
                  const n = d.notifications.find((x) => x.id === popup.id);
                  if (n) n.read = true;
                  return d;
                });
                setPopup(null);
              }}
              className="absolute right-4 top-4 text-muted-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl gradient-brand text-primary-foreground">
              <Sparkles className="h-6 w-6" />
            </span>
            <h2 className="mt-4 font-display text-xl font-extrabold">{popup.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{popup.body}</p>
            <button
              onClick={() => {
                update((d) => {
                  const n = d.notifications.find((x) => x.id === popup.id);
                  if (n) n.read = true;
                  return d;
                });
                setPopup(null);
              }}
              className="mt-6 w-full rounded-xl gradient-cool py-2.5 font-semibold text-primary-foreground"
            >
              Got it
            </button>
          </GlassCard>
        </div>
      ) : null}

      <div>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
          Hello, <span className="text-gradient">{user.name.split(" ")[0]}</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Here&apos;s how your portfolio is performing today.
        </p>
      </div>

      <GlassCard className="relative overflow-hidden p-8" glow>
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full gradient-brand opacity-25 blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Total balance · withdrawable
        </p>
        <p className="mt-3 font-display text-5xl font-black sm:text-6xl">{money(user.balance)}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ArrowDownToLine className="h-3.5 w-3.5" /> Deposit balance {money(depositBalance(db, user.id))}
          </span>
          {pendingDeposits(db, user.id) > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
              {money(pendingDeposits(db, user.id))} pending
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <TrendingUp className="h-3.5 w-3.5" /> +
            {((user.earnings / Math.max(1, user.invested)) * 100).toFixed(2)}% all-time
          </span>
        </div>
        {!hasActivePlan(db, user.id) ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Buy an investment plan to unlock withdrawals and referral commissions.
          </p>
        ) : null}

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {actions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex flex-col items-center gap-2 rounded-2xl glass-soft py-4 text-xs font-semibold transition hover:-translate-y-0.5"
            >
              <a.icon className="h-5 w-5 text-primary" />
              {a.label}
            </Link>
          ))}
        </div>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available" value={money(user.balance)} icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="Invested" value={money(user.invested)} icon={<Gem className="h-4 w-4" />} accent="primary" />
        <StatCard label="Total earnings" value={money(user.earnings)} icon={<TrendingUp className="h-4 w-4" />} accent="success" />
        <StatCard label="Referral earnings" value={money(user.referralEarnings)} icon={<Users className="h-4 w-4" />} accent="gold" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h2 className="text-lg font-bold">Earnings growth</h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                />
                <Area type="monotone" dataKey="earnings" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-bold">Referral summary</h2>
          <p className="mt-4 font-display text-3xl font-extrabold text-gold">{money(user.referralEarnings)}</p>
          <p className="text-xs text-muted-foreground">lifetime commission</p>
          <div className="mt-5 space-y-3">
            {levels.map((members, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Level {i + 1} · {db.settings.levels[i]}%
                </span>
                <span className="font-semibold">{members.length} members</span>
              </div>
            ))}
          </div>
          <Link to="/referrals" className="mt-6 block rounded-xl gradient-cool py-2.5 text-center text-sm font-semibold text-primary-foreground">
            Open referral center
          </Link>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Active investments</h2>
            <Link to="/plans" className="text-xs font-semibold text-primary">
              View plans
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {investments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active investments yet.</p>
            ) : (
              investments.map((inv) => {
                const { pct, daysLeft } = investmentProgress(inv);
                return (
                  <div key={inv.id} className="rounded-2xl glass-soft p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{inv.planName}</p>
                      <p className="text-sm font-bold text-gold">{money(inv.amount)}</p>
                    </div>
                    <Progress value={pct} className="mt-3 h-2" />
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>{pct.toFixed(0)}% complete</span>
                      <span>{daysLeft} days left · earned {money(inv.earned)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent transactions</h2>
            <Link to="/transactions" className="text-xs font-semibold text-primary">
              See all
            </Link>
          </div>
          <div className="mt-4 divide-y divide-border/50">
            {txs.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold capitalize">{t.type}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.method} · {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold">{money(t.amount)}</p>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
            {txs.length === 0 ? <p className="py-3 text-sm text-muted-foreground">No activity yet.</p> : null}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
