import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  CreditCard,
  ArrowUpFromLine,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Settings,
  Ticket,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { toast } from "sonner";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle, StatCard, StatusBadge } from "@/components/glass";
import { money, newId, timestamp, useStore } from "@/lib/store";
import { uploadProofImage } from "@/lib/uploads.functions";
import type { TxStatus } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — HopeX" },
      {
        name: "description",
        content: "Manage users, deposits, withdrawals, plans, promo codes, chat and broadcasts.",
      },
      { property: "og:title", content: "Admin Panel — HopeX" },
      { property: "og:description", content: "Full platform administration console." },
    ],
  }),
  component: () => (
    <AuthGuard admin>
      <DashboardLayout>
        <Admin />
      </DashboardLayout>
    </AuthGuard>
  ),
});

const tabs = [
  "Overview",
  "Users",
  "Deposits",
  "Withdrawals",
  "Methods",
  "Plans",
  "Promo Codes",
  "Support Chat",
  "Broadcast",
  "Settings",
] as const;

const tabIcons: Record<(typeof tabs)[number], LucideIcon> = {
  Overview: LayoutDashboard,
  Users: Users,
  Deposits: ArrowDownToLine,
  Withdrawals: ArrowUpFromLine,
  Methods: CreditCard,
  Plans: TrendingUp,
  "Promo Codes": Ticket,
  "Support Chat": MessageSquare,
  Broadcast: Megaphone,
  Settings: Settings,
};

