import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowDownToLine,
  Clock,
  ShieldCheck,
  CreditCard,
  ArrowUpFromLine,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Settings,
  Ticket,
  TrendingUp,
  Users,
  ScrollText,
  Crown,
  Wrench,
  Globe,
  type LucideIcon,
} from "lucide-react";

import { toast } from "sonner";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { AdminChat } from "@/components/admin-chat";
import { AdminCommandPalette, AdminTools, BulkActionBar, SeoSettings } from "@/components/admin-tools";
import { GlassCard, StatCard, StatusBadge } from "@/components/glass";
import { money, newId, timestamp, useStore, fetchAuditLog, logAudit } from "@/lib/store";
import type { AuditEntry, SalaryTier } from "@/lib/store";
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
  "Audit Log",
  "Tools",
  "SEO",
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
  "Audit Log": ScrollText,
  Tools: Wrench,
  SEO: Globe,
  Settings: Settings,
};

function Admin() {
  const { db, update, addNotification, user: admin } = useStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [proof, setProof] = useState<string | null>(null);
  const [bucket, setBucket] = useState<"Pending" | "Approved" | "Rejected">("Pending");
  const [selected, setSelected] = useState<string[]>([]);

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
    const t = db.transactions.find((x) => x.id === id);
    if (t) {
      const owner = db.users.find((u) => u.id === t.userId);
      void logAudit({
        adminId: admin?.id ?? "",
        adminName: admin?.name ?? "Admin",
        action: `${t.type} ${status}`,
        targetId: t.userId,
        targetName: owner?.name ?? "",
        detail: `${money(t.amount)} via ${t.method ?? "-"}`,
      });
    }
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

  const groups: { label: string; items: (typeof tabs)[number][] }[] = [
    { label: "Operations", items: ["Overview", "Users", "Support Chat"] },
    { label: "Money flow", items: ["Deposits", "Withdrawals", "Methods"] },
    { label: "Growth", items: ["Plans", "Promo Codes", "Broadcast"] },
    { label: "System", items: ["Tools", "SEO", "Audit Log", "Settings"] },
  ];
  const recent = db.transactions.slice(0, 6);

  return (
    <div>
      {/* Console header */}
      <div className="glass relative mb-5 overflow-hidden rounded-3xl p-5 sm:p-6">
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl gradient-brand text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">HopeX Console</h1>
            <p className="text-sm text-muted-foreground">
              Live control over users, money flow, plans and support.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTab("Deposits")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold",
                pendingDeps ? "bg-destructive/15 text-destructive" : "glass-soft",
              )}
            >
              <Clock className="h-3.5 w-3.5" /> {pendingDeps} deposits waiting
            </button>
            <button
              onClick={() => setTab("Withdrawals")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold",
                pendingWds ? "bg-destructive/15 text-destructive" : "glass-soft",
              )}
            >
              <Clock className="h-3.5 w-3.5" /> {pendingWds} withdrawals waiting
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="glass rounded-3xl p-3">
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-3 lg:overflow-visible lg:pb-0">
              {groups.map((g) => (
                <div key={g.label} className="flex gap-2 lg:block">
                  <p className="hidden px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground lg:block">
                    {g.label}
                  </p>
                  {g.items.map((t) => {
                    const Icon = tabIcons[t];
                    return (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={cn(
                          "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition lg:w-full",
                          tab === t
                            ? "gradient-cool text-primary-foreground shadow-[var(--shadow-elegant)]"
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
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <div>
          {tab === "Overview" ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard label="Total users" value={String(users.length)} icon={<Users className="h-5 w-5" />} />
                <StatCard
                  label="Total deposits"
                  value={money(totalDeposits)}
                  accent="success"
                  icon={<ArrowDownToLine className="h-5 w-5" />}
                />
                <StatCard
                  label="Total withdrawals"
                  value={money(totalWithdrawals)}
                  accent="gold"
                  icon={<ArrowUpFromLine className="h-5 w-5" />}
                />
                <StatCard
                  label="Active investments"
                  value={String(db.investments.length)}
                  icon={<TrendingUp className="h-5 w-5" />}
                />
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

              <GlassCard>
                <div className="mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Recent activity
                  </h2>
                </div>
                <div className="space-y-2">
                  {recent.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-2xl glass-soft px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold capitalize">
                          {t.type} · {db.users.find((u) => u.id === t.userId)?.name ?? "—"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t.method ?? "—"}
                        </span>
                      </span>
                      <span className="text-sm font-bold">{money(t.amount)}</span>
                      <StatusBadge status={t.status} />
                    </div>
                  ))}
                  {recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  ) : null}
                </div>
              </GlassCard>
            </div>
          ) : null}


          {tab === "Users" ? <UsersManager /> : null}


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

          {tab === "Plans" ? <PlansManager /> : null}


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

          {tab === "Audit Log" ? <AuditLogPanel /> : null}

          {tab === "Settings" ? (
            <GlassCard className="max-w-xl space-y-4">
              <h2 className="text-lg font-bold">Platform settings</h2>
              <BrandingSettings />
              <AnnouncementSettings />
              <MaintenanceSettings />
              <SalarySettings />
              {(
                [
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
                        (d.settings as unknown as Record<string, unknown>)[k] = Number(
                          e.target.value,
                        );
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

/* ---------------- Branding settings (name, title, logo) ---------------- */
function BrandingSettings() {
  const { db, update } = useStore();
  const [busy, setBusy] = useState(false);
  const { siteName, siteTitle, siteLogo } = db.settings;

  const setField = (key: "siteName" | "siteTitle" | "siteLogo", value: string) =>
    update((d) => {
      d.settings[key] = value;
      return d;
    });

  const pickLogo = async (file: File) => {
    setBusy(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] ?? "");
        r.onerror = () => rej(new Error("Could not read file"));
        r.readAsDataURL(file);
      });
      const { url } = await uploadProofImage({ data: { base64, name: file.name } });
      setField("siteLogo", url);
      toast.success("Logo updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-background/30 p-4">
      <p className="text-sm font-bold">Site branding</p>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Site name</label>
        <input
          defaultValue={siteName}
          onBlur={(e) => setField("siteName", e.target.value)}
          className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
          Site title (browser tab)
        </label>
        <input
          defaultValue={siteTitle}
          onBlur={(e) => setField("siteTitle", e.target.value)}
          className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Site logo</label>
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl gradient-brand font-display text-base font-black text-primary-foreground">
            {siteLogo ? (
              <img src={siteLogo} alt={`${siteName} logo`} className="h-full w-full object-cover" />
            ) : (
              (siteName[0] ?? "H")
            )}
          </div>
          <div className="flex flex-1 flex-wrap gap-2">
            <label className="btn-glass cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold">
              {busy ? "Uploading…" : siteLogo ? "Replace logo" : "Upload logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void pickLogo(f);
                  e.target.value = "";
                }}
              />
            </label>
            {siteLogo ? (
              <button
                onClick={() => setField("siteLogo", "")}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-destructive"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanEditor({
  plan,
  onSave,
  onCancel,
}: {
  plan: { name: string; price: number; daily: number; days: number };
  onSave: (v: { name: string; price: number; daily: number; days: number }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState(String(plan.price));
  const [daily, setDaily] = useState(String(plan.daily));
  const [days, setDays] = useState(String(plan.days));

  const p = Number(price) || 0;
  const d = Number(daily) || 0;
  const n = Number(days) || 0;
  const total = d * n;

  const field = "h-11 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <GlassCard className="space-y-3">
      <div>
        <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Plan name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Price</label>
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" className={field} />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Daily income</label>
          <input value={daily} onChange={(e) => setDaily(e.target.value)} type="number" className={field} />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Days</label>
          <input value={days} onChange={(e) => setDays(e.target.value)} type="number" className={field} />
        </div>
      </div>
      <div className="rounded-xl glass-soft p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total return (auto)</span>
          <span className="font-bold text-success">{money(total)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-muted-foreground">Net profit</span>
          <span className="font-semibold">{money(total - p)}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-xl glass-soft py-2.5 text-sm font-semibold">
          Cancel
        </button>
        <button
          onClick={() => {
            if (!name.trim() || p <= 0 || d <= 0 || n <= 0) return toast.error("Fill name, price, daily income and days.");
            onSave({ name: name.trim(), price: p, daily: d, days: n });
          }}
          className="flex-1 rounded-xl gradient-brand py-2.5 text-sm font-bold text-primary-foreground"
        >
          Save plan
        </button>
      </div>
    </GlassCard>
  );
}

function PlansManager() {
  const { db, update } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          + Add plan
        </button>
      ) : (
        <div className="max-w-md">
          <PlanEditor
            plan={{ name: "", price: 1000, daily: 50, days: 30 }}
            onCancel={() => setCreating(false)}
            onSave={(v) => {
              update((d) => {
                d.plans.push({
                  id: newId(),
                  name: v.name,
                  min: v.price,
                  max: v.price,
                  dailyRoi: (v.daily / v.price) * 100,
                  durationDays: v.days,
                  features: [],
                  active: true,
                });
                return d;
              });
              setCreating(false);
              toast.success("Plan created.");
            }}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {db.plans.map((p) => {
          const daily = p.min * (p.dailyRoi / 100);
          if (editing === p.id) {
            return (
              <PlanEditor
                key={p.id}
                plan={{ name: p.name, price: p.min, daily, days: p.durationDays }}
                onCancel={() => setEditing(null)}
                onSave={(v) => {
                  update((d) => {
                    const t = d.plans.find((x) => x.id === p.id)!;
                    t.name = v.name;
                    t.min = v.price;
                    t.max = v.price;
                    t.dailyRoi = (v.daily / v.price) * 100;
                    t.durationDays = v.days;
                    return d;
                  });
                  setEditing(null);
                  toast.success("Plan updated.");
                }}
              />
            );
          }
          return (
            <GlassCard key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-extrabold">{p.name}</h3>
                <StatusBadge status={p.active ? "approved" : "rejected"} />
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-semibold">{money(p.min)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily income</span>
                  <span className="font-semibold text-success">{money(daily)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Days</span>
                  <span className="font-semibold">{p.durationDays}</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-1.5">
                  <span className="text-muted-foreground">Total return</span>
                  <span className="font-bold text-gold">{money(daily * p.durationDays)}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setEditing(p.id)}
                  className="flex-1 rounded-lg glass-soft py-2 text-xs font-semibold"
                >
                  Edit
                </button>
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
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Users manager (mobile-first, 12 controls) ---------------- */
function UsersManager() {
  const { db, update, addNotification } = useStore();
  const [q, setQ] = useState("");
  const [view, setView] = useState<"all" | "frozen" | "invested" | "new">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const users = db.users
    .filter((u) => u.role === "user")
    .filter((u) =>
      q.trim() ? `${u.name} ${u.phone ?? ""} ${u.email} ${u.referralCode}`.toLowerCase().includes(q.toLowerCase()) : true,
    )
    .filter((u) =>
      view === "frozen"
        ? u.blocked
        : view === "invested"
          ? u.invested > 0
          : view === "new"
            ? Date.now() - new Date(u.createdAt).getTime() < 7 * 86400000
            : true,
    );

  const patch = (id: string, fn: (u: (typeof db.users)[number]) => void) =>
    update((d) => {
      const u = d.users.find((x) => x.id === id);
      if (u) fn(u);
      return d;
    });

  const ledger = (id: string, type: "bonus" | "withdraw" | "commission", amount: number, method: string) =>
    update((d) => {
      d.transactions.unshift({
        id: newId(),
        userId: id,
        type,
        amount,
        method,
        status: "completed",
        createdAt: timestamp(),
      });
      return d;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, phone, code…"
          className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
        />
        <div className="inline-flex gap-1 rounded-xl glass-soft p-1">
          {(["all", "new", "invested", "frozen"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition",
                view === v ? "gradient-cool text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {users.map((u) => {
          const plans = db.investments.filter((i) => i.userId === u.id).length;
          const open = openId === u.id;
          return (
            <GlassCard key={u.id} className="p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-cool text-xs font-black text-primary-foreground">
                  {u.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.phone ?? u.email}</p>
                </div>
                <StatusBadge status={u.blocked ? "rejected" : "approved"} />
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                {[
                  ["Balance", money(u.balance)],
                  ["Invested", money(u.invested)],
                  ["Refs", u.referralCode],
                  ["Plans", String(plans)],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl glass-soft px-2 py-2">
                    <p className="truncate text-[9px] uppercase tracking-widest text-muted-foreground">{l}</p>
                    <p className="truncate text-[11px] font-bold">{v}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setOpenId(open ? null : u.id)}
                className="btn-glass mt-3 flex h-10 w-full items-center justify-center text-xs font-bold text-foreground"
              >
                {open ? "Hide controls" : "Manage user"}
              </button>

              {open ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Ctl label="Add funds" onClick={() => {
                    const v = Number(prompt(`Add funds to ${u.name}`, "1000"));
                    if (!v) return;
                    patch(u.id, (x) => { x.balance += v; });
                    ledger(u.id, "bonus", v, "Admin credit");
                    addNotification(u.id, { title: "Funds added", body: `${money(v)} credited by support.`, kind: "success" });
                    toast.success("Funds added.");
                  }} />
                  <Ctl label="Deduct funds" onClick={() => {
                    const v = Number(prompt(`Deduct from ${u.name}`, "1000"));
                    if (!v) return;
                    patch(u.id, (x) => { x.balance = Math.max(0, x.balance - v); });
                    ledger(u.id, "withdraw", v, "Admin adjustment");
                    toast.success("Funds deducted.");
                  }} />
                  <Ctl label="Set balance" onClick={() => {
                    const v = prompt(`Set balance for ${u.name}`, String(u.balance));
                    if (v == null || isNaN(Number(v))) return;
                    patch(u.id, (x) => { x.balance = Number(v); });
                    toast.success("Balance updated.");
                  }} />
                  <Ctl label="Referral bonus" onClick={() => {
                    const v = Number(prompt(`Referral bonus for ${u.name}`, "500"));
                    if (!v) return;
                    patch(u.id, (x) => { x.balance += v; x.referralEarnings += v; });
                    ledger(u.id, "commission", v, "Admin referral bonus");
                    toast.success("Bonus credited.");
                  }} />
                  <Ctl label="Activate plan" onClick={() => {
                    const plan = db.plans.find((p) => p.active);
                    if (!plan) return toast.error("No active plan.");
                    update((d) => {
                      d.investments.unshift({
                        id: newId(), userId: u.id, planId: plan.id, planName: plan.name,
                        amount: plan.min, dailyRoi: plan.dailyRoi, durationDays: plan.durationDays,
                        earned: 0, startedAt: timestamp(), lastPayoutAt: timestamp(),
                      });
                      return d;
                    });
                    toast.success(`${plan.name} activated.`);
                  }} />
                  <Ctl label="End all plans" onClick={() => {
                    update((d) => {
                      d.investments = d.investments.filter((i) => i.userId !== u.id);
                      return d;
                    });
                    toast.success("Plans removed.");
                  }} />
                  <Ctl label="Notify user" onClick={() => {
                    const body = prompt(`Message to ${u.name}`);
                    if (!body) return;
                    addNotification(u.id, { title: "Message from HopeX", body, kind: "info", popup: true });
                    toast.success("Notification sent.");
                  }} />
                  <Ctl label="Reset payout acct" onClick={() => {
                    patch(u.id, (x) => { x.bankName = ""; x.accountName = ""; x.accountNumber = ""; });
                    toast.success("Payout account cleared.");
                  }} />
                  <Ctl label={u.verified ? "Unverify" : "Verify"} onClick={() => {
                    patch(u.id, (x) => { x.verified = !x.verified; });
                    toast.success("Verification updated.");
                  }} />
                  <Ctl label="Clear chat" onClick={() => {
                    update((d) => {
                      d.chats = d.chats.filter((c) => c.userId !== u.id);
                      return d;
                    });
                    toast.success("Chat cleared.");
                  }} />
                  <Ctl label="Copy contact" onClick={() => {
                    navigator.clipboard?.writeText(u.phone ?? u.email);
                    toast.success("Contact copied.");
                  }} />
                  <Ctl
                    danger
                    label={u.blocked ? "Unfreeze" : "Freeze"}
                    onClick={() => {
                      patch(u.id, (x) => { x.blocked = !x.blocked; });
                      toast.success(u.blocked ? "Account unfrozen." : "Account frozen.");
                    }}
                  />
                </div>
              ) : null}
            </GlassCard>
          );
        })}
        {users.length === 0 ? <p className="text-sm text-muted-foreground">No users match this filter.</p> : null}
      </div>
    </div>
  );
}

function Ctl({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl px-2 py-2.5 text-[11px] font-bold transition",
        danger ? "bg-destructive/15 text-destructive" : "glass-soft text-foreground hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}

/** Scrolling announcement banner shown to every signed-in user. */
function AnnouncementSettings() {
  const { db, update } = useStore();
  return (
    <div className="rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">Announcement banner</p>
        <button
          onClick={() =>
            update((d) => {
              d.settings.announcementActive = !d.settings.announcementActive;
              return d;
            })
          }
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            db.settings.announcementActive
              ? "bg-success/15 text-success"
              : "bg-muted text-muted-foreground",
          )}
        >
          {db.settings.announcementActive ? "Live" : "Off"}
        </button>
      </div>
      <textarea
        defaultValue={db.settings.announcementText}
        onBlur={(e) =>
          update((d) => {
            d.settings.announcementText = e.target.value;
            return d;
          })
        }
        rows={2}
        placeholder="e.g. Withdrawals are processed daily between 8am and 8pm."
        className="mt-3 w-full rounded-xl border border-input bg-background/40 p-3 text-sm outline-none"
      />
    </div>
  );
}

/** Freezes the user-facing app while keeping admin access open. */
function MaintenanceSettings() {
  const { db, update } = useStore();
  return (
    <div className="rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">Maintenance mode</p>
        <button
          onClick={() =>
            update((d) => {
              d.settings.maintenanceMode = !d.settings.maintenanceMode;
              return d;
            })
          }
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            db.settings.maintenanceMode
              ? "bg-warning/15 text-warning"
              : "bg-muted text-muted-foreground",
          )}
        >
          {db.settings.maintenanceMode ? "Enabled" : "Disabled"}
        </button>
      </div>
      <input
        defaultValue={db.settings.maintenanceMessage}
        onBlur={(e) =>
          update((d) => {
            d.settings.maintenanceMessage = e.target.value;
            return d;
          })
        }
        placeholder="We'll be back shortly."
        className="mt-3 h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
      />
    </div>
  );
}

/** Rank salary tiers: team size + invested requirement pays a monthly salary. */
function SalarySettings() {
  const { db, update } = useStore();
  const tiers = db.settings.salaryTiers;

  const patch = (i: number, key: keyof SalaryTier, value: string) =>
    update((d) => {
      const t = d.settings.salaryTiers[i];
      if (!t) return d;
      if (key === "rank") t.rank = value;
      else t[key] = Number(value) as never;
      return d;
    });

  return (
    <div className="rounded-2xl border border-border/60 p-4">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-gold" />
        <p className="text-sm font-bold">Rank salary tiers</p>
      </div>
      <div className="mt-3 space-y-2">
        {tiers.map((t, i) => (
          <div key={i} className="grid grid-cols-4 gap-2">
            {(["rank", "team", "invested", "salary"] as const).map((k) => (
              <input
                key={k}
                defaultValue={String(t[k])}
                onBlur={(e) => patch(i, k, e.target.value)}
                placeholder={k}
                className="h-11 rounded-xl border border-input bg-background/40 px-3 text-xs outline-none"
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() =>
            update((d) => {
              d.settings.salaryTiers = [
                ...d.settings.salaryTiers,
                { rank: "New rank", team: 5, invested: 5000, salary: 500 },
              ];
              return d;
            })
          }
          className="btn-glass h-10 px-4 text-xs font-bold text-foreground"
        >
          Add tier
        </button>
        {tiers.length ? (
          <button
            onClick={() =>
              update((d) => {
                d.settings.salaryTiers = d.settings.salaryTiers.slice(0, -1);
                return d;
              })
            }
            className="btn-glass h-10 px-4 text-xs font-bold text-destructive"
          >
            Remove last
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Columns: rank name, direct team required, personal investment required, monthly salary.
      </p>
    </div>
  );
}

/** Read-only trail of admin actions. */
function AuditLogPanel() {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchAuditLog()
      .then((r) => alive && setRows(r))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <GlassCard>
      <h2 className="text-lg font-bold">Audit log</h2>
      <p className="text-xs text-muted-foreground">Every admin action, newest first.</p>
      <div className="mt-4 divide-y divide-border/40">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {r.action}
                  {r.targetName ? ` · ${r.targetName}` : ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.detail}
                  {r.adminName ? ` — by ${r.adminName}` : ""}
                </p>
              </div>
              <p className="shrink-0 text-[11px] text-muted-foreground">
                {new Date(r.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
}
