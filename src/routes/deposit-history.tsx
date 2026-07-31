import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle, StatusBadge } from "@/components/glass";
import { money, useStore } from "@/lib/store";

export const Route = createFileRoute("/deposit-history")({
  head: () => ({
    meta: [
      { title: "Deposit History — Aurum Capital" },
      { name: "description", content: "Review every deposit with status, method and timestamps." },
      { property: "og:title", content: "Deposit History — Aurum Capital" },
      { property: "og:description", content: "Pending, approved and rejected deposits in one place." },
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
  const rows = db.transactions.filter((t) => t.userId === user?.id && t.type === "deposit");

  return (
    <div>
      <SectionTitle title="Deposit history" subtitle="Every deposit request and its current status." />
      <GlassCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Method</th>
              <th className="p-4">Transaction ID</th>
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
            No deposits yet.{" "}
            <Link to="/deposit" className="font-semibold text-primary">
              Make your first deposit
            </Link>
          </div>
        ) : null}
      </GlassCard>
    </div>
  );
}
