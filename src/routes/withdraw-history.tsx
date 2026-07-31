import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle, StatusBadge } from "@/components/glass";
import { money, useStore } from "@/lib/store";

export const Route = createFileRoute("/withdraw-history")({
  head: () => ({
    meta: [
      { title: "Withdraw History — HopeX" },
      { name: "description", content: "Track every payout request from pending to completed." },
      { property: "og:title", content: "Withdraw History — HopeX" },
      { property: "og:description", content: "Payout status tracking for your HopeX wallet." },
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
  const rows = db.transactions.filter((t) => t.userId === user?.id && t.type === "withdraw");

  return (
    <div>
      <SectionTitle title="Withdraw history" subtitle="Payout requests and their processing status." />
      <GlassCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Method</th>
              <th className="p-4">Account</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="p-4 text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="p-4">{t.method}</td>
                <td className="p-4 text-muted-foreground">{t.reference ?? "—"}</td>
                <td className="p-4 font-semibold">{money(t.amount)}</td>
                <td className="p-4">
                  <StatusBadge status={t.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No withdrawals yet.{" "}
            <Link to="/withdraw" className="font-semibold text-primary">
              Request a payout
            </Link>
          </div>
        ) : null}
      </GlassCard>
    </div>
  );
}
