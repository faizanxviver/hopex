import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { TicketPercent, Sparkles } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { money, newId, timestamp, useStore } from "@/lib/store";

export const Route = createFileRoute("/promo")({
  head: () => ({
    meta: [
      { title: "Promo Codes — HopeX" },
      { name: "description", content: "Redeem a HopeX promo code and get an instant bonus credited to your wallet." },
      { property: "og:title", content: "Promo Codes — HopeX" },
      { property: "og:description", content: "Instant bonus rewards for HopeX investors." },
    ],
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
  const { user, update, addNotification, redeemPromo } = useStore();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return toast.error("Enter a promo code.");
    setBusy(true);
    const res = await redeemPromo(code.trim(), 0);
    setBusy(false);
    if (!res || res.bonus <= 0) return toast.error("This promo code is invalid, used up or expired.");

    update((d) => {
      const me = d.users.find((u) => u.id === user.id)!;
      me.balance += res.bonus;
      d.transactions.unshift({
        id: newId(),
        userId: user.id,
        type: "bonus",
        amount: res.bonus,
        method: `Promo ${res.code}`,
        status: "completed",
        createdAt: timestamp(),
      });
      return d;
    });
    addNotification(user.id, {
      title: "Promo bonus credited",
      body: `${money(res.bonus)} was added to your withdrawable balance.`,
      kind: "success",
    });
    toast.success(`${money(res.bonus)} bonus credited!`);
    setCode("");
  };

  return (
    <div>
      <SectionTitle title="Promo codes" subtitle="Have a code? Redeem it here for an instant wallet bonus." />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <GlassCard glow>
          <span className="grid h-14 w-14 place-items-center rounded-2xl gradient-brand text-primary-foreground">
            <TicketPercent className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-extrabold">Redeem a code</h2>
          <form onSubmit={redeem} className="mt-5 space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="HOPEX2026"
              className="h-14 w-full rounded-xl border border-input bg-background/40 px-4 text-lg font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              disabled={busy}
              className="btn-glass btn-glass-primary h-13 flex h-13 w-full items-center justify-center py-4 text-base font-bold disabled:opacity-60"
            >
              {busy ? "Checking…" : "Redeem code"}
            </button>
          </form>
        </GlassCard>

        <GlassCard>
          <p className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-gold" /> How promo codes work
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Each code has a limited number of uses and an expiry date.</li>
            <li>Bonuses land directly in your withdrawable balance.</li>
            <li>Codes are announced in notifications and support chat.</li>
          </ul>
          <Link
            to="/transactions"
            className="btn-glass mt-5 flex h-11 items-center justify-center text-sm font-semibold text-foreground"
          >
            View bonus history
          </Link>
        </GlassCard>
      </div>
    </div>
  );
}
