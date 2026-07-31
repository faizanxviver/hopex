import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2, Banknote, Bitcoin, Smartphone, Lock, ShieldCheck, Timer, CheckCircle2, XCircle } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { hasActivePlan, money, newId, timestamp, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/withdraw")({
  head: () => ({
    meta: [
      { title: "Withdraw Funds — HopeX" },
      { name: "description", content: "Withdraw your available balance to your saved bank, JazzCash or EasyPaisa account." },
      { property: "og:title", content: "Withdraw Funds — HopeX" },
      { property: "og:description", content: "Fast payouts, reviewed within minutes." },
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

const METHODS = [
  { id: "Bank Transfer", icon: Building2 },
  { id: "JazzCash", icon: Smartphone },
  { id: "EasyPaisa", icon: Banknote },
  { id: "USDT (TRC20)", icon: Bitcoin },
];

const REVIEW_MS = 5 * 60 * 1000;

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function Withdraw() {
  const { db, user, update, addNotification } = useStore();
  const [method, setMethod] = useState(METHODS[0].id);
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState("");
  const [holder, setHolder] = useState("");
  const [account, setAccount] = useState("");
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const myWithdrawals = useMemo(
    () => db.transactions.filter((t) => t.userId === user?.id && t.type === "withdraw"),
    [db.transactions, user?.id],
  );
  const latest = myWithdrawals[0];
  const pending = latest && (latest.status === "processing" || latest.status === "pending") ? latest : null;

  if (!user) return null;

  const planActive = hasActivePlan(db, user.id);
  const savedAccount = Boolean(user.accountNumber && user.accountName);

  const saveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (holder.trim().length < 3) return toast.error("Enter the account holder name.");
    if (account.trim().length < 6) return toast.error("Enter a valid account number.");
    update((d) => {
      const me = d.users.find((u) => u.id === user.id)!;
      me.bankName = bank.trim() || method;
      me.accountName = holder.trim();
      me.accountNumber = account.trim();
      return d;
    });
    toast.success("Payout account saved — you can withdraw now.");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < db.settings.minWithdraw) {
      return toast.error(`Minimum withdrawal is ${money(db.settings.minWithdraw)}.`);
    }
    if (value > user.balance) return toast.error("Amount exceeds your available balance.");

    update((d) => {
      const me = d.users.find((u) => u.id === user.id)!;
      me.balance -= value;
      d.transactions.unshift({
        id: newId(),
        userId: me.id,
        type: "withdraw",
        amount: value,
        method,
        reference: `${me.accountName} · ${me.accountNumber}`,
        status: "processing",
        createdAt: timestamp(),
      });
      return d;
    });
    addNotification(user.id, {
      title: "Withdrawal requested",
      body: `${money(value)} to ${method} is under review.`,
      kind: "info",
    });
    toast.success("Withdrawal submitted — review starts now.");
    setAmount("");
  };

  /* ---------- locked: no plan ---------- */
  if (!planActive) {
    return (
      <div>
        <SectionTitle title="Withdraw funds" subtitle="Withdrawals unlock once you own an investment plan." />
        <GlassCard className="mx-auto max-w-lg text-center" glow>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-brand text-primary-foreground">
            <Lock className="h-7 w-7" />
          </span>
          <h2 className="mt-5 font-display text-2xl font-extrabold">Withdrawals are locked</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You must activate at least one investment plan before requesting a payout. Your balance of{" "}
            {money(user.balance)} stays safe in your wallet.
          </p>
          <Link to="/plans" className="btn-glass btn-glass-primary mt-6 flex h-12 items-center justify-center text-sm font-bold">
            Browse investment plans
          </Link>
          <Link to="/deposit" className="btn-glass mt-3 flex h-12 items-center justify-center text-sm font-semibold text-foreground">
            Deposit funds first
          </Link>
        </GlassCard>
      </div>
    );
  }

  /* ---------- pending review ---------- */
  if (pending) {
    const left = REVIEW_MS - (tick - new Date(pending.createdAt).getTime());
    return (
      <div>
        <SectionTitle title="Withdrawal under review" subtitle="Our payouts team is verifying your request." />
        <GlassCard className="mx-auto max-w-lg text-center" glow>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-cool text-primary-foreground">
            <Timer className="h-7 w-7" />
          </span>
          <p className="mt-5 font-display text-4xl font-black tabular-nums">{left > 0 ? clock(left) : "Reviewing…"}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {money(pending.amount)} to {pending.method} · this page updates live the moment your request is approved
            or declined.
          </p>
          <div className="mt-5 rounded-2xl glass-soft p-4 text-left text-sm">
            <p className="text-muted-foreground">Payout account</p>
            <p className="mt-1 font-semibold">{pending.reference}</p>
          </div>
          <Link
            to="/withdraw-history"
            className="btn-glass mt-5 flex h-12 items-center justify-center text-sm font-semibold text-foreground"
          >
            Withdrawal history
          </Link>
        </GlassCard>
      </div>
    );
  }

  /* ---------- no saved payout account ---------- */
  if (!savedAccount) {
    return (
      <div>
        <SectionTitle title="Add your payout account" subtitle="Save the account you want to receive payments in." />
        <GlassCard className="mx-auto max-w-lg" glow>
          <span className="grid h-14 w-14 place-items-center rounded-2xl gradient-brand text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-display text-xl font-extrabold">Payout account required</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Withdrawals are only sent to a verified account saved on your profile.
          </p>
          <form onSubmit={saveAccount} className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {METHODS.map((m) => (
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
            <input
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="Bank / wallet name"
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="Account holder name"
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder={method.includes("USDT") ? "Wallet address" : "Account / mobile number"}
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button className="btn-glass btn-glass-primary flex h-13 w-full items-center justify-center py-4 text-base font-bold">
              Save payout account
            </button>
          </form>
        </GlassCard>
      </div>
    );
  }

  /* ---------- withdraw form ---------- */
  return (
    <div>
      <SectionTitle title="Withdraw funds" subtitle={`Available balance: ${money(user.balance)}`} />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <GlassCard>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <p className="mb-3 text-sm font-semibold">Payout method</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {METHODS.map((m) => (
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
              <label className="mb-2 block text-sm font-semibold">Amount (PKR)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2500"
                className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setAmount(String(Math.floor(user.balance)))}
                className="mt-2 rounded-lg glass-soft px-3 py-1 text-xs font-medium"
              >
                Withdraw max
              </button>
            </div>

            <div className="rounded-2xl glass-soft p-4 text-sm">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Saved payout account</p>
              <p className="mt-1 font-semibold">{user.accountName}</p>
              <p className="text-muted-foreground">
                {user.bankName} · {user.accountNumber}
              </p>
              <Link to="/profile" className="mt-2 inline-block text-xs font-semibold text-primary">
                Change in profile
              </Link>
            </div>

            <button className="btn-glass btn-glass-primary flex h-13 w-full items-center justify-center py-4 text-base font-bold">
              Request withdrawal
            </button>
          </form>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Available</p>
            <p className="mt-2 font-display text-3xl font-extrabold">{money(user.balance)}</p>
            <Link
              to="/withdraw-history"
              className="btn-glass mt-5 flex h-12 items-center justify-center text-sm font-semibold text-foreground"
            >
              Withdrawal history
            </Link>
          </GlassCard>
          <GlassCard>
            <p className="font-semibold">Payout policy</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Minimum withdrawal{" "}
                {money(db.settings.minWithdraw)}
              </li>
              <li className="flex items-start gap-2">
                <Timer className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Reviewed within about 5 minutes
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> Declined requests are refunded
                instantly
              </li>
            </ul>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
