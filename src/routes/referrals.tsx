import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, Share2, Users } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { money, referralTree, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/referrals")({
  head: () => ({
    meta: [
      { title: "Referral Program — Aurum Capital" },
      { name: "description", content: "Earn across 4 referral levels: 10%, 2%, 1% and 4% commission on downline investments." },
      { property: "og:title", content: "Referral Program — Aurum Capital" },
      { property: "og:description", content: "Build a team and earn four levels deep." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <Referrals />
      </DashboardLayout>
    </AuthGuard>
  ),
});

function Referrals() {
  const { db, user } = useStore();
  const [tab, setTab] = useState(0);
  if (!user) return null;

  const levels = referralTree(db, user.referralCode);
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth?mode=signup&ref=${user.referralCode}`
      : `/auth?mode=signup&ref=${user.referralCode}`;
  const teamSize = levels.reduce((a, l) => a + l.length, 0);

  const levelEarnings = levels.map((members, i) =>
    members.reduce((sum, m) => sum + (m.invested * db.settings.levels[i]) / 100, 0),
  );

  const copy = (value: string, label: string) => {
    navigator.clipboard?.writeText(value);
    toast.success(`${label} copied to clipboard.`);
  };

  return (
    <div>
      <SectionTitle title="Referral center" subtitle="Earn commission four levels deep, credited automatically." />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <GlassCard glow>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Your referral link</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={link}
              className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
            />
            <button
              onClick={() => copy(link, "Referral link")}
              className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl gradient-brand px-5 text-sm font-semibold text-primary-foreground"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-xl glass-soft px-4 py-2 text-sm">
              Code: <b className="text-gold">{user.referralCode}</b>
            </span>
            <button
              onClick={() => copy(user.referralCode, "Referral code")}
              className="flex items-center gap-2 rounded-xl glass-soft px-4 py-2 text-sm font-medium"
            >
              <Share2 className="h-4 w-4" /> Share code
            </button>
          </div>
        </GlassCard>

        <div className="grid grid-cols-2 gap-4">
          <GlassCard>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Team size</p>
            <p className="mt-2 font-display text-3xl font-extrabold">{teamSize}</p>
          </GlassCard>
          <GlassCard>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Direct refs</p>
            <p className="mt-2 font-display text-3xl font-extrabold">{levels[0].length}</p>
          </GlassCard>
          <GlassCard className="col-span-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Referral earnings</p>
            <p className="mt-2 font-display text-3xl font-extrabold text-gold">{money(user.referralEarnings)}</p>
          </GlassCard>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {db.settings.levels.map((rate, i) => (
          <GlassCard key={i}>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Level {i + 1}</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-gradient">{rate}%</p>
            <p className="mt-3 text-sm text-muted-foreground">{levels[i].length} members</p>
            <p className="text-sm font-semibold text-success">{money(levelEarnings[i])} earned</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="mt-6">
        <div className="flex items-center gap-2 overflow-x-auto">
          {levels.map((_, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={cn(
                "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition",
                tab === i ? "gradient-cool text-primary-foreground" : "glass-soft text-muted-foreground",
              )}
            >
              Level {i + 1}
            </button>
          ))}
        </div>
        <div className="mt-5 divide-y divide-border/40">
          {levels[tab].length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No members at this level yet — share your link to grow your team.
            </p>
          ) : (
            levels[tab].map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 font-bold text-primary">
                    {m.name[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.email} · joined {new Date(m.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold">{money(m.invested)}</p>
                  <p className="text-xs text-success">
                    +{money((m.invested * db.settings.levels[tab]) / 100)} commission
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" /> Commission is credited automatically the moment a downline member invests.
        </p>
      </GlassCard>
    </div>
  );
}
