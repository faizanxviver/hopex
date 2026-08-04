import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, StatCard } from "@/components/glass";
import {
  addApiKey,
  listApiKeys,
  testApiKey,
  updateApiKey,
  type ApiKeyRow,
} from "@/lib/api-keys.functions";
import { cn } from "@/lib/utils";

const PURPOSES = [
  { id: "all", label: "All uploads" },
  { id: "proof", label: "Deposit proofs" },
  { id: "chat", label: "Chat media" },
  { id: "reward", label: "Reward task proofs" },
  { id: "branding", label: "Branding / logos" },
] as const;

const prettyBytes = (n: number) => {
  if (!n) return "0 MB";
  const mb = n / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
};

export function ApiKeysAdmin() {
  const [rows, setRows] = useState<ApiKeyRow[]>([]);
  const [fallback, setFallback] = useState<{ masked: string; key?: string } | null>(null);
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newPurpose, setNewPurpose] = useState<string>("all");

  const load = useCallback(
    async (show: boolean) => {
      setLoading(true);
      try {
        const res = await listApiKeys({ data: { reveal: show } });
        setRows(res.keys);
        setFallback(res.fallback);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load API keys");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const toggleReveal = async () => {
    const next = !reveal;
    setReveal(next);
    await load(next);
  };

  const copy = (value: string) => {
    void navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  };

  const add = async () => {
    if (!newKey.trim()) return toast.error("Paste an imgbb API key first");
    setBusy("add");
    try {
      await addApiKey({ data: { key: newKey, label: newLabel, purpose: newPurpose } });
      setNewKey("");
      setNewLabel("");
      setNewPurpose("all");
      toast.success("Key verified and added");
      await load(reveal);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add key");
    } finally {
      setBusy(null);
    }
  };

  const patch = async (id: string, data: Parameters<typeof updateApiKey>[0]["data"]) => {
    setBusy(id);
    try {
      await updateApiKey({ data });
      await load(reveal);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const test = async (id: string) => {
    setBusy(id);
    try {
      const res = await testApiKey({ data: { id } });
      if (res.ok) toast.success("Key is healthy ✅");
      else toast.error(res.error ?? "Key rejected");
      await load(reveal);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setBusy(null);
    }
  };

  const active = rows.filter((r) => r.active);
  const uploads = rows.reduce((a, r) => a + r.uploads, 0);
  const failures = rows.reduce((a, r) => a + r.failures, 0);
  const bytes = rows.reduce((a, r) => a + r.bytes, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active keys" value={`${active.length}/${rows.length}`} icon={<KeyRound className="h-4 w-4" />} />
        <StatCard label="Uploads served" value={String(uploads)} icon={<Zap className="h-4 w-4" />} accent="success" />
        <StatCard label="Storage used" value={prettyBytes(bytes)} icon={<HardDrive className="h-4 w-4" />} accent="gold" />
        <StatCard label="Failures" value={String(failures)} icon={<Activity className="h-4 w-4" />} />
      </div>

      <GlassCard>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold">Image hosting API keys (imgbb)</h3>
            <p className="text-sm text-muted-foreground">
              Uploads rotate across active keys — add more keys for more storage and higher limits.
            </p>
          </div>
          <button
            onClick={() => void toggleReveal()}
            className="glass-soft flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
          >
            {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {reveal ? "Hide keys" : "Reveal keys"}
          </button>
          <button
            onClick={() => void load(reveal)}
            className="glass-soft flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </button>
        </div>

        {fallback ? (
          <div className="mb-4 rounded-2xl border border-primary/25 bg-primary/8 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Currently running (built-in secret)
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-background/60 px-2.5 py-1 font-mono text-sm">
                {reveal ? (fallback.key ?? fallback.masked) : fallback.masked}
              </code>
              {reveal && fallback.key ? (
                <button onClick={() => copy(fallback.key!)} aria-label="Copy key">
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </button>
              ) : null}
              <span className="text-xs text-muted-foreground">
                Used automatically only when no active key below can handle the upload.
              </span>
            </div>
          </div>
        ) : null}

        {/* Add key */}
        <div className="mb-5 grid gap-2 rounded-2xl border border-border/60 p-4 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Paste imgbb API key"
            className="h-11 rounded-xl border border-border bg-background/60 px-3 font-mono text-sm outline-none focus:border-primary"
          />
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Backup #2)"
            className="h-11 rounded-xl border border-border bg-background/60 px-3 text-sm outline-none focus:border-primary"
          />
          <select
            value={newPurpose}
            onChange={(e) => setNewPurpose(e.target.value)}
            className="h-11 rounded-xl border border-border bg-background/60 px-3 text-sm outline-none focus:border-primary"
          >
            {PURPOSES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => void add()}
            disabled={busy === "add"}
            className="btn-glass flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold gradient-cool text-primary-foreground disabled:opacity-60"
          >
            {busy === "add" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add key
          </button>
        </div>

        {/* Keys */}
        {loading && !rows.length ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Loading keys…</p>
        ) : !rows.length ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No custom keys yet — the built-in key is handling all uploads.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "rounded-2xl border p-4 transition",
                  r.active ? "border-success/30 bg-success/5" : "border-border/60 opacity-70",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    defaultValue={r.label}
                    onBlur={(e) =>
                      e.target.value !== r.label && void patch(r.id, { id: r.id, label: e.target.value })
                    }
                    className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-0.5 text-sm font-bold outline-none focus:bg-background/60"
                  />
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                      r.active
                        ? "border-success/30 bg-success/15 text-success"
                        : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {r.active ? "Active" : "Paused"}
                  </span>
                  <select
                    value={r.purpose}
                    onChange={(e) => void patch(r.id, { id: r.id, purpose: e.target.value })}
                    className="rounded-lg border border-border bg-background/60 px-2 py-1 text-xs font-semibold outline-none"
                  >
                    {PURPOSES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="rounded-lg bg-background/60 px-2.5 py-1 font-mono text-xs">
                    {reveal ? (r.key ?? r.masked) : r.masked}
                  </code>
                  {reveal && r.key ? (
                    <button onClick={() => copy(r.key!)} aria-label="Copy key">
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ) : null}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                  <span>
                    <b className="text-foreground">{r.uploads}</b> uploads
                  </span>
                  <span>
                    <b className="text-foreground">{prettyBytes(r.bytes)}</b> stored
                  </span>
                  <span>
                    <b className="text-foreground">{r.failures}</b> failures
                  </span>
                  <span>
                    {r.last_used_at
                      ? `Last used ${new Date(r.last_used_at).toLocaleString()}`
                      : "Never used"}
                  </span>
                </div>

                {r.last_error ? (
                  <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
                    <XCircle className="h-3.5 w-3.5" /> {r.last_error}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => void test(r.id)}
                    disabled={busy === r.id}
                    className="glass-soft flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold"
                  >
                    {busy === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Test
                  </button>
                  <button
                    onClick={() => void patch(r.id, { id: r.id, active: !r.active })}
                    className="glass-soft rounded-xl px-3 py-1.5 text-xs font-bold"
                  >
                    {r.active ? "Pause" : "Activate"}
                  </button>
                  <button
                    onClick={() => void patch(r.id, { id: r.id, resetStats: true })}
                    className="glass-soft rounded-xl px-3 py-1.5 text-xs font-bold"
                  >
                    Reset stats
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete key “${r.label}”?`)) void patch(r.id, { id: r.id, remove: true });
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-destructive/12 px-3 py-1.5 text-xs font-bold text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
