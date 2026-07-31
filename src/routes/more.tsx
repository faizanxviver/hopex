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
} from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { useT } from "@/lib/i18n";
import { depositBalance, hasActivePlan, money, useStore } from "@/lib/store";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "More — HopeX" },
      { name: "description", content: "Withdrawals, history, security, support and account tools in one place." },
      { property: "og:title", content: "More — HopeX" },
      { property: "og:description", content: "All your HopeX account tools." },
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

const wallet = [
  { to: "/withdraw", label: "Withdraw", desc: "Request a payout", icon: Banknote },
  { to: "/transactions", label: "Transactions", desc: "Full account ledger", icon: ReceiptText },
  { to: "/deposit-history", label: "Deposit history", desc: "Track every top-up", icon: History },
  { to: "/withdraw-history", label: "Withdraw history", desc: "Payout status", icon: Wallet },
] as const;

const account = [
  { to: "/profile", label: "Profile & settings", desc: "Details, security, preferences", icon: SlidersHorizontal },
  { to: "/plans", label: "Investment plans", desc: "Compare and invest", icon: TrendingUp },
  { to: "/referrals", label: "Referral center", desc: "4-level commissions", icon: Gift },
] as const;

function More() {
  const { db, user, setChatOpen, logout } = useStore();
  const { t } = useT();
  const navigate = useNavigate();

  if (!user) return null;
  const locked = !hasActivePlan(db, user.id);

  return (
    <div className="space-y-6">
      <SectionTitle title={t("More")} subtitle="Everything else in your HopeX account." />

      <GlassCard className="flex flex-wrap items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-brand font-display text-xl font-black text-primary-foreground">
          {user.name[0]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-extrabold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {user.referralCode}
        </span>
      </GlassCard>

      <div className="grid gap-3 sm:grid-cols-3">
        <GlassCard className="p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("Withdrawable balance")}</p>
          <p className="mt-1 font-display text-2xl font-extrabold">{money(user.balance)}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("Deposit balance")}</p>
          <p className="mt-1 font-display text-2xl font-extrabold">{money(depositBalance(db, user.id))}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("Referral income")}</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-gold">{money(user.referralEarnings)}</p>
        </GlassCard>
      </div>

      <div>
        <p className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">{t("Wallet")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {wallet.map((l) => (
            <Link key={l.to} to={l.to} className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <l.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {t(l.label)}
                  {l.to === "/withdraw" && locked ? (
                    <span className="ml-2 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold text-warning">
                      locked
                    </span>
                  ) : null}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{l.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">{t("Account")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {account.map((l) => (
            <Link key={l.to} to={l.to} className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold/20 text-gold">
                <l.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{t(l.label)}</span>
                <span className="block truncate text-xs text-muted-foreground">{l.desc}</span>
              </span>
            </Link>
          ))}
          {user.role === "admin" ? (
            <Link to="/admin" className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
                <ShieldHalf className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">Admin panel</span>
                <span className="block truncate text-xs text-muted-foreground">Platform administration</span>
              </span>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => setChatOpen(true)} className="glass flex items-center gap-3 rounded-2xl p-4 text-left">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
            <Headset className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">{t("Live support chat")}</span>
            <span className="block text-xs text-muted-foreground">Average reply under 2 minutes</span>
          </span>
        </button>

        <a href="mailto:support@hopex.io" className="glass flex items-center gap-3 rounded-2xl p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">{t("Help centre")}</span>
            <span className="block text-xs text-muted-foreground">support@hopex.io</span>
          </span>
        </a>
      </div>

      <button
        onClick={() => {
          void logout();
          navigate({ to: "/", replace: true });
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 py-3 text-sm font-semibold text-destructive"
      >
        <LogOut className="h-4 w-4" /> {t("Sign out")}
      </button>
    </div>
  );
}
