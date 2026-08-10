import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowUpFromLine,
  Clock4,
  Info,
  Lock,
  ShieldCheck,
  Timer,
  Wallet,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { PayoutAccountCard } from "@/routes/profile";
import {
  WITHDRAW_CLOSE_HOUR,
  WITHDRAW_OPEN_HOUR,
  hasActivePlan,
  hour12,
  isWithdrawWindowOpen,
  money,
  newId,
  pakistanClock,
  timestamp,
  useStore,
} from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/withdraw")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Withdraw Funds — HopeX" },
      {
        name: "description",
        content: "Request a payout to your bound JazzCash or Easypaisa account between 8:00 AM and 7:00 PM PKT.",
      },
      { property: "og:title", content: "Withdraw Funds — HopeX" },
      { property: "og:description", content: "Fast payouts, reviewed within minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

const REVIEW_MS = 5 * 60 * 1000;

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function Withdraw() {
  const { db, user, update, addNotification } = useStore();
  const { t } = useT();
  const [amount, setAmount] = useState("");
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
  const pending =
    latest && (latest.status === "processing" || latest.status === "pending") ? latest : null;

  if (!user) return null;

  const planActive = hasActivePlan(db, user.id);
  const bound = Boolean(user.accountNumber && user.accountName);
  const windowOpen = isWithdrawWindowOpen(new Date(tick));

  /* ---------- account binding first ---------- */
  if (!bound) {
    return (
      <div className="space-y-5">
        <SectionTitle
          title={t("Bind your payout account")}
          subtitle={t("Add the JazzCash or Easypaisa account that will receive every payout.")}
        />
        <GlassCard className="mx-auto flex max-w-lg items-center gap-3" glow>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-brand text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <p className="text-sm text-muted-foreground">
            {t("Once bound, withdrawals always go to this account. You can change it later in More → Profile & settings.")}
          </p>
        </GlassCard>
        <div className="mx-auto max-w-lg">
          <PayoutAccountCard />
        </div>
      </div>
    );
  }

  /* ---------- pending review ---------- */
  if (pending) {
    const left = REVIEW_MS - (tick - new Date(pending.createdAt).getTime());
    return (
      <div>
        <SectionTitle
          title={t("Withdrawal under review")}
          subtitle={t("Our payouts team is verifying your request.")}
        />
        <GlassCard className="mx-auto max-w-lg text-center" glow>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-cool text-primary-foreground">
            <Timer className="h-7 w-7" />
          </span>
          <p className="mt-5 font-display text-4xl font-black tabular-nums">
            {left > 0 ? clock(left) : t("Reviewing…")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {money(pending.amount)} · {pending.method}
          </p>
          <div className="mt-5 rounded-2xl glass-soft p-4 text-left text-sm">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("Payout account")}
            </p>
            <p className="mt-1 font-semibold">{pending.reference}</p>
          </div>
          <Link
            to="/withdraw-history"
            className="btn-glass mt-5 flex h-12 items-center justify-center text-sm font-semibold text-foreground"
          >
            {t("Withdraw history")}
          </Link>
        </GlassCard>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planActive) {
      return toast.error(t("Activate an investment plan before requesting a withdrawal."));
    }
    if (!windowOpen) {
      return toast.error(
        t("Withdrawals are accepted between 8:00 AM and 8:00 PM Pakistan time."),
      );
    }
    if (user.blocked) return toast.error(t("Your account is frozen. Please contact support."));
    const value = Number(amount);
    if (!value || value < db.settings.minWithdraw) {
      return toast.error(`${t("Minimum withdrawal is")} ${money(db.settings.minWithdraw)}.`);
    }
    if (value > user.balance) return toast.error(t("Amount exceeds your available balance."));

    update((d) => {
      const me = d.users.find((u) => u.id === user.id)!;
      me.balance -= value;
      d.transactions.unshift({
        id: newId(),
        userId: me.id,
        type: "withdraw",
        amount: value,
        method: me.bankName || "Wallet",
        reference: `${me.accountName} · ${me.accountNumber}`,
        status: "processing",
        createdAt: timestamp(),
      });
      return d;
    });
    addNotification(user.id, {
      title: "Withdrawal requested",
      body: `${money(value)} to ${user.bankName} is under review.`,
      kind: "info",
    });
    toast.success(t("Withdrawal submitted — review starts now."));
    setAmount("");
  };

  const quick = [25, 50, 75, 100];

  return (
    <div className="space-y-5">
      <SectionTitle title={t("Withdraw funds")} subtitle={t("Fast payouts to your bound account.")} />

      {/* Balance hero */}
      <GlassCard glow className="relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("Withdrawable balance")}
          </p>
          <p className="mt-1 font-display text-4xl font-black tracking-tight">{money(user.balance)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold",
                windowOpen ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
              )}
            >
              <Clock4 className="h-3 w-3" />
              {windowOpen ? t("Payout window open") : t("Payout window closed")} · {pakistanClock(new Date(tick))}
            </span>
            {!planActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/20 px-3 py-1 text-[11px] font-bold text-warning">
                <Lock className="h-3 w-3" /> {t("Plan required")}
              </span>
            ) : null}
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <GlassCard>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold">{t("Amount")} (PKR)</label>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2500"
                className="h-14 w-full rounded-2xl border border-input bg-background/40 px-4 font-display text-xl font-extrabold outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="mt-2 grid grid-cols-4 gap-2">
                {quick.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setAmount(String(Math.floor((user.balance * p) / 100)))}
                    className="btn-glass h-10 text-xs font-bold text-foreground"
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl glass-soft p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {t("Payout account")}
              </p>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Wallet className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{user.accountName}</span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">
                    {user.bankName} · {user.accountNumber}
                  </span>
                </span>
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t("To change this account go to More → Profile & settings.")}
              </p>
            </div>

            <button className="btn-glass btn-glass-primary flex h-14 w-full items-center justify-center gap-2 text-base font-bold">
              <ArrowUpFromLine className="h-5 w-5" /> {t("Request withdrawal")}
            </button>
          </form>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <p className="font-display text-base font-extrabold">{t("Withdraw rules")}</p>
            <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Clock4 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("Requests are accepted daily from")} {WITHDRAW_OPEN_HOUR}:00 {t("to")}{" "}
                {WITHDRAW_CLOSE_HOUR}:00 (PKT)
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {t("At least one investment plan must be active.")}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {t("Minimum withdrawal is")} {money(db.settings.minWithdraw)}
              </li>
              <li className="flex items-start gap-2">
                <Timer className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("Reviewed within about 5 minutes.")}
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                {t("Declined requests are refunded instantly.")}
              </li>
            </ul>
          </GlassCard>

          <Link
            to="/withdraw-history"
            className="btn-glass flex h-12 items-center justify-center text-sm font-semibold text-foreground"
          >
            {t("Withdraw history")}
          </Link>
        </div>
      </div>
    </div>
  );
}
