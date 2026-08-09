import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
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
  const rows = db.transactions.filter((tx) => tx.userId === user?.id && tx.type === "deposit");
  const successful = rows.filter((r) => r.status === "approved" || r.status === "completed");
  const processing = rows.filter((r) => r.status === "pending" || r.status === "processing");

  return (
    <div className="space-y-6 pb-20">
      <SectionTitle
        title={t("Deposit history")}
        subtitle={t("Audit every top-up request and its current status.")}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="relative overflow-hidden rounded-[2rem] glass p-5">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-success/20 blur-2xl" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t("Successful")}</p>
          <p className="mt-1 font-display text-2xl font-black text-success">
            {money(successful.reduce((a, r) => a + r.amount, 0))}
          </p>
        </div>
        <div className="relative overflow-hidden rounded-[2rem] glass p-5">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/20 blur-2xl" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t("Processing")}</p>
          <p className="mt-1 font-display text-2xl font-black text-primary">
            {money(processing.reduce((a, r) => a + r.amount, 0))}
          </p>
        </div>
      </div>

      <div className="rounded-[2.5rem] glass overflow-hidden">
        <TxList
          rows={rows}
          empty={
            <div className="p-10 text-center">
              <p className="text-sm text-muted-foreground mb-4">{t("No deposits yet.")}</p>
              <Link to="/deposit" className="inline-flex h-11 items-center rounded-2xl gradient-brand px-6 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">
                {t("Make your first deposit")}
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}
