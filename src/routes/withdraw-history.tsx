import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { TxList } from "@/components/tx-list";
import { useT } from "@/lib/i18n";
import { money, useStore } from "@/lib/store";

export const Route = createFileRoute("/withdraw-history")({
  head: () => ({
    meta: [
      { title: "Withdraw History — HopeX" },
      { name: "description", content: "Track every payout request, its method and current status." },
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
    <div>
      <SectionTitle title={t("Withdraw history")} subtitle="Every payout request and its current status." />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("Successful")}</p>
          <p className="mt-1 font-display text-xl font-extrabold text-success">
            {money(paid.reduce((a, r) => a + r.amount, 0))}
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("Processing")}</p>
          <p className="mt-1 font-display text-xl font-extrabold text-primary">
            {money(processing.reduce((a, r) => a + r.amount, 0))}
          </p>
        </GlassCard>
      </div>

      <TxList
        rows={rows}
        empty={
          <>
            No withdrawals yet.{" "}
            <Link to="/withdraw" className="font-semibold text-primary">
              Request a payout
            </Link>
          </>
        }
      />
    </div>
  );
}
