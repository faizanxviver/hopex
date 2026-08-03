import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Gift,
  Crown,
  Check,
  X,
  Loader2,
  Search,
  Phone,
  Timer,
  Trash2,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { GlassCard } from "@/components/glass";
import { money, useStore } from "@/lib/store";
import {
  activateLeaderPlan,
  adjustUserBalance,
  removeLeaderPlan,
  reviewRewardClaim,
  runLeaderPlanChecks,
  useLeaderPlans,
  useRewardClaims,
} from "@/lib/rewards";
import { cn } from "@/lib/utils";

/* ============ Reward task review ============ */

export function RewardsAdmin() {
  const { db, update } = useStore();
  const { claims } = useRewardClaims();
  const [bucket, setBucket] = useState<"pending" | "approved" | "rejected">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(db.settings.rewardAmount));
  const [hours, setHours] = useState(String(db.settings.rewardCooldownHours));

  useEffect(() => {
    setAmount(String(db.settings.rewardAmount));
    setHours(String(db.settings.rewardCooldownHours));
  }, [db.settings.rewardAmount, db.settings.rewardCooldownHours]);

  const rows = claims.filter((c) => c.status === bucket);
  const nameOf = (id: string) => db.users.find((u) => u.id === id)?.name ?? "User";
  const phoneOf = (id: string) => db.users.find((u) => u.id === id)?.phone ?? "";

  const review = async (id: string, approve: boolean) => {
    const note = approve ? "" : (prompt("Reason for rejection (optional)") ?? "");
    setBusy(id);
    try {
      await reviewRewardClaim(id, approve, note);
      toast.success(approve ? "Reward approved and credited." : "Task rejected.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const saveSettings = () => {
    update((d) => {
      d.settings.rewardAmount = Math.max(0, Number(amount) || 0);
      d.settings.rewardCooldownHours = Math.max(1, Number(hours) || 24);
      return d;
    });
    toast.success("Reward settings saved.");
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/20 text-gold">
            <Gift className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold">Free reward task</p>
            <p className="truncate text-xs text-muted-foreground">
              Users share a post and upload WhatsApp + Facebook proof.
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={db.settings.rewardActive}
              onChange={(e) =>
                update((d) => {
                  d.settings.rewardActive = e.target.checked;
                  return d;
                })
              }
            />
            Active
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Reward amount (Rs)" value={amount} onChange={setAmount} />
          <Field label="Cooldown (hours)" value={hours} onChange={setHours} />
          <button
            onClick={saveSettings}
            className="btn-glass btn-glass-primary mt-auto h-11 text-sm font-bold"
          >
            Save
          </button>
        </div>
      </GlassCard>

      <div className="inline-flex gap-1 rounded-xl glass-soft p-1">
        {(["pending", "approved", "rejected"] as const).map((b) => (
          <button
            key={b}
            onClick={() => setBucket(b)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition",
              bucket === b ? "gradient-cool text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {b} ({claims.filter((c) => c.status === b).length})
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <GlassCard className="p-8 text-center text-sm text-muted-foreground">
          Nothing in this bucket.
        </GlassCard>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((c) => (
            <GlassCard key={c.id} className="p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-cool text-xs font-black text-primary-foreground">
                  {nameOf(c.userId).slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{nameOf(c.userId)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {phoneOf(c.userId)} · {new Date(c.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="shrink-0 font-display text-sm font-extrabold text-gold">
                  {money(c.status === "approved" ? c.amount : db.settings.rewardAmount)}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { url: c.whatsappProof, label: "WhatsApp status" },
                  { url: c.facebookProof, label: "Facebook post" },
                ].map((p) => (
                  <a
                    key={p.label}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-2xl border border-border/60"
                  >
                    <img src={p.url} alt={p.label} className="h-36 w-full object-cover" />
                    <span className="block bg-background/60 px-2 py-1 text-[10px] font-semibold">
                      {p.label}
                    </span>
                  </a>
                ))}
              </div>

              {c.adminNote ? (
                <p className="mt-2 text-xs text-muted-foreground">Note: {c.adminNote}</p>
              ) : null}

              {c.status === "pending" ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => void review(c.id, true)}
                    disabled={busy === c.id}
                    className="btn-glass btn-glass-primary flex h-10 items-center justify-center gap-2 text-xs font-bold disabled:opacity-60"
                  >
                    {busy === c.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => void review(c.id, false)}
                    disabled={busy === c.id}
                    className="btn-glass flex h-10 items-center justify-center gap-2 text-xs font-bold text-destructive disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              ) : null}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Leader plans ============ */

export function LeaderPlansAdmin() {
  const { db } = useStore();
  const { plans, reload } = useLeaderPlans();
  const [phone, setPhone] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [planId, setPlanId] = useState("");
  const [amount, setAmount] = useState("");
  const [hours, setHours] = useState("24");
  const [required, setRequired] = useState("");
  const [busy, setBusy] = useState(false);

  const user = useMemo(() => db.users.find((u) => u.id === target) ?? null, [db.users, target]);

  const find = () => {
    const digits = phone.replace(/\D/g, "");
    if (!digits) return toast.error("Enter a phone number.");
    const match = db.users.find(
      (u) => (u.phone ?? "").replace(/\D/g, "").endsWith(digits.slice(-10)) && u.role === "user",
    );
    if (!match) return toast.error("No user found with that number.");
    setTarget(match.id);
    toast.success(`${match.name} loaded.`);
  };

  const activate = async () => {
    if (!user) return;
    const plan = db.plans.find((p) => p.id === planId);
    if (!plan) return toast.error("Select a plan.");
    setBusy(true);
    try {
      await activateLeaderPlan({
        userId: user.id,
        planId: plan.id,
        amount: Number(amount) || plan.min,
        checkHours: Math.max(1, Number(hours) || 24),
        required: Number(required) || 0,
      });
      toast.success(`${plan.name} activated for ${user.name}.`);
      setTarget(null);
      setPhone("");
      void reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await removeLeaderPlan(id);
      toast.success("Leader plan removed.");
      void reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const runChecks = async () => {
    try {
      await runLeaderPlanChecks();
      toast.success("Requirement checks executed.");
      void reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/20 text-gold">
            <Crown className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold">Leader plan</p>
            <p className="text-xs text-muted-foreground">
              Admin-granted plan. No referral commission is paid to the upline.
            </p>
          </div>
          <button
            onClick={runChecks}
            className="btn-glass flex h-10 shrink-0 items-center gap-2 px-3 text-xs font-bold text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Run checks
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-input bg-background/40 px-3">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="User phone number"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <button
            onClick={find}
            className="btn-glass btn-glass-primary flex h-11 shrink-0 items-center gap-2 px-4 text-sm font-bold"
          >
            <Search className="h-4 w-4" /> Find
          </button>
        </div>

        {user ? (
          <div className="mt-4 rounded-2xl glass-soft p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-cool text-xs font-black text-primary-foreground">
                {user.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.phone} · {user.referralCode}
                </p>
              </div>
              <div className="flex gap-2 text-center">
                {[
                  ["Balance", money(user.balance)],
                  ["Invested", money(user.invested)],
                  [
                    "Team",
                    String(db.users.filter((u) => u.referredBy === user.referralCode).length),
                  ],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-background/50 px-3 py-1.5">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{l}</p>
                    <p className="text-[11px] font-bold">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Plan
                </span>
                <select
                  value={planId}
                  onChange={(e) => {
                    setPlanId(e.target.value);
                    const p = db.plans.find((x) => x.id === e.target.value);
                    if (p) setAmount(String(p.min));
                  }}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
                >
                  <option value="">Select plan…</option>
                  {db.plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {money(p.min)}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Amount (Rs)" value={amount} onChange={setAmount} />
              <Field label="Check after (hours)" value={hours} onChange={setHours} />
              <Field label="Required L1 investment" value={required} onChange={setRequired} />
            </div>

            <button
              onClick={activate}
              disabled={busy}
              className="btn-glass btn-glass-gold mt-3 flex h-11 w-full items-center justify-center gap-2 text-sm font-bold disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
              Activate leader plan
            </button>
          </div>
        ) : null}
      </GlassCard>

      <GlassCard className="p-5">
        <p className="font-display text-lg font-extrabold">Granted leader plans</p>
        {plans.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No leader plans yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-border/40">
            {plans.map((p) => {
              const owner = db.users.find((u) => u.id === p.userId);
              const left = new Date(p.deadlineAt).getTime() - Date.now();
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {owner?.name ?? "User"} · {p.planName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {money(p.amount)} · needs {money(p.requiredInvestment)} L1 ·{" "}
                      <Timer className="inline h-3 w-3" />{" "}
                      {left > 0
                        ? `${Math.ceil(left / 3600000)}h left`
                        : new Date(p.deadlineAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                      p.status === "active"
                        ? "bg-primary/15 text-primary"
                        : p.status === "passed"
                          ? "bg-success/15 text-success"
                          : "bg-destructive/15 text-destructive",
                    )}
                  >
                    {p.status}
                  </span>
                  {p.status === "active" ? (
                    <button
                      onClick={() => void remove(p.id)}
                      className="btn-glass flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs font-bold text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/* ============ Balance control ============ */

export function BalanceControl() {
  const { db } = useStore();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const users = db.users
    .filter((u) => u.role === "user")
    .filter((u) =>
      q.trim()
        ? `${u.name} ${u.phone ?? ""} ${u.referralCode}`.toLowerCase().includes(q.toLowerCase())
        : false,
    )
    .slice(0, 12);

  const adjust = async (id: string, kind: "deposit" | "withdraw") => {
    const raw = prompt(`${kind === "deposit" ? "Add to" : "Deduct from"} balance (Rs)`, "1000");
    const v = Number(raw);
    if (!v || v <= 0) return;
    const note = prompt("Note (optional)") ?? "";
    setBusy(true);
    try {
      await adjustUserBalance(id, v, kind, note);
      toast.success(kind === "deposit" ? "Balance credited." : "Balance deducted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Wallet className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold">Balance control</p>
          <p className="text-xs text-muted-foreground">
            Credits post as a deposit, deductions post as a withdrawal.
          </p>
        </div>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search user by name, phone or code…"
        className="mt-4 h-11 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
      />

      <div className="mt-3 divide-y divide-border/40">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{u.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {u.phone} · {money(u.balance)}
              </p>
            </div>
            <button
              onClick={() => void adjust(u.id, "deposit")}
              disabled={busy}
              className="btn-glass btn-glass-primary h-9 shrink-0 px-3 text-xs font-bold disabled:opacity-60"
            >
              Add
            </button>
            <button
              onClick={() => void adjust(u.id, "withdraw")}
              disabled={busy}
              className="btn-glass h-9 shrink-0 px-3 text-xs font-bold text-destructive disabled:opacity-60"
            >
              Deduct
            </button>
          </div>
        ))}
        {q.trim() && users.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No matching user.</p>
        ) : null}
      </div>
    </GlassCard>
  );
}

/* ============ shared ============ */

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        className="mt-1 h-11 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
      />
    </label>
  );
}
