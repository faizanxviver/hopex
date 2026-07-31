import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { BadgeCheck, ShieldCheck, Wallet2 } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { Progress } from "@/components/ui/progress";
import { depositBalance, investmentProgress, money, useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import starterImg from "@/assets/plan-starter.jpg";
import growthImg from "@/assets/plan-growth.jpg";
import premiumImg from "@/assets/plan-premium.jpg";
import vipImg from "@/assets/plan-vip.jpg";

import type { Plan } from "@/lib/store";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Investment Plans — HopeX" },
      { name: "description", content: "Compare Starter, Growth, Premium and VIP plans and invest directly from your HopeX wallet." },
      { property: "og:title", content: "Investment Plans — HopeX" },
      { property: "og:description", content: "Daily income plans from 1.2% to 3.1%." },
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

const FALLBACK: Record<string, string> = {
  starter: starterImg,
  growth: growthImg,
  premium: premiumImg,
  vip: vipImg,
};

function planImage(p: Plan) {
  return p.imageUrl || FALLBACK[p.id] || starterImg;
}

function Plans() {
  const { db, user, addNotification, refresh } = useStore();
  const [active, setActive] = useState<Plan | null>(null);
  const [amount, setAmount] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const investments = db.investments.filter((i) => i.userId === user.id);
  const deposited = depositBalance(db, user.id);

  const value = Number(amount) || 0;
  const projected = active ? value * (active.dailyRoi / 100) * active.durationDays : 0;

  const openConfirm = () => {
    if (!active) return;
    if (!value || value < active.min || value > active.max) {
      return toast.error(`Amount must be between ${money(active.min)} and ${money(active.max)}.`);
    }
    if (value > user.balance) return toast.error("Insufficient balance. Please deposit first.");
    setConfirming(true);
  };

  const invest = async () => {
    if (!active) return;
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
    toast.success(`${active.name} plan is now live — first income credited.`);
    setConfirming(false);
    setActive(null);
    setAmount("");
  };

  return (
    <div>
      <SectionTitle title="Investment plans" subtitle="Pick a plan and start earning daily income." />

      <div className="mb-5 grid grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Wallet2 className="h-3.5 w-3.5" /> Available balance
          </p>
          <p className="mt-1 truncate font-display text-xl font-extrabold">{money(user.balance)}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Deposit balance
          </p>
          <p className="mt-1 truncate font-display text-xl font-extrabold text-gold">{money(deposited)}</p>
        </GlassCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {db.plans
          .filter((p) => p.active)
          .map((p) => (
            <GlassCard key={p.id} className="flex flex-col overflow-hidden p-0">
              <div className="relative h-32 overflow-hidden">
                <img
                  src={planImage(p)}
                  alt={`${p.name} investment plan`}
                  loading="lazy"
                  width={768}
                  height={512}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <h2 className="font-display text-lg font-extrabold">{p.name}</h2>
                  <span className="rounded-full glass-soft px-2.5 py-1 text-xs font-bold text-success">
                    {p.dailyRoi}% / day
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs text-muted-foreground">
                  {(p.dailyRoi * p.durationDays).toFixed(0)}% total · {p.durationDays} days
                </p>
                <p className="mt-2 text-sm font-semibold">
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
                  className="btn-glass btn-glass-primary mt-6 flex h-12 items-center justify-center text-sm font-bold"
                >
                  Activate plan
                </button>
              </div>
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
                  <span>
                    {pct.toFixed(0)}% complete · {daysLeft} days left
                  </span>
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
            {confirming ? (
              <>
                <h3 className="font-display text-xl font-extrabold">Confirm your investment</h3>
                <div className="mt-4 space-y-2 rounded-2xl glass-soft p-4 text-sm">
                  <Row label="Plan" value={active.name} />
                  <Row label="Amount" value={money(value)} />
                  <Row label="Daily income" value={money(value * (active.dailyRoi / 100))} />
                  <Row label="Duration" value={`${active.durationDays} days`} />
                  <Row label="Total return" value={money(projected)} accent />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {money(value)} will be deducted from your balance and your first daily income is credited instantly.
                  Active plans cannot be cancelled.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setConfirming(false)}
                    className="btn-glass flex h-12 flex-1 items-center justify-center text-sm font-semibold text-foreground"
                  >
                    Back
                  </button>
                  <button
                    onClick={invest}
                    disabled={busy}
                    className="btn-glass btn-glass-primary flex h-12 flex-1 items-center justify-center text-sm font-bold disabled:opacity-60"
                  >
                    {busy ? "Processing…" : "Confirm & activate"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-xl font-extrabold">Invest in {active.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {money(active.min)} – {money(active.max)} · {active.dailyRoi}% daily for {active.durationDays} days
                </p>
                <p className="mt-3 text-xs text-muted-foreground">Available: {money(user.balance)}</p>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  className="mt-3 h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Amount"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Projected total return: <b className="text-success">{money(projected)}</b>
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setActive(null)}
                    className="btn-glass flex h-12 flex-1 items-center justify-center text-sm font-semibold text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={openConfirm}
                    className="btn-glass btn-glass-primary flex h-12 flex-1 items-center justify-center text-sm font-bold"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? "font-bold text-success" : "font-semibold"}>{value}</span>
    </div>
  );
}
