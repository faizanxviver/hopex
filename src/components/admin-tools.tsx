import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CheckCheck,
  Database,
  Download,
  Globe,
  Image as ImageIcon,
  Search,
  Send,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass";
import { money, newId, timestamp, useStore } from "@/lib/store";
import type { Transaction, TxStatus } from "@/lib/store";
import { uploadProofImage } from "@/lib/uploads.functions";
import { cn } from "@/lib/utils";

const field =
  "h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:border-primary/60";
const label = "mb-1.5 block text-xs font-semibold text-muted-foreground";

/* ---------------- 1. Command palette (Ctrl / Cmd + K) ---------------- */

export function AdminCommandPalette({ onJump }: { onJump: (tab: string) => void }) {
  const { db } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  const term = q.trim().toLowerCase();
  const users = term
    ? db.users
        .filter(
          (u) =>
            u.name.toLowerCase().includes(term) ||
            (u.phone ?? "").includes(term) ||
            u.email.toLowerCase().includes(term) ||
            u.referralCode.toLowerCase().includes(term),
        )
        .slice(0, 6)
    : [];
  const txs = term
    ? db.transactions
        .filter(
          (t) =>
            (t.reference ?? "").toLowerCase().includes(term) ||
            String(t.amount).includes(term) ||
            t.type.includes(term),
        )
        .slice(0, 5)
    : [];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl glass-soft px-3 py-2 text-xs font-semibold text-muted-foreground"
      >
        <Search className="h-3.5 w-3.5" /> Search
        <kbd className="rounded-md bg-foreground/10 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-background/70 p-4 pt-24 backdrop-blur-sm">
          <div className="animate-rise w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-popover shadow-[var(--shadow-elegant)]">
            <div className="flex items-center gap-3 border-b border-border/60 px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search users, phone, referral code, amount…"
                className="h-14 flex-1 bg-transparent text-sm outline-none"
              />
              <button onClick={() => setOpen(false)} aria-label="Close search">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {!term ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Type to search across every user and transaction.
                </p>
              ) : null}
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    onJump("Users");
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-accent/50"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-sm font-bold text-primary-foreground">
                    {u.name[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{u.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {u.phone ?? u.email} · {u.referralCode}
                    </span>
                  </span>
                  <span className="text-sm font-bold">{money(u.balance)}</span>
                </button>
              ))}
              {txs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onJump(t.type === "withdraw" ? "Withdrawals" : "Auto Deposit");
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-accent/50"
                >
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold capitalize">
                    {t.type} · {t.status}
                  </span>
                  <span className="text-sm font-bold">{money(t.amount)}</span>
                </button>
              ))}
              {term && users.length === 0 && txs.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No matches.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ---------------- 2. Bulk approve / decline bar ---------------- */

export function BulkActionBar({
  rows,
  selected,
  setSelected,
  onApply,
  kind,
}: {
  rows: Transaction[];
  selected: string[];
  setSelected: (ids: string[]) => void;
  onApply: (id: string, status: TxStatus, credit: boolean) => void;
  kind: "deposit" | "withdraw";
}) {
  const allIds = rows.map((r) => r.id);
  const every = allIds.length > 0 && selected.length === allIds.length;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl glass-soft px-3 py-2.5">
      <button
        onClick={() => setSelected(every ? [] : allIds)}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary"
      >
        {every ? "Clear selection" : `Select all (${allIds.length})`}
      </button>
      <span className="text-xs text-muted-foreground">{selected.length} selected</span>
      <div className="ml-auto flex gap-2">
        <button
          disabled={!selected.length}
          onClick={() => {
            selected.forEach((id) =>
              onApply(id, kind === "deposit" ? "approved" : "completed", true),
            );
            setSelected([]);
            toast.success("Bulk approved.");
          }}
          className="flex items-center gap-1.5 rounded-lg bg-success/15 px-3 py-1.5 text-xs font-bold text-success disabled:opacity-40"
        >
          <CheckCheck className="h-3.5 w-3.5" /> Approve selected
        </button>
        <button
          disabled={!selected.length}
          onClick={() => {
            selected.forEach((id) => onApply(id, "rejected", false));
            setSelected([]);
            toast.success("Bulk declined.");
          }}
          className="rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-bold text-destructive disabled:opacity-40"
        >
          Decline selected
        </button>
      </div>
    </div>
  );
}

/* ---------------- 3. SEO & brand settings ---------------- */

