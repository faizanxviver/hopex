import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ShieldCheck, Clock, Zap } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { PaymentGateway, type GatewayResult } from "@/components/payment-gateway";
import { depositBalance, money, newId, pendingDeposits, timestamp, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/deposit")({
  head: () => ({
    meta: [
      { title: "Deposit Funds — Aurum Capital" },
      { name: "description", content: "Fund your wallet through the secure SecurePay gateway with bank transfer, USDT, JazzCash or EasyPaisa." },
      { property: "og:title", content: "Deposit Funds — Aurum Capital" },
      { property: "og:description", content: "Fast, secure deposits with multiple payment methods." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <Deposit />
      </DashboardLayout>
    </AuthGuard>
  ),
});

const QUICK = [100, 250, 500, 1000, 2500, 5000];

function Deposit() {
  const { db, user, update, addNotification, redeemPromo } = useStore();
  const [amount, setAmount] = useState<string>("");
  const [promo, setPromo] = useState("");
  const [gateway, setGateway] = useState<number | null>(null);

  if (!user) return null;

  const deposited = depositBalance(db, user.id);
  const pending = pendingDeposits(db, user.id);

  const openGateway = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < db.settings.minDeposit) {
      return toast.error(`Minimum deposit is ${money(db.settings.minDeposit)}.`);
    }
    toast.info("Redirecting to the secure payment gateway…");
    setGateway(value);
  };

  const complete = async (r: GatewayResult) => {
    const value = gateway!;
    setGateway(null);

    let bonus = 0;
    let bonusCode = "";
    if (promo.trim()) {
      const redeemed = await redeemPromo(promo.trim(), value);
      if (!redeemed) toast.error("Promo code is invalid or expired.");
      else {
        bonus = redeemed.bonus;
        bonusCode = redeemed.code;
      }
    }

    update((d) => {
      d.transactions.unshift({
        id: newId(),
        userId: user.id,
        type: "deposit",
        amount: value,
        method: r.method,
        reference: r.reference || r.proof,
        note: r.proof ? `Proof: ${r.proof}` : undefined,
        status: "pending",
        createdAt: timestamp(),
      });
      if (bonus > 0) {
        const me = d.users.find((u) => u.id === user.id)!;
        me.balance += bonus;
        d.transactions.unshift({
          id: newId(),
          userId: user.id,
          type: "bonus",
          amount: bonus,
          method: `Promo ${bonusCode}`,
          status: "completed",
          createdAt: timestamp(),
        });
      }
      return d;
    });

    addNotification(user.id, {
      title: "Deposit submitted",
      body: `${money(value)} via ${r.method} is pending admin approval.`,
      kind: "info",
    });
    toast.success(bonus ? `Deposit submitted + ${money(bonus)} promo bonus credited!` : "Deposit submitted for approval.");
    setAmount("");
    setPromo("");
  };

  return (
    <div>
      {gateway !== null ? (
        <PaymentGateway
          amount={gateway}
          onExit={() => {
            setGateway(null);
            toast.error("Payment cancelled — nothing was submitted.");
          }}
          onComplete={complete}
        />
      ) : null}

      <SectionTitle
        title="Deposit funds"
        subtitle={`Choose an amount, then complete payment inside the secure gateway. Minimum ${money(db.settings.minDeposit)}.`}
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <GlassCard>
          <form onSubmit={openGateway} className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-semibold">Quick amount</p>
              <div className="grid grid-cols-3 gap-3">
                {QUICK.map((q) => (
                  <button
                    type="button"
                    key={q}
                    onClick={() => setAmount(String(q))}
                    className={cn(
                      "rounded-2xl border py-4 text-sm font-bold transition hover:-translate-y-0.5",
                      Number(amount) === q ? "border-primary bg-primary/10 text-primary" : "border-border glass-soft",
                    )}
                  >
                    ${q.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Or enter a custom amount (USD)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                className="h-14 w-full rounded-xl border border-input bg-background/40 px-4 text-lg font-bold outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Promo code (optional)</label>
              <input
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                placeholder="WELCOME10"
                className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button className="h-14 w-full rounded-xl gradient-brand text-base font-bold text-primary-foreground transition hover:scale-[1.01]">
              Submit &amp; continue to payment
            </button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> You will be taken to the SecurePay gateway to
              select a method, pay and upload your screenshot.
            </p>
          </form>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Deposit balance</p>
            <p className="mt-2 font-display text-3xl font-extrabold">{money(deposited)}</p>
            {pending > 0 ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-warning">
                <Clock className="h-3 w-3" /> {money(pending)} awaiting approval
              </p>
            ) : null}
            <Link to="/deposit-history" className="mt-5 block rounded-xl gradient-cool py-2.5 text-center text-sm font-semibold text-primary-foreground">
              Deposit history
            </Link>
          </GlassCard>
          <GlassCard>
            <p className="flex items-center gap-2 font-semibold">
              <Zap className="h-4 w-4 text-gold" /> How it works
            </p>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>1. Pick an amount and submit.</li>
              <li>2. The secure gateway opens in full screen.</li>
              <li>3. Choose a method and copy the account number.</li>
              <li>4. Pay, upload the screenshot and submit.</li>
              <li>5. Funds credit after admin approval.</li>
            </ol>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
