import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { BadgeCheck } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { Progress } from "@/components/ui/progress";
import { investmentProgress, money, useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

import type { Plan } from "@/lib/store";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Investment Plans — HopeX" },
      { name: "description", content: "Compare Starter, Growth, Premium and VIP plans and invest from your wallet balance." },
      { property: "og:title", content: "Investment Plans — HopeX" },
      { property: "og:description", content: "Daily ROI plans from 1.2% to 3.1%." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <Plans />
      </DashboardLayout>
    </AuthGuard>
  ),
});

function Plans() {
  const { db, user, addNotification, refresh } = useStore();
  const [active, setActive] = useState<Plan | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);


  if (!user) return null;
  const investments = db.investments.filter((i) => i.userId === user.id);

  const invest = async () => {
    if (!active) return;
    const value = Number(amount);
    if (!value || value < active.min || value > active.max) {
      return toast.error(`Amount must be between ${money(active.min)} and ${money(active.max)}.`);
    }
    if (value > user.balance) return toast.error("Insufficient available balance. Please deposit first.");

    setBusy(true);
    const { error } = await supabase.rpc("buy_plan", { _plan_id: active.id, _amount: value });
    if (error) {
      setBusy(false);
      return toast.error(error.message.replace(/^.*?:\s*/, ""));
    }

    addNotification(user.id, {
      title: "Investment activated",
      body: `${money(value)} allocated to the ${active.name} plan.`,
      kind: "success",
    });
    await refresh();
    setBusy(false);
    toast.success(`Invested ${money(value)} in ${active.name}.`);
    setActive(null);
    setAmount("");
  };


  return (
    <div>
      <SectionTitle
        title="Investment plans"
        subtitle={`Available balance: ${money(user.balance)} — invest directly from your wallet.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {db.plans
          .filter((p) => p.active)
          .map((p) => (
            <GlassCard key={p.id} className="flex flex-col">
              <h2 className="font-display text-xl font-extrabold">{p.name}</h2>
              <p className="mt-3 font-display text-4xl font-extrabold text-gradient">{p.dailyRoi}%</p>
              <p className="text-xs text-muted-foreground">
                daily · {(p.dailyRoi * p.durationDays).toFixed(0)}% total over {p.durationDays} days
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                {money(p.min)} – {money(p.max)}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-muted-foreground">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setActive(p);
                  setAmount(String(p.min));
                }}
                className="mt-6 rounded-xl gradient-brand py-2.5 text-sm font-semibold text-primary-foreground transition hover:scale-[1.02]"
              >
                Invest now
              </button>
            </GlassCard>
          ))}
      </div>

      <h2 className="mt-10 font-display text-2xl font-extrabold">Active investments</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {investments.length === 0 ? (
          <p className="text-sm text-muted-foreground">You have no active investments yet.</p>
        ) : (
          investments.map((inv) => {
            const { pct, daysLeft } = investmentProgress(inv);
            return (
              <GlassCard key={inv.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{inv.planName}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.dailyRoi}% daily · started {new Date(inv.startedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="font-display text-xl font-extrabold text-gold">{money(inv.amount)}</p>
                </div>
                <Progress value={pct} className="mt-4 h-2" />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>{pct.toFixed(0)}% complete · {daysLeft} days left</span>
                  <span className="text-success">earned {money(inv.earned)}</span>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      {active ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
          <GlassCard className="animate-rise w-full max-w-sm">
            <h3 className="font-display text-xl font-extrabold">Invest in {active.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {money(active.min)} – {money(active.max)} · {active.dailyRoi}% daily for {active.durationDays} days
            </p>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              className="mt-5 h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Amount"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Projected total return:{" "}
              <b className="text-success">
                {money((Number(amount) || 0) * (active.dailyRoi / 100) * active.durationDays)}
              </b>
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setActive(null)} className="flex-1 rounded-xl glass-soft py-2.5 text-sm font-semibold">
                Cancel
              </button>
              <button
                onClick={invest}
                disabled={busy}
                className="flex-1 rounded-xl gradient-brand py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy ? "Processing…" : "Confirm"}

              </button>
            </div>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}
