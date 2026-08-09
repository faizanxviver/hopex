import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, Clock, Zap } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { createCheckoutSession } from "@/lib/checkout.functions";
import { depositBalance, money, pendingDeposits, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/deposit")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Deposit Funds — HopeX" },
      {
        name: "description",
        content:
          "Fund your wallet through the secure SecurePay gateway with bank transfer, USDT, JazzCash or EasyPaisa.",
      },
      { property: "og:title", content: "Deposit Funds — HopeX" },
      {
        property: "og:description",
        content: "Fast, secure deposits with multiple payment methods.",
      },
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

function Deposit() {
  const { db, user } = useStore();
  const [amount, setAmount] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const startCheckout = useServerFn(createCheckoutSession);

  if (!user) return null;

  const quick = db.settings.quickAmounts.length
    ? db.settings.quickAmounts
    : [1000, 3000, 5000, 10000, 25000, 50000];
  const deposited = depositBalance(db, user.id);
  const pending = pendingDeposits(db, user.id);

  const openGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < db.settings.minDeposit) {
      return toast.error(`Minimum deposit is ${money(db.settings.minDeposit)}.`);
    }
    setBusy(true);
    try {
      const session = await startCheckout({ data: { amount: value } });
      toast.info("Redirecting to the secure payment gateway…");
      window.location.href = session.url;
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Could not open the payment gateway.");
    }
  };

  return (
    <div>


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
                {quick.map((q) => (
                  <button
                    type="button"
                    key={q}
                    onClick={() => setAmount(String(q))}
                    className={cn(
                      "rounded-2xl border py-4 text-sm font-bold transition hover:-translate-y-0.5",
                      Number(amount) === q
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border glass-soft",
                    )}
                  >
                    Rs {q.toLocaleString("en-PK")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Or enter a custom amount (PKR)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000"
                className="h-14 w-full rounded-xl border border-input bg-background/40 px-4 text-lg font-bold outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              disabled={busy}
              className="btn-glass btn-glass-primary flex h-14 w-full items-center justify-center text-base font-bold disabled:opacity-60"
            >
              {busy ? "Opening secure gateway…" : "Submit & continue to payment"}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" /> You will be taken to our
              automatic payment gateway to select a method, pay and upload your screenshot.
            </p>

          </form>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Deposit balance
            </p>
            <p className="mt-2 font-display text-3xl font-extrabold">{money(deposited)}</p>
            {pending > 0 ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-warning">
                <Clock className="h-3 w-3" /> {money(pending)} awaiting approval
              </p>
            ) : null}
            <Link
              to="/deposit-history"
              className="mt-5 block rounded-xl gradient-cool py-2.5 text-center text-sm font-semibold text-primary-foreground"
            >
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
