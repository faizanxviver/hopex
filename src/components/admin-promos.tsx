import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Ticket,
  Plus,
  Users,
  Wallet,
  CalendarClock,
  Trash2,
  Copy,
  Percent,
  BadgeCheck,
} from "lucide-react";
import { GlassCard } from "@/components/glass";
import { money, newId, useStore } from "@/lib/store";
import type { PromoCode } from "@/lib/store";
import { cn } from "@/lib/utils";

const AUDIENCES: { id: PromoCode["audience"]; label: string; hint: string }[] = [
  { id: "all", label: "All users", hint: "Anyone with an account can redeem" },
  { id: "depositors", label: "Deposited users", hint: "Only users with an approved deposit" },
  { id: "active_plan", label: "Active plan users", hint: "Only users running an investment" },
  { id: "new", label: "New users", hint: "Only users who never deposited" },
];

const emptyDraft = () => ({
  code: "",
  value: 500,
  usageLimit: 100,
  perUserLimit: 1,
  audience: "all" as PromoCode["audience"],
  expiresAt: "",
  description: "",
});

export function PromoManager() {
  const { db, update } = useStore();
  const [draft, setDraft] = useState(emptyDraft);
  const [open, setOpen] = useState(false);

  const promos = useMemo(
    () => [...db.promos].sort((a, b) => Number(b.active) - Number(a.active)),
    [db.promos],
  );

  const set = <K extends keyof ReturnType<typeof emptyDraft>>(
    k: K,
    v: ReturnType<typeof emptyDraft>[K],
  ) => setDraft((d) => ({ ...d, [k]: v }));

  const create = () => {
    const code = draft.code.trim().toUpperCase();
    if (!code) return toast.error("Enter a promo code.");
    if (db.promos.some((p) => p.code.toUpperCase() === code))
      return toast.error("This code already exists.");
    if (draft.value <= 0) return toast.error("Bonus amount must be greater than 0.");
    if (draft.usageLimit <= 0) return toast.error("Total uses must be at least 1.");

    update((d) => {
      d.promos.push({
        id: newId(),
        code,
        type: "fixed",
        value: draft.value,
        usageLimit: draft.usageLimit,
        used: 0,
        expiresAt: draft.expiresAt,
        active: true,
        audience: draft.audience,
        perUserLimit: Math.max(1, draft.perUserLimit),
        description: draft.description.trim(),
      });
      return d;
    });
    toast.success(`${code} created — ${money(draft.value)} bonus.`);
    setDraft(emptyDraft());
    setOpen(false);
  };

  const patch = (id: string, fn: (p: PromoCode) => void) =>
    update((d) => {
      const t = d.promos.find((x) => x.id === id);
      if (t) fn(t);
      return d;
    });

  const remove = (id: string) =>
    update((d) => {
      d.promos = d.promos.filter((x) => x.id !== id);
      return d;
    });

  return (
    <div className="space-y-5">
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl gradient-brand text-primary-foreground">
              <Ticket className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-black">Promo code builder</h2>
              <p className="text-xs text-muted-foreground">
                Fixed rupee bonus credited straight to the withdrawable balance.
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="btn-glass btn-glass-primary flex h-11 items-center gap-2 px-5 text-sm font-bold"
          >
            <Plus className="h-4 w-4" />
            {open ? "Close builder" : "New promo code"}
          </button>
        </div>

        {open ? (
          <div className="mt-5 grid gap-4 border-t border-border/50 pt-5 lg:grid-cols-2">
            <Field label="Code">
              <input
                value={draft.code}
                onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="HOPEX500"
                className={inputCls + " font-display tracking-[0.2em]"}
              />
            </Field>
            <Field label="Bonus amount (Rs)">
              <input
                type="number"
                min={1}
                value={draft.value}
                onChange={(e) => set("value", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Total uses (how many users)">
              <input
                type="number"
                min={1}
                value={draft.usageLimit}
                onChange={(e) => set("usageLimit", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Uses per user">
              <input
                type="number"
                min={1}
                value={draft.perUserLimit}
                onChange={(e) => set("perUserLimit", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Expires on (optional)">
              <input
                type="date"
                value={draft.expiresAt}
                onChange={(e) => set("expiresAt", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Note for admins (optional)">
              <input
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Eid campaign"
                className={inputCls}
              />
            </Field>

            <div className="lg:col-span-2">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Who can use this code
              </p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {AUDIENCES.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => set("audience", a.id)}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition",
                      draft.audience === a.id
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/60 glass-soft hover:bg-muted/40",
                    )}
                  >
                    <p className="text-sm font-bold">{a.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{a.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl glass-soft p-4">
              <p className="text-sm text-muted-foreground">
                Payout per user: <span className="font-bold text-foreground">{money(draft.value)}</span> ·
                Max cost:{" "}
                <span className="font-bold text-foreground">
                  {money(draft.value * Math.max(1, draft.usageLimit))}
                </span>
              </p>
              <button
                onClick={create}
                className="btn-glass btn-glass-primary h-11 px-6 text-sm font-bold"
              >
                Create promo code
              </button>
            </div>
          </div>
        ) : null}
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {promos.map((p) => {
          const aud = AUDIENCES.find((a) => a.id === p.audience) ?? AUDIENCES[0];
          const pct = Math.min(100, Math.round((p.used / Math.max(1, p.usageLimit)) * 100));
          return (
            <GlassCard key={p.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-black text-gold">{p.code}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.description || aud.label}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-bold",
                    p.active
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/15 text-destructive",
                  )}
                >
                  {p.active ? "Live" : "Paused"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Chip icon={<Wallet className="h-3.5 w-3.5" />}>
                  {p.type === "percent" ? `${p.value}%` : money(p.value)}
                </Chip>
                <Chip icon={<Users className="h-3.5 w-3.5" />}>{aud.label}</Chip>
                <Chip icon={<BadgeCheck className="h-3.5 w-3.5" />}>
                  {p.perUserLimit}× per user
                </Chip>
                <Chip icon={<CalendarClock className="h-3.5 w-3.5" />}>
                  {p.expiresAt || "No expiry"}
                </Chip>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    Used {p.used}/{p.usageLimit}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    {pct}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted/50">
                  <div className="h-full gradient-brand" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => patch(p.id, (t) => void (t.active = !t.active))}
                  className="btn-glass h-10 flex-1 text-xs font-bold text-foreground"
                >
                  {p.active ? "Pause" : "Activate"}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(p.code);
                    toast.success("Code copied.");
                  }}
                  className="btn-glass grid h-10 w-10 place-items-center text-foreground"
                  aria-label="Copy code"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    remove(p.id);
                    toast.success("Promo code deleted.");
                  }}
                  className="btn-glass grid h-10 w-10 place-items-center text-destructive"
                  aria-label="Delete code"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </GlassCard>
          );
        })}
        {promos.length === 0 ? (
          <GlassCard className="p-8 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
            No promo codes yet — create your first campaign above.
          </GlassCard>
        ) : null}
      </div>
    </div>
  );
}

const inputCls =
  "h-12 w-full rounded-2xl border border-border/60 bg-background/40 px-4 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl glass-soft px-2.5 py-1.5 font-semibold">
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}
