import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { TxList } from "@/components/tx-list";
import { useT } from "@/lib/i18n";
import { money, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "All Transactions — HopeX" },
      {
        name: "description",
        content: "Filter and search every deposit, withdrawal, investment, commission and payout.",
      },
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

const types = [
  "all",
  "deposit",
  "withdraw",
  "investment",
  "commission",
  "bonus",
  "payout",
] as const;

function Transactions() {
  const { db, user } = useStore();
  const { t } = useT();
  const [type, setType] = useState<(typeof types)[number]>("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => {
    return db.transactions.filter((tx) => {
      if (tx.userId !== user?.id) return false;
      if (type !== "all" && tx.type !== type) return false;
      if (q && !`${tx.type} ${tx.method ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      const d = new Date(tx.createdAt).getTime();
      if (from && d < new Date(from).getTime()) return false;
      if (to && d > new Date(to).getTime() + 86400000) return false;
      return true;
    });
  }, [db.transactions, user?.id, type, q, from, to]);

  const inflow = rows
    .filter((r) => r.type !== "withdraw" && r.type !== "investment")
    .reduce((a, r) => a + r.amount, 0);
  const outflow = rows
    .filter((r) => r.type === "withdraw" || r.type === "investment")
    .reduce((a, r) => a + r.amount, 0);

  return (
    <div>
      <SectionTitle
        title={t("All transactions")}
        subtitle="Search, filter and audit every movement in your account."
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">In</p>
          <p className="mt-1 font-display text-xl font-extrabold text-success">
            +{money(inflow)}
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Out</p>
          <p className="mt-1 font-display text-xl font-extrabold text-destructive">
            −{money(outflow)}
          </p>
        </GlassCard>
      </div>

      <GlassCard className="mb-4">
        <div className="flex flex-wrap gap-2">
          {types.map((ty) => (
            <button
              key={ty}
              onClick={() => setType(ty)}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-semibold capitalize transition",
                type === ty ? "btn-glass btn-glass-primary" : "glass-soft text-muted-foreground",
              )}
            >
              {ty === "all" ? t("All") : ty}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1.6fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`${t("Search")}…`}
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

      <TxList rows={rows} empty={t("No transactions yet.")} />
    </div>
  );
}
