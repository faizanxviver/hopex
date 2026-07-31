import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2, Banknote, Bitcoin, Smartphone } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { money, newId, timestamp, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/withdraw")({
  head: () => ({
    meta: [
      { title: "Withdraw Funds — Aurum Capital" },
      { name: "description", content: "Withdraw your available balance to bank, USDT, JazzCash or EasyPaisa." },
      { property: "og:title", content: "Withdraw Funds — Aurum Capital" },
      { property: "og:description", content: "Fast payouts, typically under 2 hours." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <Withdraw />
      </DashboardLayout>
    </AuthGuard>
  ),
});

const methods = [
  { id: "Bank Transfer", icon: Building2 },
  { id: "USDT (TRC20)", icon: Bitcoin },
  { id: "JazzCash", icon: Smartphone },
  { id: "EasyPaisa", icon: Banknote },
];

function Withdraw() {
  const { db, user, update, addNotification } = useStore();
  const [method, setMethod] = useState(methods[0].id);
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("");
  const [holder, setHolder] = useState("");

  if (!user) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < db.settings.minWithdraw) {
      return toast.error(`Minimum withdrawal is ${money(db.settings.minWithdraw)}.`);
    }
    if (value > user.balance) return toast.error("Amount exceeds your available balance.");
    if (!account.trim() || !holder.trim()) return toast.error("Enter your account details.");

    update((d) => {
      const me = d.users.find((u) => u.id === user.id)!;
      me.balance -= value;
      d.transactions.unshift({
        id: newId(),
        userId: me.id,
        type: "withdraw",
        amount: value,
        method,
        reference: `${holder.trim()} · ${account.trim()}`,
        status: "pending",
        createdAt: timestamp(),
      });
      return d;
    });
    addNotification(user.id, {
      title: "Withdrawal requested",
      body: `${money(value)} to ${method} is being reviewed.`,
      kind: "info",
    });
    toast.success("Withdrawal request submitted.");
    setAmount("");
    setAccount("");
    setHolder("");
  };

  return (
    <div>
      <SectionTitle title="Withdraw funds" subtitle={`Available balance: ${money(user.balance)}`} />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <GlassCard>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <p className="mb-3 text-sm font-semibold">Payout method</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {methods.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border p-4 text-left text-sm font-semibold transition",
                      method === m.id ? "border-primary bg-primary/10" : "border-border glass-soft",
                    )}
                  >
                    <m.icon className="h-5 w-5 shrink-0 text-primary" />
                    <span className="truncate">{m.id}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Amount (USD)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="250"
                className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setAmount(String(user.balance.toFixed(2)))}
                className="mt-2 rounded-lg glass-soft px-3 py-1 text-xs font-medium"
              >
                Withdraw max
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">Account holder</label>
                <input
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  placeholder="Full name"
                  className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  {method.includes("USDT") ? "Wallet address" : "Account number / IBAN"}
                </label>
                <input
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder={method.includes("USDT") ? "T..." : "PK00 XXXX ..."}
                  className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <button className="h-12 w-full rounded-xl gradient-brand font-semibold text-primary-foreground transition hover:scale-[1.01]">
              Request withdrawal
            </button>
          </form>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Available</p>
            <p className="mt-2 font-display text-3xl font-extrabold">{money(user.balance)}</p>
            <Link to="/withdraw-history" className="mt-5 block rounded-xl gradient-cool py-2.5 text-center text-sm font-semibold text-primary-foreground">
              Withdraw history
            </Link>
          </GlassCard>
          <GlassCard>
            <p className="font-semibold">Payout policy</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Minimum withdrawal {money(db.settings.minWithdraw)}</li>
              <li>Processed within 2 hours on business days</li>
              <li>KYC required above $1,000 per day</li>
            </ul>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
