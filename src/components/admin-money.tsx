import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Copy,
  Hash,
  Image as ImageIcon,
  Search,
  User2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, StatusBadge } from "@/components/glass";
import type { Transaction, TxStatus } from "@/lib/store";
import { money, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const isPending = (s: TxStatus) => s === "pending" || s === "processing";
const isDone = (s: TxStatus) => s === "approved" || s === "completed";

function CopyChip({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success(`${label} copied`);
          setTimeout(() => setDone(false), 1400);
        } catch {
          toast.error("Copy failed");
        }
      }}
      className="group flex min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-left transition hover:border-primary/50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span className="block truncate font-mono text-sm font-bold">{value}</span>
      </span>
      {done ? (
        <Check className="h-4 w-4 shrink-0 text-success" />
      ) : (
        <Copy className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
      )}
    </button>
  );
}

/**
 * Redesigned money-flow console for deposits (MPay auto gateway) and withdrawals.
 * Card based, mobile friendly, with copyable payout details.
 */
export function MoneyDesk({
  kind,
  onSetStatus,
  onViewProof,
}: {
  kind: "deposit" | "withdraw";
  onSetStatus: (id: string, status: TxStatus, credit: boolean) => void;
  onViewProof: (url: string) => void;
}) {
  const { db } = useStore();
  const [bucket, setBucket] = useState<"Pending" | "Approved" | "Rejected">("Pending");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const all = useMemo(
    () => db.transactions.filter((t) => t.type === kind),
    [db.transactions, kind],
  );

  const counts = {
    Pending: all.filter((t) => isPending(t.status)).length,
    Approved: all.filter((t) => isDone(t.status)).length,
    Rejected: all.filter((t) => t.status === "rejected").length,
  };

  const userName = (id: string) => db.users.find((u) => u.id === id)?.name ?? "Unknown";
  const userPhone = (id: string) => db.users.find((u) => u.id === id)?.phone ?? "";

  const rows = all
    .filter((t) =>
      bucket === "Pending" ? isPending(t.status) : bucket === "Approved" ? isDone(t.status) : t.status === "rejected",
    )
    .filter((t) => {
      if (!q.trim()) return true;
      const hay = `${userName(t.userId)} ${userPhone(t.userId)} ${t.method ?? ""} ${t.reference ?? ""} ${t.amount}`;
      return hay.toLowerCase().includes(q.trim().toLowerCase());
    });

  const total = rows.reduce((a, t) => a + t.amount, 0);
  const approveStatus: TxStatus = kind === "deposit" ? "approved" : "completed";

  const bulk = (status: TxStatus, credit: boolean) => {
    selected.forEach((id) => onSetStatus(id, status, credit));
    setSelected([]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <GlassCard className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span
            className={cn(
              "grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-primary-foreground",
              kind === "deposit" ? "gradient-cool" : "gradient-brand",
            )}
          >
            {kind === "deposit" ? (
              <ArrowDownToLine className="h-5 w-5" />
            ) : (
              <ArrowUpFromLine className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-extrabold">
              {kind === "deposit" ? "Auto Deposit — MPay" : "Withdrawals"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {rows.length} {bucket.toLowerCase()} · {money(total)} in view
            </p>
          </div>
          <label className="flex h-11 min-w-[12rem] flex-1 items-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search user, phone, reference…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>
      </GlassCard>

      {/* Buckets */}
      <div className="flex flex-wrap gap-2">
        {(["Pending", "Approved", "Rejected"] as const).map((b) => (
          <button
            key={b}
            onClick={() => {
              setBucket(b);
              setSelected([]);
            }}
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm font-bold transition",
              bucket === b
                ? b === "Pending"
                  ? "bg-destructive text-destructive-foreground shadow-[var(--shadow-elegant)]"
                  : "gradient-cool text-primary-foreground shadow-[var(--shadow-elegant)]"
                : "glass-soft text-muted-foreground",
            )}
          >
            {b === "Pending" ? "Pending" : b === "Approved" ? "Successful" : "Declined"} ({counts[b]})
          </button>
        ))}
      </div>

      {/* Bulk bar */}
      {bucket === "Pending" && rows.length > 0 ? (
        <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-3">
          <button
            onClick={() => setSelected(selected.length === rows.length ? [] : rows.map((r) => r.id))}
            className="btn-glass px-3 py-2 text-xs font-bold text-foreground"
          >
            {selected.length === rows.length ? "Clear" : "Select all"}
          </button>
          <span className="text-xs text-muted-foreground">{selected.length} selected</span>
          <div className="ml-auto flex gap-2">
            <button
              disabled={!selected.length}
              onClick={() => bulk(approveStatus, true)}
              className="rounded-xl bg-success/15 px-4 py-2 text-xs font-bold text-success disabled:opacity-40"
            >
              Approve selected
            </button>
            <button
              disabled={!selected.length}
              onClick={() => bulk("rejected", false)}
              className="rounded-xl bg-destructive/15 px-4 py-2 text-xs font-bold text-destructive disabled:opacity-40"
            >
              Decline selected
            </button>
          </div>
        </div>
      ) : null}

      {/* Cards */}
      {rows.length === 0 ? (
        <GlassCard className="p-10 text-center text-sm text-muted-foreground">
          Nothing here right now.
        </GlassCard>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {rows.map((t) => (
            <MoneyCard
              key={t.id}
              tx={t}
              kind={kind}
              name={userName(t.userId)}
              phone={userPhone(t.userId)}
              selectable={bucket === "Pending"}
              checked={selected.includes(t.id)}
              onToggle={() =>
                setSelected((s) => (s.includes(t.id) ? s.filter((x) => x !== t.id) : [...s, t.id]))
              }
              onApprove={() => onSetStatus(t.id, approveStatus, true)}
              onReject={() => onSetStatus(t.id, "rejected", false)}
              onViewProof={onViewProof}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MoneyCard({
  tx,
  kind,
  name,
  phone,
  selectable,
  checked,
  onToggle,
  onApprove,
  onReject,
  onViewProof,
}: {
  tx: Transaction;
  kind: "deposit" | "withdraw";
  name: string;
  phone: string;
  selectable: boolean;
  checked: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onViewProof: (url: string) => void;
}) {
  const parts = (tx.reference ?? "").split("·").map((p) => p.trim()).filter(Boolean);
  const accountName = kind === "withdraw" ? parts[0] : undefined;
  const accountNumber = kind === "withdraw" ? parts[1] : undefined;

  return (
    <GlassCard className={cn("relative overflow-hidden", checked && "ring-2 ring-primary/60")}>
      <div className="flex items-start gap-3">
        {selectable ? (
          <input
            type="checkbox"
            aria-label="Select row"
            checked={checked}
            onChange={onToggle}
            className="mt-1.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
          />
        ) : null}
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
          <User2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{phone || "—"}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-lg font-black tabular-nums">{money(tx.amount)}</p>
          <StatusBadge status={tx.status} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 font-bold">
          <Wallet className="h-3 w-3" /> {tx.method || "—"}
        </span>
        {kind === "deposit" && (tx.note ?? "").toLowerCase().includes("mpay") ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 font-black text-success">
            MPay
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-muted-foreground">
          <Hash className="h-3 w-3" /> {new Date(tx.createdAt).toLocaleString()}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {kind === "withdraw" ? (
          <>
            <CopyChip label="Account title" value={accountName || name} />
            <CopyChip label="Account number" value={accountNumber || tx.reference || "—"} />
          </>
        ) : (
          <CopyChip label="Reference" value={tx.reference || "—"} />
        )}
      </div>

      {tx.proofUrl ? (
        <button
          onClick={() => onViewProof(tx.proofUrl!)}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-2 text-left transition hover:border-primary/50"
        >
          <img
            src={tx.proofUrl}
            alt="Payment proof"
            loading="lazy"
            className="h-12 w-12 rounded-xl object-cover"
          />
          <span className="flex items-center gap-1 text-xs font-bold text-primary">
            <ImageIcon className="h-3.5 w-3.5" /> View payment proof
          </span>
        </button>
      ) : null}

      {isPending(tx.status) ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={onApprove}
            className="rounded-xl bg-success/15 py-2.5 text-xs font-black text-success transition hover:bg-success/25"
          >
            Approve
          </button>
          <button
            onClick={onReject}
            className="rounded-xl bg-destructive/15 py-2.5 text-xs font-black text-destructive transition hover:bg-destructive/25"
          >
            Decline
          </button>
        </div>
      ) : null}
    </GlassCard>
  );
}
