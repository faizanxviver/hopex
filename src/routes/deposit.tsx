import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, Clock, Zap, Loader2 } from "lucide-react";
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
  const [connecting, setConnecting] = useState(false);
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
    setConnecting(true);
    try {
      const session = await startCheckout({ data: { amount: value } });
      // Keep the connecting screen visible for a moment, then open MPay in a new tab.
      await new Promise((r) => setTimeout(r, 1200));
      const tab = window.open(session.url, "_blank", "noopener,noreferrer");
      setConnecting(false);
      setBusy(false);
      if (!tab) {
        // Popup blocked — send the user straight to the gateway instead of hanging.
        window.location.href = session.url;
        return;
      }
      toast.success("MPay opened in a new tab. Complete your payment there.");
      window.location.href = "/deposit-history";
    } catch (err) {
      setConnecting(false);
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Could not open the payment gateway.");
    }
  };


  return (
    <div>
      {connecting ? <ConnectingOverlay amount={Number(amount)} /> : null}

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
              {busy ? "Connecting to MPay…" : "Submit & continue — MPay"}
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

function ConnectingOverlay({ amount }: { amount: number }) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-background/80 p-6 backdrop-blur-xl">
      <div className="animate-rise w-full max-w-sm rounded-[2rem] border border-border/50 bg-background/50 p-8 text-center shadow-[var(--shadow-elegant)] backdrop-blur-2xl">
        <div className="relative mx-auto grid h-24 w-24 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="relative grid h-20 w-20 place-items-center rounded-3xl gradient-brand text-primary-foreground">
            <Loader2 className="h-9 w-9 animate-spin [animation-duration:0.5s]" />
          </span>
        </div>
        <h2 className="mt-6 font-display text-2xl font-black">Connecting to MPay</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Securing your session{amount ? ` for ${money(amount)}` : ""} — redirecting to the payment
          gateway…
        </p>
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[scroll_0.7s_linear_infinite] rounded-full gradient-cool" />
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-success" /> Encrypted MPay session
        </p>
      </div>
    </div>
  );
}
