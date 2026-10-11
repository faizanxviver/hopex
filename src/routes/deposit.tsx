import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowDownLeft, Check, Clock, Copy, Loader2, Upload, Wallet } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { LedgerHeader, MoneyStat } from "@/components/money-stats";
import { uploadProofImage } from "@/lib/uploads.functions";
import {
  depositBalance,
  money,
  newId,
  pendingDeposits,
  timestamp,
  useStore,
} from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/deposit")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Deposit Funds — HopeX" },
      { name: "description", content: "Deposit manually with JazzCash, EasyPaisa or bank and submit your TID." },
      { property: "og:title", content: "Deposit Funds — HopeX" },
      { property: "og:description", content: "Manual deposits with transaction ID verification." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

function CopyRow({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl glass-soft px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <p className="truncate font-display text-base font-black">{value || "—"}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setDone(true);
          toast.success(`${label} copied`);
          setTimeout(() => setDone(false), 1500);
        }}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary"
        aria-label={`Copy ${label}`}
      >
        {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

function Deposit() {
  const { db, user, update, addNotification } = useStore();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState("");
  const [tid, setTid] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const methods = db.methods.filter((m) => m.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const method = methods.find((m) => m.id === methodId);
  const quick = db.settings.quickAmounts.length
    ? db.settings.quickAmounts
    : [1000, 3000, 5000, 10000, 25000, 50000];

  const onFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
        r.onerror = () => reject(new Error("Could not read the file"));
        r.readAsDataURL(file);
      });
      const res = await uploadProofImage({ data: { base64, name: file.name, purpose: "proof" } });
      setProofUrl(res.url);
      toast.success("Screenshot uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < db.settings.minDeposit)
      return toast.error(`Minimum deposit is ${money(db.settings.minDeposit)}.`);
    if (!method) return toast.error("Select a payment method.");
    const cleanTid = tid.trim();
    if (cleanTid.length < 4) return toast.error("Enter a valid Transaction ID (TID).");
    if (db.transactions.some((t) => t.type === "deposit" && (t.note ?? "") === `TID: ${cleanTid}`))
      return toast.error("This TID has already been submitted.");

    setBusy(true);
    update((d) => {
      d.transactions.unshift({
        id: newId(),
        userId: user.id,
        type: "deposit",
        amount: value,
        method: method.name,
        reference: `${method.accountName} · ${method.accountNumber} · TID ${cleanTid}`,
        note: `TID: ${cleanTid}`,
        proofUrl: proofUrl || undefined,
        status: "processing",
        createdAt: timestamp(),
      });
      return d;
    });
    addNotification(user.id, {
      title: "Deposit submitted",
      body: `${money(value)} via ${method.name} is under review.`,
      kind: "info",
    });
    toast.success("Deposit submitted — awaiting admin approval.");
    setBusy(false);
    navigate({ to: "/deposit-history", search: { ref: undefined } });
  };

  return (
    <div className="space-y-4 pb-24">
      <LedgerHeader
        title="Deposit funds"
        subtitle={`Send payment to the account below, then submit your TID. Minimum ${money(db.settings.minDeposit)}.`}
        icon={<ArrowDownLeft className="h-5 w-5" />}
      />

      <div className="grid grid-cols-2 gap-3">
        <MoneyStat label="Deposit balance" value={money(depositBalance(db, user.id))} tone="success" icon={<Wallet className="h-4 w-4" />} hint="Approved top-ups" />
        <MoneyStat label="Awaiting approval" value={money(pendingDeposits(db, user.id))} tone="primary" icon={<Clock className="h-4 w-4" />} hint="In review" />
      </div>

      <form onSubmit={submit} className="relative space-y-5 overflow-hidden rounded-[2rem] glass p-5">
        <Step n={1} title="Amount">
          <div className="grid grid-cols-3 gap-2.5">
            {quick.map((q) => (
              <button
                type="button"
                key={q}
                onClick={() => setAmount(String(q))}
                className={cn(
                  "rounded-2xl py-3.5 text-sm font-black transition-all",
                  Number(amount) === q ? "gradient-brand text-primary-foreground shadow-lg shadow-primary/25" : "glass-soft",
                )}
              >
                Rs {q.toLocaleString("en-PK")}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Custom amount (Rs)"
            className="mt-3 h-12 w-full rounded-2xl bg-background/40 px-4 font-black outline-none ring-1 ring-border/50 focus:ring-2 focus:ring-primary/50"
          />
        </Step>

        <Step n={2} title="Payment method">
          {methods.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment methods available right now. Please contact support.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {methods.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMethodId(m.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl p-3 text-left text-sm font-black transition-all",
                    methodId === m.id ? "ring-2 ring-primary bg-primary/10" : "glass-soft",
                  )}
                >
                  {m.imageUrl ? (
                    <img src={m.imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <span className="grid h-8 w-8 place-items-center rounded-lg gradient-brand text-xs text-primary-foreground">
                      {m.name.slice(0, 1)}
                    </span>
                  )}
                  <span className="truncate">{m.name}</span>
                </button>
              ))}
            </div>
          )}
        </Step>

        {method ? (
          <>
            <Step n={3} title={`Send ${amount ? money(Number(amount)) : "payment"} to`}>
              <div className="space-y-2.5">
                <CopyRow label="Account title" value={method.accountName} />
                <CopyRow label="Account number" value={method.accountNumber} />
                {method.instructions ? (
                  <p className="whitespace-pre-line rounded-2xl bg-muted/50 p-3 text-xs text-muted-foreground">{method.instructions}</p>
                ) : null}
              </div>
            </Step>

            <Step n={4} title="Transaction ID (TID)">
              <input
                value={tid}
                onChange={(e) => setTid(e.target.value)}
                placeholder="e.g. 0123456789"
                className="h-12 w-full rounded-2xl bg-background/40 px-4 font-black tracking-wider outline-none ring-1 ring-border/50 focus:ring-2 focus:ring-primary/50"
              />
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-3 text-xs font-bold text-muted-foreground">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : proofUrl ? <Check className="h-4 w-4 text-success" /> : <Upload className="h-4 w-4" />}
                {proofUrl ? "Screenshot attached" : "Attach screenshot (optional)"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            </Step>

            <button
              disabled={busy || uploading}
              className="btn-glass btn-glass-primary flex h-14 w-full items-center justify-center gap-2 text-base font-black disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Submit deposit
            </button>
          </>
        ) : null}
      </form>

      <Link
        to="/deposit-history"
        search={{ ref: undefined }}
        className="flex h-11 items-center justify-center rounded-2xl glass text-sm font-black"
      >
        Deposit history
      </Link>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary/12 text-primary">{n}</span>
        {title}
      </p>
      {children}
    </div>
  );
}