function Admin() {
  const { db, update, addNotification } = useStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [proof, setProof] = useState<string | null>(null);
  const [bucket, setBucket] = useState<"Pending" | "Approved" | "Rejected">("Pending");

  const users = db.users.filter((u) => u.role === "user");
  const deposits = db.transactions.filter((t) => t.type === "deposit");
  const withdrawals = db.transactions.filter((t) => t.type === "withdraw");
  const totalDeposits = deposits
    .filter((t) => t.status === "approved")
    .reduce((a, t) => a + t.amount, 0);
  const totalWithdrawals = withdrawals
    .filter((t) => t.status === "completed")
    .reduce((a, t) => a + t.amount, 0);

  const setStatus = (id: string, status: TxStatus, credit: boolean) => {
    update((d) => {
      const t = d.transactions.find((x) => x.id === id);
      if (!t) return d;
      t.status = status;
      const owner = d.users.find((u) => u.id === t.userId);
      if (owner && credit && t.type === "deposit" && status === "approved")
        owner.balance += t.amount;
      if (owner && t.type === "withdraw" && status === "rejected") owner.balance += t.amount;
      d.notifications.unshift({
        id: newId(),
        userId: t.userId,
        title: `${t.type === "deposit" ? "Deposit" : "Withdrawal"} ${status}`,
        body: `${money(t.amount)} via ${t.method} was ${status}.`,
        kind: status === "rejected" ? "warning" : "success",
        read: false,
        createdAt: timestamp(),
      });
      return d;
    });
    toast.success(`Marked as ${status}.`);
  };

  const isPending = (s: TxStatus) => s === "pending" || s === "processing";
  const isDone = (s: TxStatus) => s === "approved" || s === "completed";
  const pendingDeps = deposits.filter((t) => isPending(t.status)).length;
  const pendingWds = withdrawals.filter((t) => isPending(t.status)).length;
  const rows = (tab === "Deposits" ? deposits : withdrawals).filter((t) =>
    bucket === "Pending"
      ? isPending(t.status)
      : bucket === "Approved"
        ? isDone(t.status)
        : t.status === "rejected",
  );
  const counts: Partial<Record<(typeof tabs)[number], number>> = {
    Users: users.length,
    Deposits: pendingDeps,
    Withdrawals: pendingWds,
    "Support Chat": db.chats.filter((c) => c.from === "user").length,
  };

  return (
    <div>
      <SectionTitle
        title="Admin panel"
        subtitle="Full control over users, money flow and platform configuration."
      />

      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="glass rounded-3xl p-3">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              HopeX Console
            </p>
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {tabs.map((t) => {
                const Icon = tabIcons[t];
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition lg:w-full",
                      tab === t
                        ? "gradient-cool text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t}</span>
                    {counts[t] ? (
                      <span
                        className={cn(
                          "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold",
                          tab === t ? "bg-background/25" : "bg-primary/15 text-primary",
                        )}
                      >
                        {counts[t]}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div>
          {tab === "Overview" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard label="Total users" value={String(users.length)} />
              <StatCard label="Total deposits" value={money(totalDeposits)} accent="success" />
              <StatCard label="Total withdrawals" value={money(totalWithdrawals)} accent="gold" />
              <StatCard label="Active investments" value={String(db.investments.length)} />
              <StatCard
                label="Capital invested"
                value={money(db.investments.reduce((a, i) => a + i.amount, 0))}
              />
              <StatCard
                label="Platform profit"
                value={money(Math.max(0, totalDeposits - totalWithdrawals))}
                accent="success"
              />
            </div>
          ) : null}

          {tab === "Users" ? (
            <GlassCard className="overflow-x-auto p-0">
              <table className="w-full min-w-[46rem] text-sm">
                <thead className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Balance</th>
                    <th className="p-4">Invested</th>
                    <th className="p-4">Referred by</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="p-4">
                        <p className="font-semibold">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="p-4 font-semibold">{money(u.balance)}</td>
                      <td className="p-4">{money(u.invested)}</td>
                      <td className="p-4 text-muted-foreground">{u.referredBy ?? "—"}</td>
                      <td className="p-4">
                        <StatusBadge status={u.blocked ? "rejected" : "approved"} />
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              update((d) => {
                                const t = d.users.find((x) => x.id === u.id)!;
                                t.blocked = !t.blocked;
                                return d;
                              })
                            }
                            className="rounded-lg glass-soft px-3 py-1 text-xs font-semibold"
                          >
                            {u.blocked ? "Unblock" : "Block"}
                          </button>
                          <button
                            onClick={() => {
                              const v = prompt(`New balance for ${u.name}`, String(u.balance));
                              if (v == null || isNaN(Number(v))) return;
                              update((d) => {
                                const t = d.users.find((x) => x.id === u.id)!;
                                t.balance = Number(v);
                                return d;
                              });
                              toast.success("Balance updated.");
                            }}
                            className="rounded-lg glass-soft px-3 py-1 text-xs font-semibold"
                          >
                            Edit balance
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          ) : null}

          {tab === "Deposits" || tab === "Withdrawals" ? (
            <>
              <div className="mb-4 inline-flex gap-1 rounded-2xl glass-soft p-1">
                {(["Pending", "Approved", "Rejected"] as const).map((b) => {
                  const count = (tab === "Deposits" ? deposits : withdrawals).filter((t) =>
                    b === "Pending"
                      ? isPending(t.status)
                      : b === "Approved"
                        ? isDone(t.status)
                        : t.status === "rejected",
                  ).length;
                  return (
                    <button
                      key={b}
                      onClick={() => setBucket(b)}
                      className={cn(
                        "rounded-xl px-4 py-2 text-sm font-semibold transition",
                        bucket === b
                          ? b === "Pending"
                            ? "bg-destructive text-destructive-foreground"
                            : "gradient-cool text-primary-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {b === "Pending" ? "Pending" : b === "Approved" ? "Successful" : "Declined"} (
                      {count})
                    </button>
                  );
                })}
              </div>
              <GlassCard className="overflow-x-auto p-0">
                <table className="w-full min-w-[46rem] text-sm">
                  <thead className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Method</th>
                      <th className="p-4">Reference</th>
                      <th className="p-4">Proof</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {rows.map((t) => (
                      <tr key={t.id}>
                        <td className="p-4">
                          {db.users.find((u) => u.id === t.userId)?.name ?? "—"}
                        </td>
                        <td className="p-4">{t.method}</td>
                        <td className="p-4 text-muted-foreground">{t.reference ?? "—"}</td>
                        <td className="p-4">
                          {t.proofUrl ? (
                            <button
                              onClick={() => setProof(t.proofUrl!)}
                              className="group inline-flex items-center gap-2"
                            >
                              <img
                                src={t.proofUrl}
                                alt="Payment proof"
                                loading="lazy"
                                className="h-10 w-10 rounded-lg border border-border/60 object-cover transition group-hover:scale-105"
                              />
                              <span className="text-xs font-semibold text-primary">View</span>
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4 font-semibold">{money(t.amount)}</td>
                        <td className="p-4">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="p-4">
                          {isPending(t.status) ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() =>
                                  setStatus(
                                    t.id,
                                    tab === "Deposits" ? "approved" : "completed",
                                    true,
                                  )
                                }
                                className="rounded-lg bg-success/15 px-3 py-1 text-xs font-semibold text-success"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setStatus(t.id, "rejected", false)}
                                className="rounded-lg bg-destructive/15 px-3 py-1 text-xs font-semibold text-destructive"
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">Nothing in this section.</p>
                ) : null}
              </GlassCard>
            </>
          ) : null}

          {tab === "Methods" ? <MethodsManager /> : null}

          {tab === "Plans" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {db.plans.map((p) => (
                <GlassCard key={p.id}>
                  <h3 className="font-display text-lg font-extrabold">{p.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {money(p.min)} – {money(p.max)} · {p.durationDays} days
                  </p>
                  <input
                    type="number"
                    step="0.1"
                    defaultValue={p.dailyRoi}
                    onBlur={(e) =>
                      update((d) => {
                        const t = d.plans.find((x) => x.id === p.id)!;
                        t.dailyRoi = Number(e.target.value);
                        return d;
                      })
                    }
                    className="mt-4 h-11 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Daily ROI %</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() =>
                        update((d) => {
                          const t = d.plans.find((x) => x.id === p.id)!;
                          t.active = !t.active;
                          return d;
                        })
                      }
                      className="flex-1 rounded-lg glass-soft py-2 text-xs font-semibold"
                    >
                      {p.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() =>
                        update((d) => {
                          d.plans = d.plans.filter((x) => x.id !== p.id);
                          return d;
                        })
                      }
                      className="flex-1 rounded-lg bg-destructive/15 py-2 text-xs font-semibold text-destructive"
                    >
                      Delete
                    </button>
                  </div>
                </GlassCard>
              ))}
              <GlassCard className="grid place-items-center border-dashed">
                <button
                  onClick={() => {
                    const name = prompt("Plan name");
                    if (!name) return;
                    update((d) => {
                      d.plans.push({
                        id: newId(),
                        name,
                        min: 100,
                        max: 10000,
                        dailyRoi: 1.5,
                        durationDays: 30,
                        features: ["Daily payouts"],
                        active: true,
                      });
                      return d;
                    });
                    toast.success("Plan created.");
                  }}
                  className="rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  + Add plan
                </button>
              </GlassCard>
            </div>
          ) : null}

          {tab === "Promo Codes" ? (
            <div className="space-y-4">
              <button
                onClick={() => {
                  const code = prompt("Promo code")?.toUpperCase();
                  if (!code) return;
                  update((d) => {
                    d.promos.push({
                      id: newId(),
                      code,
                      type: "percent",
                      value: 5,
                      usageLimit: 100,
                      used: 0,
                      expiresAt: "2026-12-31",
                      active: true,
                    });
                    return d;
                  });
                  toast.success("Promo code created.");
                }}
                className="rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                + New promo code
              </button>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {db.promos.map((p) => (
                  <GlassCard key={p.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-display text-lg font-extrabold text-gold">{p.code}</p>
                      <StatusBadge status={p.active ? "approved" : "rejected"} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {p.type === "percent" ? `${p.value}% bonus` : `${money(p.value)} bonus`} ·
                      expires {p.expiresAt}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Used {p.used}/{p.usageLimit}
                    </p>
                    <button
                      onClick={() =>
                        update((d) => {
                          const t = d.promos.find((x) => x.id === p.id)!;
                          t.active = !t.active;
                          return d;
                        })
                      }
                      className="mt-4 w-full rounded-lg glass-soft py-2 text-xs font-semibold"
                    >
                      {p.active ? "Disable" : "Enable"}
                    </button>
                  </GlassCard>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "Support Chat" ? <AdminChat /> : null}

          {tab === "Broadcast" ? (
            <GlassCard className="max-w-xl">
              <h2 className="text-lg font-bold">Broadcast a notification</h2>
              <BroadcastForm
                onSend={(title, body, target) => {
                  const targets = target === "all" ? users : users.filter((u) => u.id === target);
                  targets.forEach((u) =>
                    addNotification(u.id, { title, body, kind: "info", popup: true }),
                  );
                  toast.success(`Sent to ${targets.length} user(s).`);
                }}
                users={users.map((u) => ({ id: u.id, name: u.name }))}
              />
            </GlassCard>
          ) : null}

          {tab === "Settings" ? (
            <GlassCard className="max-w-xl space-y-4">
              <h2 className="text-lg font-bold">Platform settings</h2>
              {(
                [
                  ["siteName", "Site name"],
                  ["minDeposit", "Minimum deposit"],
                  ["minWithdraw", "Minimum withdrawal"],
                ] as const
              ).map(([k, label]) => (
                <div key={k}>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    {label}
                  </label>
                  <input
                    defaultValue={String(db.settings[k])}
                    onBlur={(e) =>
                      update((d) => {
                        const value = k === "siteName" ? e.target.value : Number(e.target.value);
                        (d.settings as unknown as Record<string, unknown>)[k] = value;
                        return d;
                      })
                    }
                    className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Quick deposit amounts (comma separated)
                </label>
                <input
                  defaultValue={db.settings.quickAmounts.join(", ")}
                  onBlur={(e) =>
                    update((d) => {
                      d.settings.quickAmounts = e.target.value
                        .split(",")
                        .map((x) => Number(x.trim()))
                        .filter((n) => n > 0);
                      return d;
                    })
                  }
                  className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Referral commission levels (%)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {db.settings.levels.map((lv, i) => (
                    <input
                      key={i}
                      defaultValue={lv}
                      type="number"
                      onBlur={(e) =>
                        update((d) => {
                          d.settings.levels[i] = Number(e.target.value);
                          return d;
                        })
                      }
                      className="h-12 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
                    />
                  ))}
                </div>
              </div>
            </GlassCard>
          ) : null}
        </div>
      </div>

      {proof ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
          onClick={() => setProof(null)}
        >
          <div
            className="glass max-h-full w-full max-w-lg overflow-auto rounded-3xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Payment proof</p>
              <div className="flex items-center gap-2">
                <a
                  href={proof}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-primary/15 px-3 py-1 text-xs font-semibold text-primary"
                >
                  Open
                </a>
                <button
                  onClick={() => setProof(null)}
                  className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
            <img src={proof} alt="Payment proof" className="w-full rounded-2xl" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BroadcastForm({
  onSend,
  users,
}: {
  onSend: (title: string, body: string, target: string) => void;
  users: { id: string; name: string }[];
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all");
  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) return toast.error("Title and message are required.");
        onSend(title.trim(), body.trim(), target);
        setTitle("");
        setBody("");
      }}
    >
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
      >
        <option value="all">All users</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message"
        rows={4}
        className="w-full rounded-xl border border-input bg-background/40 p-4 text-sm outline-none"
      />
      <button className="h-12 w-full rounded-xl gradient-brand font-semibold text-primary-foreground">
        Send notification
      </button>
    </form>
  );
}




/* ---------------- Payment methods manager ---------------- */
function MethodsManager() {
  const { db, update } = useStore();
  const [busy, setBusy] = useState<string | null>(null);

  const patch = (id: string, key: string, value: unknown) =>
    update((d) => {
      const m = d.methods.find((x) => x.id === id);
      if (m) (m as unknown as Record<string, unknown>)[key] = value;
      return d;
    });

  const pickLogo = async (id: string, file: File) => {
    setBusy(id);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] ?? "");
        r.onerror = () => rej(new Error("Could not read file"));
        r.readAsDataURL(file);
      });
      const { url } = await uploadProofImage({ data: { base64, name: file.name } });
      patch(id, "imageUrl", url);
      toast.success("Logo updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => {
          const name = prompt("Method name (e.g. Easypaisa)");
          if (!name) return;
          update((d) => {
            d.methods.push({
              id: newId(),
              name,
              kind: "wallet",
              accountName: "HopeX Payments",
              accountNumber: "0000000000",
              instructions: `Send the exact amount to the ${name} account above, then upload your screenshot.`,
              active: true,
              sortOrder: d.methods.length,
            });
            return d;
          });
          toast.success("Payment method added.");
        }}
        className="btn-glass btn-glass-primary inline-flex h-11 items-center px-5 text-sm font-bold"
      >
        + Add payment method
      </button>

      <div className="grid gap-4 lg:grid-cols-2">
        {db.methods.map((m) => (
          <GlassCard key={m.id} className="space-y-3">
            <div className="flex items-center gap-3">
              {m.imageUrl ? (
                <img src={m.imageUrl} alt={m.name} className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-xl gradient-cool text-sm font-black text-primary-foreground">
                  {m.name[0]}
                </span>
              )}
              <input
                defaultValue={m.name}
                onBlur={(e) => patch(m.id, "name", e.target.value)}
                className="h-11 flex-1 rounded-xl border border-input bg-background/40 px-3 text-sm font-semibold outline-none"
              />
              <StatusBadge status={m.active ? "approved" : "rejected"} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                defaultValue={m.accountName}
                onBlur={(e) => patch(m.id, "accountName", e.target.value)}
                placeholder="Account title"
                className="h-11 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
              />
              <input
                defaultValue={m.accountNumber}
                onBlur={(e) => patch(m.id, "accountNumber", e.target.value)}
                placeholder="Account number"
                className="h-11 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
              />
            </div>

            <textarea
              defaultValue={m.instructions}
              onBlur={(e) => patch(m.id, "instructions", e.target.value)}
              rows={2}
              placeholder="Instructions shown in the payment gateway"
              className="w-full rounded-xl border border-input bg-background/40 p-3 text-sm outline-none"
            />

            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-lg glass-soft px-3 py-2 text-xs font-semibold">
                {busy === m.id ? "Uploading…" : "Upload logo"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void pickLogo(m.id, f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                onClick={() => patch(m.id, "active", !m.active)}
                className="rounded-lg glass-soft px-3 py-2 text-xs font-semibold"
              >
                {m.active ? "Disable" : "Enable"}
              </button>
              <button
                onClick={() =>
                  update((d) => {
                    d.methods = d.methods.filter((x) => x.id !== m.id);
                    return d;
                  })
                }
                className="rounded-lg bg-destructive/15 px-3 py-2 text-xs font-semibold text-destructive"
              >
                Delete
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
