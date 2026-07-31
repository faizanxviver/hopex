import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2, Banknote, Bitcoin, Smartphone, Upload } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { money, newId, timestamp, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/deposit")({
  head: () => ({
    meta: [
      { title: "Deposit Funds — Aurum Capital" },
      { name: "description", content: "Fund your wallet via bank transfer, USDT, JazzCash or EasyPaisa." },
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

const methods = [
  { id: "Bank Transfer", icon: Building2, detail: "1–24 hrs · no fee" },
  { id: "USDT (TRC20)", icon: Bitcoin, detail: "Instant · network fee" },
  { id: "JazzCash", icon: Smartphone, detail: "Instant · 1% fee" },
  { id: "EasyPaisa", icon: Banknote, detail: "Instant · 1% fee" },
];

function Deposit() {
  const { db, user, update, addNotification } = useStore();
  const [method, setMethod] = useState(methods[0].id);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<string>("");
  const [promo, setPromo] = useState("");

  if (!user) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < db.settings.minDeposit) {
      return toast.error(`Minimum deposit is ${money(db.settings.minDeposit)}.`);
    }
    if (!reference.trim()) return toast.error("Enter the transaction ID from your payment.");

    let bonus = 0;
    const promoCode = db.promos.find(
      (p) => p.code.toLowerCase() === promo.trim().toLowerCase() && p.active && p.used < p.usageLimit,
    );
    if (promo.trim() && !promoCode) toast.error("Promo code is invalid or expired.");
    if (promoCode) bonus = promoCode.type === "percent" ? (value * promoCode.value) / 100 : promoCode.value;

    update((d) => {
      d.transactions.unshift({
        id: newId(),
        userId: user.id,
        type: "deposit",
        amount: value,
        method,
        reference: reference.trim(),
        status: "pending",
        createdAt: timestamp(),
      });
      if (promoCode) {
        const p = d.promos.find((x) => x.id === promoCode.id);
        if (p) p.used += 1;
        const me = d.users.find((u) => u.id === user.id)!;
        me.balance += bonus;
        d.transactions.unshift({
          id: newId(),
          userId: user.id,
          type: "bonus",
          amount: bonus,
          method: `Promo ${promoCode.code}`,
          status: "completed",
          createdAt: timestamp(),
        });
      }
      return d;
    });

    addNotification(user.id, {
      title: "Deposit submitted",
      body: `${money(value)} via ${method} is pending admin approval.`,
      kind: "info",
    });
    toast.success(bonus ? `Deposit submitted + ${money(bonus)} promo bonus credited!` : "Deposit submitted for approval.");
    setAmount("");
    setReference("");
    setFile("");
    setPromo("");
  };

  return (
    <div>
      <SectionTitle title="Deposit funds" subtitle={`Minimum deposit ${money(db.settings.minDeposit)}. Funds credit after approval.`} />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <GlassCard>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <p className="mb-3 text-sm font-semibold">Payment method</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {methods.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border p-4 text-left transition",
                      method === m.id ? "border-primary bg-primary/10" : "border-border glass-soft",
                    )}
                  >
                    <m.icon className="h-5 w-5 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{m.id}</span>
                      <span className="block truncate text-xs text-muted-foreground">{m.detail}</span>
                    </span>
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
                placeholder="500"
                className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {[100, 500, 1000, 5000].map((q) => (
                  <button
                    type="button"
                    key={q}
                    onClick={() => setAmount(String(q))}
                    className="rounded-lg glass-soft px-3 py-1 text-xs font-medium"
                  >
                    ${q}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Transaction ID</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. TXN-9F2K10AB"
                className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Payment screenshot (optional)</label>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                <Upload className="h-4 w-4 shrink-0" />
                <span className="truncate">{file || "Click to upload proof of payment"}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")}
                />
              </label>
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

            <button className="h-12 w-full rounded-xl gradient-brand font-semibold text-primary-foreground transition hover:scale-[1.01]">
              Submit deposit
            </button>
          </form>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Available balance</p>
            <p className="mt-2 font-display text-3xl font-extrabold">{money(user.balance)}</p>
            <Link to="/deposit-history" className="mt-5 block rounded-xl gradient-cool py-2.5 text-center text-sm font-semibold text-primary-foreground">
              Deposit history
            </Link>
          </GlassCard>
          <GlassCard>
            <p className="font-semibold">Payment details</p>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>Bank: Meezan Bank · Aurum Capital Ltd</p>
              <p>IBAN: PK36 MEZN 0001 2345 6789 0123</p>
              <p className="break-all">USDT TRC20: TQx8f4Kd9WmY2ZpLn3Ra7Vc1Hs6Bt5Uj0N</p>
              <p>JazzCash / EasyPaisa: 0300 1234567</p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
