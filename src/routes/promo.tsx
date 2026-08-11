import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { TicketPercent, Sparkles, ArrowRight, Gift, Clock, BellRing } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { money, useStore } from "@/lib/store";

export const Route = createFileRoute("/promo")({
  head: () => ({
    meta: [
      { title: "Promo Codes — HopeX" },
      {
        name: "description",
        content: "Redeem a HopeX promo code and get an instant bonus credited to your wallet.",
      },
      { property: "og:url", content: "https://hopex.site/promo" },
      { property: "og:title", content: "Promo Codes — HopeX" },
      { property: "og:description", content: "Instant bonus rewards for HopeX investors." },
    ],
    links: [{ rel: "canonical", href: "https://hopex.site/promo" }],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <Promo />
      </DashboardLayout>
    </AuthGuard>
  ),
});

function Promo() {
  const { user, refresh, addNotification, redeemPromo } = useStore();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return toast.error("Enter a promo code.");
    setBusy(true);
    const res = await redeemPromo(code.trim(), 0);
    if (!res || res.bonus <= 0) {
      setBusy(false);
      return toast.error("This code is invalid, expired, already used or not for your account.");
    }
    await refresh();
    setBusy(false);
    addNotification(user.id, {
      title: "Promo bonus credited",
      body: `${money(res.bonus)} was added to your withdrawable balance.`,
      kind: "success",
    });
    toast.success(`${money(res.bonus)} bonus credited!`);
    setCode("");
  };


  return (
    <div className="space-y-5">
      <SectionTitle
        title="Promo codes"
        subtitle="Have a code? Redeem it here for an instant wallet bonus."
      />

      <GlassCard glow className="relative overflow-hidden p-6 text-center sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gold/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl gradient-brand text-primary-foreground shadow-[var(--shadow-elegant)]">
            <TicketPercent className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-black sm:text-3xl">Redeem a promo code</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Bonuses land instantly in your withdrawable balance.
          </p>

          <form onSubmit={redeem} className="mx-auto mt-6 max-w-md space-y-3">
            <div className="relative">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="HOPEX2026"
                className="h-16 w-full rounded-2xl border border-border/60 bg-background/40 px-5 text-center font-display text-xl font-black uppercase tracking-[0.35em] outline-none backdrop-blur focus:ring-2 focus:ring-ring"
              />
              <Sparkles className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gold" />
            </div>
            <button
              disabled={busy || !code.trim()}
              className="btn-glass btn-glass-primary flex h-14 w-full items-center justify-center gap-2 text-base font-bold disabled:opacity-60"
            >
              {busy ? "Checking…" : "Redeem code"}
              {!busy ? <ArrowRight className="h-4 w-4" /> : null}
            </button>
          </form>
        </div>
      </GlassCard>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Gift,
            t: "Instant bonus",
            d: "Credited to your withdrawable balance right away.",
          },
          {
            icon: Clock,
            t: "Limited window",
            d: "Every code has limited uses and an expiry date.",
          },
          {
            icon: BellRing,
            t: "Stay tuned",
            d: "New codes drop in notifications and support chat.",
          },
        ].map((x) => (
          <GlassCard key={x.t} className="p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <x.icon className="h-4.5 w-4.5" />
            </span>
            <p className="mt-3 text-sm font-bold">{x.t}</p>
            <p className="mt-1 text-xs text-muted-foreground">{x.d}</p>
          </GlassCard>
        ))}
      </div>

      <Link
        to="/transactions"
        className="btn-glass flex h-12 items-center justify-center text-sm font-semibold text-foreground"
      >
        View bonus history
      </Link>
    </div>
  );
}
