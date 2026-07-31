import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownToLine,
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
import type { TxStatus } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Aurum Capital" },
      { name: "description", content: "Manage users, deposits, withdrawals, plans, promo codes, chat and broadcasts." },
      { property: "og:title", content: "Admin Panel — Aurum Capital" },
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
  Plans: TrendingUp,
  "Promo Codes": Ticket,
  "Support Chat": MessageSquare,
  Broadcast: Megaphone,
  Settings: Settings,
};


function Admin() {
  const { db, update, addNotification } = useStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");

  const users = db.users.filter((u) => u.role === "user");
  const deposits = db.transactions.filter((t) => t.type === "deposit");
  const withdrawals = db.transactions.filter((t) => t.type === "withdraw");
  const totalDeposits = deposits.filter((t) => t.status === "approved").reduce((a, t) => a + t.amount, 0);
  const totalWithdrawals = withdrawals.filter((t) => t.status === "completed").reduce((a, t) => a + t.amount, 0);

  const setStatus = (id: string, status: TxStatus, credit: boolean) => {
    update((d) => {
      const t = d.transactions.find((x) => x.id === id);
      if (!t) return d;
      t.status = status;
      const owner = d.users.find((u) => u.id === t.userId);
      if (owner && credit && t.type === "deposit" && status === "approved") owner.balance += t.amount;
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

  const pendingDeps = deposits.filter((t) => t.status === "pending").length;
  const pendingWds = withdrawals.filter((t) => t.status === "pending").length;
  const counts: Partial<Record<(typeof tabs)[number], number>> = {
    Users: users.length,
    Deposits: pendingDeps,
    Withdrawals: pendingWds,
    "Support Chat": db.chats.filter((c) => c.from === "user").length,
  };

  return (
    <div>
      <SectionTitle title="Admin panel" subtitle="Full control over users, money flow and platform configuration." />

      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="glass rounded-3xl p-3">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Console
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
                          "ml-auto hidden rounded-full px-2 py-0.5 text-[10px] font-bold lg:inline",
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
          <StatCard label="Platform profit" value={money(Math.max(0, totalDeposits - totalWithdrawals))} accent="success" />
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
        <GlassCard className="overflow-x-auto p-0">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Method</th>
                <th className="p-4">Reference</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {(tab === "Deposits" ? deposits : withdrawals).map((t) => (
                <tr key={t.id}>
                  <td className="p-4">{db.users.find((u) => u.id === t.userId)?.name ?? "—"}</td>
                  <td className="p-4">{t.method}</td>
                  <td className="p-4 text-muted-foreground">{t.reference ?? "—"}</td>
                  <td className="p-4 font-semibold">{money(t.amount)}</td>
                  <td className="p-4">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setStatus(t.id, tab === "Deposits" ? "approved" : "completed", true)}
                        className="rounded-lg bg-success/15 px-3 py-1 text-xs font-semibold text-success"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setStatus(t.id, "rejected", false)}
                        className="rounded-lg bg-destructive/15 px-3 py-1 text-xs font-semibold text-destructive"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      ) : null}

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
                  {p.type === "percent" ? `${p.value}% bonus` : `${money(p.value)} bonus`} · expires {p.expiresAt}
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
              targets.forEach((u) => addNotification(u.id, { title, body, kind: "info", popup: true }));
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
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</label>
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

function AdminChat() {
  const { db, update } = useStore();
  const chatUsers = Array.from(new Set(db.chats.map((c) => c.userId)));
  const [selected, setSelected] = useState(chatUsers[0] ?? "");
  const [text, setText] = useState("");
  const messages = db.chats.filter((c) => c.userId === selected);

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <GlassCard className="p-3">
        {chatUsers.map((id) => {
          const u = db.users.find((x) => x.id === id);
          return (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={cn(
                "block w-full truncate rounded-xl px-3 py-2 text-left text-sm font-medium",
                selected === id ? "gradient-cool text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {u?.name ?? id}
            </button>
          );
        })}
      </GlassCard>
      <GlassCard className="flex h-[28rem] flex-col p-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <div key={m.id} className={m.from === "support" ? "flex justify-end" : "flex justify-start"}>
              <p
                className={
                  m.from === "support"
                    ? "max-w-[75%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[75%] rounded-2xl bg-secondary px-3 py-2 text-sm text-secondary-foreground"
                }
              >
                {m.text}
              </p>
            </div>
          ))}
          {messages.length === 0 ? <p className="text-sm text-muted-foreground">No messages.</p> : null}
        </div>
        <div className="flex gap-2 border-t border-border/60 p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reply to user…"
            className="h-11 flex-1 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
          />
          <button
            onClick={() => {
              if (!text.trim() || !selected) return;
              const value = text.trim();
              setText("");
              update((d) => {
                d.chats.push({
                  id: newId(),
                  userId: selected,
                  from: "support",
                  text: value,
                  createdAt: timestamp(),
                });
                return d;
              });
            }}
            className="rounded-xl gradient-brand px-5 text-sm font-semibold text-primary-foreground"
          >
            Send
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
