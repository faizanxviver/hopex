import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownLeft, CheckCircle2, Loader2, Plus } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { LedgerHeader, MoneyStat } from "@/components/money-stats";
import { TxList } from "@/components/tx-list";
import { useT } from "@/lib/i18n";
import { money, useStore } from "@/lib/store";

export const Route = createFileRoute("/deposit-history")({
  validateSearch: (search: Record<string, unknown>) => ({
    ref: typeof search.ref === "string" ? search.ref.slice(0, 100) : undefined,
  }),
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Deposit History — HopeX" },
      { name: "description", content: "Review every deposit with status, method and timestamps." },
      { property: "og:title", content: "Deposit History — HopeX" },
      {
        property: "og:description",
        content: "Processing, successful and declined deposits in one place.",
      },
    ],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <DepositHistory />
      </DashboardLayout>
    </AuthGuard>
  ),
});

function DepositHistory() {
  const { db, user } = useStore();
  const { t } = useT();
  const { ref } = Route.useSearch();
  const rows = db.transactions.filter((tx) => tx.userId === user?.id && tx.type === "deposit");
  const successful = rows.filter((r) => r.status === "approved" || r.status === "completed");
  const processing = rows.filter((r) => r.status === "pending" || r.status === "processing");

  return (
    <div className="space-y-4 pb-24">
      <LedgerHeader
        title={t("Deposit history")}
        subtitle={t("Audit every top-up request and its current status.")}
        icon={<ArrowDownLeft className="h-5 w-5" />}
        action={
          <Link
            to="/deposit"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-cool text-primary-foreground shadow-lg shadow-primary/20"
            aria-label={t("New deposit")}
          >
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      {ref ? (
        <div className="relative overflow-hidden rounded-[1.75rem] glass p-5">
          <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-success/25 blur-2xl" />
          <p className="relative flex items-center gap-2 text-sm font-black text-success">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("Payment received — automatic verification in progress")}
          </p>
          <p className="relative mt-1 text-xs text-muted-foreground">
            {t(
              "Your gateway payment was captured successfully. The amount is credited as soon as verification completes.",
            )}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <MoneyStat
          label={t("Successful")}
          value={money(successful.reduce((a, r) => a + r.amount, 0))}
          tone="success"
          count={successful.length}
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
            <p className="mb-4 text-sm text-muted-foreground">{t("No deposits yet.")}</p>
            <Link
              to="/deposit"
              className="inline-flex h-11 items-center rounded-2xl gradient-brand px-6 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
            >
              {t("Make your first deposit")}
            </Link>
          </div>
        }
      />
    </div>
  );
}