function ImageField({
  title,
  value,
  onChange,
  hint,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
}) {
  const [busy, setBusy] = useState(false);

  const pick = async (file: File) => {
    setBusy(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] ?? "");
        r.onerror = () => rej(new Error("Could not read file"));
        r.readAsDataURL(file);
      });
      const { url } = await uploadProofImage({ data: { base64, name: file.name, purpose: "branding" } });
      onChange(url);
      toast.success(`${title} updated.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className={label}>{title}</label>
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl glass-soft">
          {value ? (
            <img src={value} alt={title} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          <label className="btn-glass cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold">
            {busy ? "Uploading…" : value ? "Replace" : "Upload"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pick(f);
                e.target.value = "";
              }}
            />
          </label>
          {value ? (
            <button
              onClick={() => onChange("")}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-destructive"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export function SeoSettings() {
  const { db, update } = useStore();
  const s = db.settings;

  const set = <K extends keyof typeof s>(key: K, value: (typeof s)[K]) =>
    update((d) => {
      (d.settings[key] as (typeof s)[K]) = value;
      return d;
    });

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Search engine & social preview</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label className={label}>Meta description (shown in Google results)</label>
            <textarea
              defaultValue={s.seoDescription}
              onBlur={(e) => set("seoDescription", e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-input bg-background/40 p-4 text-sm outline-none"
            />
          </div>
          <div className="lg:col-span-2">
            <label className={label}>Keywords (comma separated)</label>
            <input
              defaultValue={s.seoKeywords}
              onBlur={(e) => set("seoKeywords", e.target.value)}
              className={field}
            />
          </div>
          <ImageField
            title="Favicon (browser tab icon)"
            value={s.siteFavicon}
            onChange={(v) => set("siteFavicon", v)}
            hint="Square PNG, 64×64 or larger. Replaces the tab icon everywhere."
          />
          <ImageField
            title="Social share image"
            value={s.ogImage}
            onChange={(v) => set("ogImage", v)}
            hint="1200×630 works best for WhatsApp, Facebook and X previews."
          />
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          Sitemap is served at <span className="font-semibold">/sitemap.xml</span> and crawler rules
          at <span className="font-semibold">/robots.txt</span>.
        </p>
      </GlassCard>

      <GlassCard>
        <p className="mb-4 text-sm font-bold">Support & withdrawal window</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className={label}>Support WhatsApp number</label>
            <input
              defaultValue={s.supportWhatsapp}
              placeholder="+92 300 0000000"
              onBlur={(e) => set("supportWhatsapp", e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label className={label}>Withdraw opens (PKT hour)</label>
            <input
              type="number"
              min={0}
              max={23}
              defaultValue={s.withdrawOpenHour}
              onBlur={(e) => set("withdrawOpenHour", Math.min(23, Math.max(0, Number(e.target.value) || 0)))}
              className={field}
            />
          </div>
          <div>
            <label className={label}>Withdraw closes (PKT hour)</label>
            <input
              type="number"
              min={1}
              max={24}
              defaultValue={s.withdrawCloseHour}
              onBlur={(e) => set("withdrawCloseHour", Math.min(24, Math.max(1, Number(e.target.value) || 24)))}
              className={field}
            />
          </div>
          <div className="grid place-items-center rounded-xl glass-soft text-xs font-semibold">
            {s.withdrawOpenHour}:00 — {s.withdrawCloseHour}:00 PKT
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

/* ---------------- 4. Tools tab: exports, manual ledger, health, cleanup ---------------- */

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminTools() {
  const { db, update, addNotification } = useStore();
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"credit" | "debit">("credit");
  const [note, setNote] = useState("");
  const [segment, setSegment] = useState<"all" | "active" | "idle">("all");
  const [msg, setMsg] = useState("");

  const users = db.users.filter((u) => u.role === "user");
  const investorIds = new Set(db.investments.map((i) => i.userId));
  const pending = db.transactions.filter(
    (t) => t.status === "pending" || t.status === "processing",
  );

  const segmentUsers = useMemo(
    () =>
      users.filter((u) =>
        segment === "all" ? true : segment === "active" ? investorIds.has(u.id) : !investorIds.has(u.id),
      ),
    [users, segment, investorIds],
  );

  const applyLedger = () => {
    const amt = Number(amount);
    const u = db.users.find((x) => x.id === target);
    if (!u || !amt || amt <= 0) return toast.error("Pick a user and a valid amount.");
    update((d) => {
      const row = d.users.find((x) => x.id === u.id);
      if (!row) return d;
      row.balance = mode === "credit" ? row.balance + amt : Math.max(0, row.balance - amt);
      d.transactions.unshift({
        id: newId(),
        userId: u.id,
        type: mode === "credit" ? "bonus" : "payout",
        amount: amt,
        method: "Manual adjustment",
        status: "approved",
        note: note || "Adjusted by admin",
        createdAt: timestamp(),
      });
      return d;
    });
    void addNotification(u.id, {
      title: mode === "credit" ? "Balance credited" : "Balance adjusted",
      body: `${money(amt)} was ${mode === "credit" ? "added to" : "deducted from"} your wallet.`,
      kind: mode === "credit" ? "success" : "warning",
    });
    setAmount("");
    setNote("");
    toast.success("Ledger entry applied.");
  };

  const broadcast = () => {
    if (!msg.trim()) return toast.error("Write a message first.");
    segmentUsers.forEach((u) =>
      void addNotification(u.id, { title: "HopeX update", body: msg.trim(), kind: "info" }),
    );
    setMsg("");
    toast.success(`Sent to ${segmentUsers.length} users.`);
  };

  const purge = () => {
    const cutoff = Date.now() - 30 * 864e5;
    update((d) => {
      d.transactions = d.transactions.filter(
        (t) => !(t.status === "rejected" && new Date(t.createdAt).getTime() < cutoff),
      );
      return d;
    });
    toast.success("Old declined records cleared.");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold">Data export</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                download(
                  "hopex-users.csv",
                  toCsv(
                    users.map((u) => ({
                      name: u.name,
                      phone: u.phone ?? "",
                      balance: u.balance,
                      invested: u.invested,
                      earnings: u.earnings,
                      referral: u.referralCode,
                      joined: u.createdAt,
                    })),
                  ),
                  "text/csv",
                )
              }
              className="btn-glass rounded-xl px-4 py-2.5 text-xs font-bold"
            >
              Users CSV
            </button>
            <button
              onClick={() =>
                download(
                  "hopex-transactions.csv",
                  toCsv(
                    db.transactions.map((t) => ({
                      user: db.users.find((u) => u.id === t.userId)?.name ?? "",
                      type: t.type,
                      amount: t.amount,
                      method: t.method ?? "",
                      status: t.status,
                      date: t.createdAt,
                    })),
                  ),
                  "text/csv",
                )
              }
              className="btn-glass rounded-xl px-4 py-2.5 text-xs font-bold"
            >
              Transactions CSV
            </button>
            <button
              onClick={() =>
                download(
                  `hopex-snapshot-${new Date().toISOString().slice(0, 10)}.json`,
                  JSON.stringify(
                    {
                      users: users.length,
                      transactions: db.transactions,
                      investments: db.investments,
                      plans: db.plans,
                    },
                    null,
                    2,
                  ),
                  "application/json",
                )
              }
              className="btn-glass rounded-xl px-4 py-2.5 text-xs font-bold"
            >
              JSON snapshot
            </button>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold">System health</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Pending queue", String(pending.length)],
              ["Active plans", String(db.investments.length)],
              ["Payment methods", String(db.methods.filter((m) => m.active).length)],
              ["Promo codes", String(db.promos.filter((p) => p.active).length)],
              ["Open chats", String(new Set(db.chats.map((c) => c.userId)).size)],
              ["Maintenance", db.settings.maintenanceMode ? "ON" : "Off"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl glass-soft px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p>
                <p className="font-display text-lg font-extrabold">{v}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="mb-4 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Manual ledger entry</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          <select value={target} onChange={(e) => setTarget(e.target.value)} className={field}>
            <option value="">Select user…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.phone ?? u.email}
              </option>
            ))}
          </select>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            placeholder="Amount"
            className={field}
          />
          <div className="flex gap-1 rounded-xl glass-soft p-1">
            {(["credit", "debit"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 rounded-lg text-xs font-bold capitalize transition",
                  mode === m ? "gradient-cool text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className={field}
          />
        </div>
        <button
          onClick={applyLedger}
          className="mt-3 rounded-xl gradient-brand px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Apply entry
        </button>
      </GlassCard>

      <GlassCard>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Segment broadcast</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl glass-soft p-1">
          {(
            [
              ["all", "Everyone"],
              ["active", "With active plan"],
              ["idle", "No plan yet"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setSegment(k)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                segment === k ? "gradient-cool text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {l}
            </button>
          ))}
          <span className="ml-auto self-center px-2 text-xs text-muted-foreground">
            {segmentUsers.length} recipients
          </span>
        </div>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={3}
          placeholder="Message to send…"
          className="mt-3 w-full rounded-xl border border-input bg-background/40 p-4 text-sm outline-none"
        />
        <button
          onClick={broadcast}
          className="mt-3 flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          <Send className="h-4 w-4" /> Send broadcast
        </button>
      </GlassCard>

      <GlassCard className="border-destructive/30">
        <div className="mb-3 flex items-center gap-2">
          <Database className="h-4 w-4 text-destructive" />
          <p className="text-sm font-bold text-destructive">Maintenance tools</p>
        </div>
        <button
          onClick={purge}
          className="flex items-center gap-2 rounded-xl bg-destructive/15 px-4 py-2.5 text-xs font-bold text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear declined records older than 30 days
        </button>
      </GlassCard>
    </div>
  );
}
