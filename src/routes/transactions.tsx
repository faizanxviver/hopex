import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Receipt, Search, SlidersHorizontal } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { LedgerHeader, MoneyStat } from "@/components/money-stats";
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
  const [showFilters, setShowFilters] = useState(false);

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

  const credits = rows.filter((r) => r.type !== "withdraw" && r.type !== "investment");
  const debits = rows.filter((r) => r.type === "withdraw" || r.type === "investment");
  const inflow = credits.reduce((a, r) => a + r.amount, 0);
  const outflow = debits.reduce((a, r) => a + r.amount, 0);

  return (
    <div className="space-y-4 pb-24">
      <LedgerHeader
        title={t("Ledger")}
        subtitle={t("Comprehensive history of all movements.")}
        icon={<Receipt className="h-5 w-5" />}
      />

      <div className="grid grid-cols-2 gap-3">
        <MoneyStat
          label={t("Total Inflow")}
          value={`+${money(inflow)}`}
          tone="success"
          count={credits.length}
          icon={<ArrowDownLeft className="h-4 w-4" />}
          hint={t("Credited")}
        />
        <MoneyStat
          label={t("Total Outflow")}
          value={`−${money(outflow)}`}
          tone="destructive"
          count={debits.length}
          icon={<ArrowUpRight className="h-4 w-4" />}
          hint={t("Debited")}
        />
      </div>

      <div className="rounded-[1.75rem] glass p-3">
        <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {types.map((ty) => (
            <button
              key={ty}
              onClick={() => setType(ty)}
              className={cn(
                "h-9 shrink-0 rounded-xl px-4 text-xs font-black capitalize transition-all",
                type === ty
                  ? "gradient-brand text-primary-foreground shadow-lg shadow-primary/25"
                  : "glass-soft text-muted-foreground hover:text-foreground",
              )}
            >
              {ty === "all" ? t("All") : t(ty)}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("Filter by method or ID...")}
              className="h-12 w-full rounded-2xl border-none bg-background/40 pl-11 pr-4 text-sm font-medium outline-none ring-1 ring-border/50 focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition",
              showFilters || from || to
                ? "gradient-brand text-primary-foreground"
                : "glass-soft text-muted-foreground",
            )}
            aria-label={t("Date filters")}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {showFilters ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-2xl bg-background/40 px-3 ring-1 ring-border/50">
              <span className="text-[10px] font-black uppercase text-muted-foreground">
                {t("From")}
              </span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-12 flex-1 bg-transparent text-xs font-bold outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-background/40 px-3 ring-1 ring-border/50">
              <span className="text-[10px] font-black uppercase text-muted-foreground">
                {t("To")}
              </span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-12 flex-1 bg-transparent text-xs font-bold outline-none"
              />
            </div>
          </div>
        ) : null}
      </div>

      <TxList rows={rows} empty={t("No records found in this category.")} />
    </div>
  );
}
