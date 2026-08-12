import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ShieldCheck, Wallet2 } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { depositBalance, money, planDaily, round2, useStore } from "@/lib/store";
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
      {
        name: "description",
        content:
          "Compare Starter, Growth, Premium and VIP plans and invest directly from your HopeX wallet.",
      },
      { property: "og:url", content: "https://hopex.site/plans" },
      { property: "og:title", content: "Investment Plans — HopeX" },
      { property: "og:description", content: "Daily income plans from 1.2% to 3.1%." },
    ],
    links: [{ rel: "canonical", href: "https://hopex.site/plans" }],
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

const GALLERY = [starterImg, growthImg, premiumImg, vipImg];

/** Stable per-plan artwork: admin image → known id → deterministic gallery pick. */
function planImage(p: Plan) {
  if (p.imageUrl) return p.imageUrl;
  if (FALLBACK[p.id]) return FALLBACK[p.id];
  let h = 0;
  for (let i = 0; i < p.id.length; i += 1) h = (h * 31 + p.id.charCodeAt(i)) >>> 0;
  return GALLERY[h % GALLERY.length]!;
}

function Plans() {
  const { db, user, addNotification, refresh } = useStore();
  const [active, setActive] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const deposited = depositBalance(db, user.id);

  const price = active ? active.min : 0;
  const daily = active ? planDaily(active) : 0;
  const total = active ? round2(daily * active.durationDays) : 0;

  const invest = async () => {
    if (!active) return;
    if (price > user.balance) return toast.error("Insufficient balance. Please deposit first.");
    setBusy(true);
    // 1.2s rapid spinner check as requested
    await new Promise(r => setTimeout(r, 1200));
    const { error } = await supabase.rpc("buy_plan", { _plan_id: active.id, _amount: price });
    if (error) {

      setBusy(false);
      return toast.error(error.message.replace(/^.*?:\s*/, ""));
    }
    addNotification(user.id, {
      title: "Investment activated",
      body: `${money(price)} allocated to the ${active.name} plan.`,
      kind: "success",
    });
    await refresh();
    setBusy(false);
    toast.success(`${active.name} plan is now live — first income credited.`);
    setActive(null);
  };

  return (
    <div>
      <SectionTitle
        title="Investment plans"
        subtitle="Pick a plan and start earning daily income."
      />

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
          <p className="mt-1 truncate font-display text-xl font-extrabold text-gold">
            {money(deposited)}
          </p>
        </GlassCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {db.plans
          .filter((p) => p.active)
          .map((p) => {
            const d = planDaily(p);
            const affordable = user.balance >= p.min;
            return (
              <GlassCard key={p.id} className="group flex flex-col overflow-hidden p-0">
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={planImage(p)}
                    alt={`${p.name} investment plan`}
                    loading="lazy"
                    width={768}
                    height={512}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <h2 className="font-display text-xl font-extrabold drop-shadow">{p.name}</h2>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="rounded-2xl glass-soft p-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        Price
                      </span>
                      <span className="font-display text-2xl font-extrabold">{money(p.min)}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-success/10 p-2.5 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Daily income
                        </p>
                        <p className="mt-0.5 font-bold text-success">{money(d)}</p>
                      </div>
                      <div className="rounded-xl bg-primary/10 p-2.5 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Days
                        </p>
                        <p className="mt-0.5 font-bold">{p.durationDays}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-sm">
                      <span className="text-muted-foreground">Total return</span>
                      <span className="font-bold text-gold">{money(round2(d * p.durationDays))}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActive(p)}
                    className="btn-glass btn-glass-primary mt-auto flex h-12 items-center justify-center text-sm font-bold"
                  >
                    {affordable ? "Activate plan" : "Deposit & activate"}
                  </button>
                </div>
              </GlassCard>
            );
          })}
      </div>


      {active ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
          <GlassCard className="animate-rise w-full max-w-sm">
            <h3 className="font-display text-xl font-extrabold">Confirm activation</h3>
            <p className="mt-1 text-sm text-muted-foreground">{active.name}</p>
            <div className="mt-4 space-y-2 rounded-2xl glass-soft p-4 text-sm">
              <Row label="Price" value={money(price)} />
              <Row label="Daily income" value={money(daily)} />
              <Row label="Days" value={String(active.durationDays)} />
              <Row label="Total return" value={money(total)} accent />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {money(price)} will be deducted from your balance and your first daily income is
              credited instantly. Active plans cannot be cancelled.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setActive(null)}
                className="btn-glass flex h-12 flex-1 items-center justify-center text-sm font-semibold text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={invest}
                disabled={busy}
                className="btn-glass btn-glass-primary flex h-12 flex-1 items-center justify-center text-sm font-bold disabled:opacity-60"
              >
                {busy ? (
                  <div className="h-5 w-5 animate-[spin_0.6s_linear_infinite] rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  "Confirm & activate"
                )}
              </button>

            </div>
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

