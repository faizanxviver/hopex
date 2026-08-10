import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, CheckCircle2, Loader2, Plus } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { LedgerHeader, MoneyStat } from "@/components/money-stats";
import { TxList } from "@/components/tx-list";
import { useT } from "@/lib/i18n";
import { money, useStore } from "@/lib/store";

export const Route = createFileRoute("/withdraw-history")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Withdraw History — HopeX" },
      {
        name: "description",
        content: "Track every payout request, its method and current status.",
      },
      { property: "og:title", content: "Withdraw History — HopeX" },
      { property: "og:description", content: "Processing, successful and declined payouts." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <WithdrawHistory />
      </DashboardLayout>
    </AuthGuard>
  ),
});

function WithdrawHistory() {
  const { db, user } = useStore();
  const { t } = useT();
  const rows = db.transactions.filter((tx) => tx.userId === user?.id && tx.type === "withdraw");
  const paid = rows.filter((r) => r.status === "approved" || r.status === "completed");
  const processing = rows.filter((r) => r.status === "pending" || r.status === "processing");

  return (
    <div className="space-y-4 pb-24">
      <LedgerHeader
        title={t("Withdraw history")}
        subtitle={t("Audit every payout request and its current status.")}
        icon={<ArrowUpRight className="h-5 w-5" />}
        action={
          <Link
            to="/withdraw"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-cool text-primary-foreground shadow-lg shadow-primary/20"
            aria-label={t("Request a payout")}
          >
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <MoneyStat
          label={t("Successful")}
          value={money(paid.reduce((a, r) => a + r.amount, 0))}
          tone="success"
          count={paid.length}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MoneyStat
          label={t("Processing")}
          value={money(processing.reduce((a, r) => a + r.amount, 0))}
          tone="primary"
          count={processing.length}
          icon={<Loader2 className="h-4 w-4" />}
        />
      </div>

      <TxList
        rows={rows}
        empty={
          <div className="text-center">
            <p className="mb-4 text-sm text-muted-foreground">{t("No withdrawals yet.")}</p>
            <Link
              to="/withdraw"
              className="inline-flex h-11 items-center rounded-2xl gradient-brand px-6 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
            >
              {t("Request a payout")}
            </Link>
          </div>
        }
      />
    </div>
  );
}
