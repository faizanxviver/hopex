import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Banknote,
  ReceiptText,
  SlidersHorizontal,
  ShieldHalf,
  History,
  Wallet,
  Headset,
  Gift,
  LifeBuoy,
  TrendingUp,
  LogOut,
  CircleDollarSign,
  Layers,
  Trophy,
  Crown,

  Ticket,
  ChevronRight,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { useT } from "@/lib/i18n";
import { depositBalance, hasActivePlan, money, useStore } from "@/lib/store";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "More — HopeX" },
      {
        name: "description",
        content: "Withdrawals, history, security, support and account tools in one place.",
      },
      { property: "og:title", content: "More — HopeX" },
      { property: "og:description", content: "All your HopeX account tools." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <More />
      </DashboardLayout>
    </AuthGuard>
  ),
});

const quick = [
  { to: "/deposit", label: "Deposit", icon: CircleDollarSign, tone: "bg-primary/15 text-primary" },
  { to: "/withdraw", label: "Withdraw", icon: Banknote, tone: "bg-gold/20 text-gold" },
  { to: "/plans", label: "Invest", icon: TrendingUp, tone: "bg-success/15 text-success" },
  { to: "/promo", label: "Promo", icon: Ticket, tone: "bg-destructive/10 text-destructive" },
] as const;

const wallet = [
  { to: "/withdraw", label: "Withdraw", desc: "Request a payout", icon: Banknote },
  { to: "/transactions", label: "Transactions", desc: "Full account ledger", icon: ReceiptText },
  { to: "/deposit-history", label: "Deposit history", desc: "Track every top-up", icon: History },
  { to: "/withdraw-history", label: "Withdraw history", desc: "Payout status", icon: Wallet },
] as const;

const account = [
  {
    to: "/investments",
    label: "Active plans",
    desc: "Your running investments",
    icon: Layers,
  },
  {
    to: "/profile",
    label: "Profile & settings",
    desc: "Payout account, security, language",
    icon: SlidersHorizontal,
  },
  { to: "/plans", label: "Investment plans", desc: "Compare and invest", icon: TrendingUp },
  { to: "/referrals", label: "Referral center", desc: "4-level commissions", icon: Gift },
] as const;

const rewards = [
  { to: "/salary", label: "Rank salary", desc: "Monthly income for your rank", icon: Crown },
  { to: "/leaderboard", label: "Leaderboard", desc: "Top earners and referrers", icon: Trophy },
  { to: "/promo", label: "Promo codes", desc: "Redeem a bonus code", icon: Ticket },
] as const;


function More() {
  const { db, user, setChatOpen, logout } = useStore();
  const { t } = useT();
  const navigate = useNavigate();

  if (!user) return null;
  const locked = !hasActivePlan(db, user.id);

  return (
    <div className="space-y-5">
      <SectionTitle title={t("More")} subtitle={t("Everything else in your HopeX account.")} />

      {/* Profile hero */}
      <GlassCard glow className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-brand font-display text-xl font-black text-primary-foreground">
            {user.name[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-extrabold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(user.referralCode);
              toast.success(`${t("Referral code")} ${t("copied")}`);
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
          >
            {user.referralCode} <Copy className="h-3 w-3" />
          </button>
        </div>

        <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl glass-soft px-3 py-2.5">
            <p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">
              {t("Withdrawable balance")}
            </p>
            <p className="mt-0.5 truncate font-display text-lg font-extrabold">
              {money(user.balance)}
            </p>
          </div>
          <div className="rounded-2xl glass-soft px-3 py-2.5">
            <p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">
              {t("Deposit balance")}
            </p>
            <p className="mt-0.5 truncate font-display text-lg font-extrabold">
              {money(depositBalance(db, user.id))}
            </p>
          </div>
          <div className="rounded-2xl glass-soft px-3 py-2.5">
            <p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">
              {t("Referral income")}
            </p>
            <p className="mt-0.5 truncate font-display text-lg font-extrabold text-gold">
              {money(user.referralEarnings)}
            </p>
          </div>
        </div>

      </GlassCard>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2">
        {quick.map((q) => (
          <Link
            key={q.label}
            to={q.to}
            className="btn-glass flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center"
          >
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${q.tone}`}>
              <q.icon className="h-5 w-5" />
            </span>
            <span className="truncate text-[11px] font-semibold">{t(q.label)}</span>
          </Link>
        ))}
      </div>

      {/* Live support */}
      <button
        onClick={() => setChatOpen(true)}
        className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left transition hover:-translate-y-0.5"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
          <Headset className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t("Live support chat")}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {t("Average reply under 2 minutes")}
          </span>
        </span>
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-success" />
      </button>

      {/* Wallet */}
      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("Wallet")}
        </p>
        <GlassCard className="divide-y divide-border/40 p-2">
          {wallet.map((l) => (
            <Link key={l.label} to={l.to} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-accent/40">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <l.icon className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {t(l.label)}
                  {l.to === "/withdraw" && locked ? (
                    <span className="ml-2 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold text-warning">
                      {t("locked")}
                    </span>
                  ) : null}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{t(l.desc)}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </GlassCard>
      </section>

      {/* Account */}
      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("Account")}
        </p>
        <GlassCard className="divide-y divide-border/40 p-2">
          {account.map((l) => (
            <Link key={l.label} to={l.to} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-accent/40">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/20 text-gold">
                <l.icon className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{t(l.label)}</span>
                <span className="block truncate text-xs text-muted-foreground">{t(l.desc)}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
          {user.role === "admin" ? (
            <Link to="/admin" className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-accent/40">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
                <ShieldHalf className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">Admin panel</span>
                <span className="block truncate text-xs text-muted-foreground">
                  Platform administration
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ) : null}
        </GlassCard>
      </section>

      {/* Rewards */}
      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("Rewards")}
        </p>
        <GlassCard className="divide-y divide-border/40 p-2">
          {rewards.map((l) => (
            <Link key={l.label} to={l.to} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-accent/40">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
                <l.icon className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{t(l.label)}</span>
                <span className="block truncate text-xs text-muted-foreground">{t(l.desc)}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </GlassCard>
      </section>

      <a
        href="mailto:support@hopex.io"
        className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <LifeBuoy className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{t("Help centre")}</span>
          <span className="block truncate text-xs text-muted-foreground">support@hopex.io</span>
        </span>
      </a>

      <button
        onClick={() => {
          void logout();
          navigate({ to: "/", replace: true });
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/15"
      >
        <LogOut className="h-4 w-4" /> {t("Sign out")}
      </button>
    </div>
  );
}
