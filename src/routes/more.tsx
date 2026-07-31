import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowUpFromLine,
  Receipt,
  Settings,
  Shield,
  History,
  Wallet,
  MessageCircle,
  Moon,
  Sun,
  Languages,
  LogOut,
  BadgeCheck,
  Gift,
  LifeBuoy,
  TrendingUp,
  Calculator,
} from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { depositBalance, hasActivePlan, money, useStore } from "@/lib/store";
import { useState } from "react";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "More — HopeX" },
      { name: "description", content: "Withdrawals, history, security, language, support and account tools in one place." },
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
  { to: "/withdraw", label: "Withdraw", desc: "Request a payout", icon: ArrowUpFromLine },
  { to: "/transactions", label: "Transactions", desc: "Full account ledger", icon: Receipt },
  { to: "/deposit-history", label: "Deposit history", desc: "Track every top-up", icon: History },
  { to: "/withdraw-history", label: "Withdraw history", desc: "Payout status", icon: Wallet },
] as const;

const account = [
  { to: "/profile", label: "Profile & settings", desc: "Details, KYC, security", icon: Settings },
  { to: "/plans", label: "Investment plans", desc: "Compare and invest", icon: TrendingUp },
  { to: "/referrals", label: "Referral center", desc: "4-level commissions", icon: Gift },
] as const;

function More() {
  const { db, user, theme, toggleTheme, setChatOpen, logout, update } = useStore();
  const navigate = useNavigate();
  const [calcAmount, setCalcAmount] = useState("1000");
  const [calcRoi, setCalcRoi] = useState("2.4");
  const [calcDays, setCalcDays] = useState("60");

  if (!user) return null;
  const locked = !hasActivePlan(db, user.id);
  const profit = (Number(calcAmount) || 0) * ((Number(calcRoi) || 0) / 100) * (Number(calcDays) || 0);

  return (
    <div className="space-y-6">
      <SectionTitle title="More" subtitle="Everything else in your HopeX account." />

      <GlassCard className="flex flex-wrap items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-brand font-display text-xl font-black text-primary-foreground">
          {user.name[0]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-extrabold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/15 px-3 py-1 text-xs font-semibold text-success">
            <BadgeCheck className="h-3.5 w-3.5" /> {user.kyc === "verified" ? "KYC verified" : "KYC " + user.kyc.replace("_", " ")}
          </span>
        </div>
      </GlassCard>

      <div className="grid gap-3 sm:grid-cols-3">
        <GlassCard>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Withdrawable</p>
          <p className="mt-1 font-display text-2xl font-extrabold">{money(user.balance)}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Deposited</p>
          <p className="mt-1 font-display text-2xl font-extrabold">{money(depositBalance(db, user.id))}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Referral income</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-gold">{money(user.referralEarnings)}</p>
        </GlassCard>
      </div>

      <div>
        <p className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Wallet</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {wallet.map((l) => (
            <Link key={l.to} to={l.to} className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <l.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {l.label}
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
        <p className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Account</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {account.map((l) => (
            <Link key={l.to} to={l.to} className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold/20 text-gold">
                <l.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{l.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{l.desc}</span>
              </span>
            </Link>
          ))}
          {user.role === "admin" ? (
            <Link to="/admin" className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
                <Shield className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">Admin panel</span>
                <span className="block truncate text-xs text-muted-foreground">Platform administration</span>
              </span>
            </Link>
          ) : null}
        </div>
      </div>

      <GlassCard>
        <p className="flex items-center gap-2 font-bold">
          <Calculator className="h-4 w-4 text-primary" /> Profit calculator
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted-foreground">
            Amount (USD)
            <input
              type="number"
              value={calcAmount}
              onChange={(e) => setCalcAmount(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-input bg-background/40 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Daily ROI (%)
            <input
              type="number"
              step="0.1"
              value={calcRoi}
              onChange={(e) => setCalcRoi(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-input bg-background/40 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Duration (days)
            <input
              type="number"
              value={calcDays}
              onChange={(e) => setCalcDays(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-input bg-background/40 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Projected profit: <b className="text-success">{money(profit)}</b> · total return{" "}
          <b className="text-gold">{money(profit + (Number(calcAmount) || 0))}</b>
        </p>
      </GlassCard>

      <div>
        <p className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Preferences</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={toggleTheme} className="glass flex items-center gap-3 rounded-2xl p-4 text-left">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </span>
            <span>
              <span className="block text-sm font-semibold">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              <span className="block text-xs text-muted-foreground">Currently {theme}</span>
            </span>
          </button>

          <button
            onClick={() =>
              update((d) => {
                const me = d.users.find((u) => u.id === user.id)!;
                me.language = me.language === "en" ? "ur" : "en";
                toast.success(me.language === "ur" ? "زبان اردو میں تبدیل ہو گئی" : "Language set to English");
                return d;
              })
            }
            className="glass flex items-center gap-3 rounded-2xl p-4 text-left"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Languages className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Language</span>
              <span className="block text-xs text-muted-foreground">
                {user.language === "ur" ? "اردو" : "English"}
              </span>
            </span>
          </button>

          <button onClick={() => setChatOpen(true)} className="glass flex items-center gap-3 rounded-2xl p-4 text-left">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Live support chat</span>
              <span className="block text-xs text-muted-foreground">Average reply under 2 minutes</span>
            </span>
          </button>

          <a href="mailto:support@hopex.io" className="glass flex items-center gap-3 rounded-2xl p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Help centre</span>
              <span className="block text-xs text-muted-foreground">support@hopex.io</span>
            </span>
          </a>
        </div>
      </div>

      <button
        onClick={() => {
          logout();
          navigate({ to: "/", replace: true });
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 py-3 text-sm font-semibold text-destructive"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}
