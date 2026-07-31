import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle, StatusBadge } from "@/components/glass";
import { money, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "All Transactions — HopeX" },
      { name: "description", content: "Filter and search every deposit, withdrawal, investment, commission and bonus." },
      { property: "og:title", content: "All Transactions — HopeX" },
      { property: "og:description", content: "Complete ledger of your account activity." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <Transactions />
      </DashboardLayout>
    </AuthGuard>
  ),
});

const types = ["all", "deposit", "withdraw", "investment", "commission", "bonus", "payout"] as const;

function Transactions() {
  const { db, user } = useStore();
  const [type, setType] = useState<(typeof types)[number]>("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => {
    return db.transactions.filter((t) => {
      if (t.userId !== user?.id) return false;
      if (type !== "all" && t.type !== type) return false;
      if (q && !`${t.type} ${t.method ?? ""} ${t.reference ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      const d = new Date(t.createdAt).getTime();
      if (from && d < new Date(from).getTime()) return false;
      if (to && d > new Date(to).getTime() + 86400000) return false;
      return true;
    });
  }, [db.transactions, user?.id, type, q, from, to]);

  return (
    <div>
      <SectionTitle title="All transactions" subtitle="Search, filter and audit every movement in your account." />

      <GlassCard className="mb-4">
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-semibold capitalize transition",
                type === t ? "gradient-cool text-primary-foreground" : "glass-soft text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1.6fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search method or reference…"
              className="h-11 w-full rounded-xl border border-input bg-background/40 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-11 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-11 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </GlassCard>

      <GlassCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Type</th>
              <th className="p-4">Details</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="p-4 text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="p-4 font-semibold capitalize">{t.type}</td>
                <td className="p-4 text-muted-foreground">{t.method ?? "—"}</td>
                <td
                  className={cn(
                    "p-4 font-semibold",
                    t.type === "withdraw" || t.type === "investment" ? "text-destructive" : "text-success",
                  )}
                >
                  {t.type === "withdraw" || t.type === "investment" ? "−" : "+"}
                  {money(t.amount)}
                </td>
                <td className="p-4">
                  <StatusBadge status={t.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No transactions match these filters.</p>
        ) : null}
      </GlassCard>
    </div>
  );
}
