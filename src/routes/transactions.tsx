import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, TrendingUp } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { TxList } from "@/components/tx-list";
import { useT } from "@/lib/i18n";
import { money, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
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
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <SectionTitle
          title={t("Ledger")}
          subtitle={t("Comprehensive history of all movements.")}
        />
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-cool text-primary-foreground">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden rounded-[2rem] border border-emerald-500/10 bg-emerald-500/5 p-5">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl" />
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60">{t("Total Inflow")}</p>
          <p className="mt-1 font-display text-2xl font-black text-emerald-400">+{money(inflow)}</p>
        </div>
        <div className="relative overflow-hidden rounded-[2rem] border border-red-500/10 bg-red-500/5 p-5">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-red-500/10 blur-2xl" />
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500/60">{t("Total Outflow")}</p>
          <p className="mt-1 font-display text-2xl font-black text-red-400">−{money(outflow)}</p>
        </div>
      </div>

      <GlassCard className="border-none bg-background/20 p-4">
        <div className="flex flex-wrap gap-2 scrollbar-hide overflow-x-auto pb-2">
          {types.map((ty) => (
            <button
              key={ty}
              onClick={() => setType(ty)}
              className={cn(
                "h-9 shrink-0 rounded-xl px-4 text-xs font-bold capitalize transition-all",
                type === ty 
                  ? "gradient-brand text-primary-foreground shadow-lg shadow-primary/20" 
                  : "glass-soft text-muted-foreground hover:text-foreground"
              )}
            >
              {ty === "all" ? t("All") : t(ty)}
            </button>
          ))}
        </div>
        
        <div className="mt-4 grid gap-2 sm:grid-cols-[1.6fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("Search ledger...")}
              className="h-11 w-full rounded-2xl border-none bg-white/5 pl-11 pr-4 text-[13px] font-bold outline-none ring-1 ring-white/10 transition-all focus:ring-primary/40 focus:bg-white/10"
            />
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 ring-1 ring-white/10">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter shrink-0">{t("From")}</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-11 flex-1 bg-transparent text-[11px] font-black outline-none"
            />
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 ring-1 ring-white/10">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter shrink-0">{t("To")}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-11 flex-1 bg-transparent text-[11px] font-black outline-none"
            />
          </div>
        </div>
      </GlassCard>

      <div className="rounded-[2.5rem] glass overflow-hidden">
        <TxList rows={rows} empty={t("No records found in this category.")} />
      </div>
    </div>
  );
}
