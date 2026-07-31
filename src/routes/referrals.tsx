import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Copy,
  Share2,
  Users,
  Headset,
  Link2,
  Crown,
  TrendingUp,
  UserPlus,
  Sparkle,
} from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { money, referralTree, useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/referrals")({
  head: () => ({
    meta: [
      { title: "Team & Referrals — HopeX" },
      {
        name: "description",
        content:
          "Build your HopeX team and earn across 4 referral levels with commission credited instantly.",
      },
      { property: "og:title", content: "Team & Referrals — HopeX" },
      { property: "og:description", content: "Build a team and earn four levels deep." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const { db, user, setChatOpen } = useStore();
  const { t } = useT();
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
  const teamVolume = levels.reduce((a, l) => a + l.reduce((s, m) => s + m.invested, 0), 0);

  const copy = (value: string, label: string) => {
    navigator.clipboard?.writeText(value);
    toast.success(`${label} ${t("copied")}`);
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "HopeX", text: `Join HopeX with my code ${user.referralCode}`, url: link });
        return;
      } catch {
        /* user dismissed */
      }
    }
    copy(link, t("Referral link"));
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title={t("Team")}
        subtitle={t("Grow your network and earn commission four levels deep.")}
      />

      {/* Hero invite card */}
      <GlassCard glow className="relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-gold/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-primary/30 blur-3xl" />

        <div className="relative flex flex-wrap items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl gradient-brand text-primary-foreground">
            <Crown className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-extrabold">{t("Invite & earn")}</p>
            <p className="text-xs text-muted-foreground">
              {t("Commission is credited the moment your member invests.")}
            </p>
          </div>
          <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-mono text-sm font-bold text-gold">
            {user.referralCode}
          </span>
        </div>

        <div className="relative mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-4">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              readOnly
              value={link}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => copy(link, t("Referral link"))}
              className="btn-glass btn-glass-primary flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold sm:flex-none"
            >
              <Copy className="h-4 w-4" /> {t("Copy")}
            </button>
            <button
              onClick={share}
              className="btn-glass flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold sm:flex-none"
            >
              <Share2 className="h-4 w-4" /> {t("Share")}
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: t("Team size"), value: String(teamSize), icon: Users, tone: "text-primary" },
          {
            label: t("Direct refs"),
            value: String(levels[0].length),
            icon: UserPlus,
            tone: "text-primary",
          },
          {
            label: t("Team volume"),
            value: money(teamVolume),
            icon: TrendingUp,
            tone: "text-foreground",
          },
          {
            label: t("Referral income"),
            value: money(user.referralEarnings),
            icon: Sparkle,
            tone: "text-gold",
          },
        ].map((s) => (
          <GlassCard key={s.label} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="h-3.5 w-3.5" />
              <p className="truncate text-[10px] font-semibold uppercase tracking-widest">
                {s.label}
              </p>
            </div>
            <p className={cn("mt-2 truncate font-display text-xl font-extrabold sm:text-2xl", s.tone)}>
              {s.value}
            </p>
          </GlassCard>
        ))}
      </div>

      {/* Level ladder */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {db.settings.levels.map((rate, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={cn(
              "glass rounded-2xl p-4 text-left transition hover:-translate-y-0.5",
              tab === i && "ring-2 ring-primary/60",
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("Level")} {i + 1}
              </p>
              <span className="font-display text-lg font-extrabold text-gradient">{rate}%</span>
            </div>
            <p className="mt-2 text-sm font-semibold">
              {levels[i].length} {t("members")}
            </p>
            <p className="text-xs text-success">{money(levelEarnings[i])}</p>
          </button>
        ))}
      </div>

      {/* Members */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-lg font-extrabold">
            {t("Level")} {tab + 1} {t("members")}
          </p>
          <span className="rounded-full glass-soft px-3 py-1 text-xs font-semibold">
            {levels[tab].length}
          </span>
        </div>

        <div className="mt-4 divide-y divide-border/40">
          {levels[tab].length === 0 ? (
            <div className="py-10 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm text-muted-foreground">
                {t("No members at this level yet — share your link to grow your team.")}
              </p>
              <button
                onClick={share}
                className="btn-glass btn-glass-primary mx-auto mt-4 flex h-11 items-center gap-2 rounded-2xl px-5 text-sm font-semibold"
              >
                <Share2 className="h-4 w-4" /> {t("Share")}
              </button>
            </div>
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
                      {new Date(m.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold">{money(m.invested)}</p>
                  <p className="text-xs text-success">
                    +{money((m.invested * db.settings.levels[tab]) / 100)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {/* Live support */}
      <button
        onClick={() => setChatOpen(true)}
        className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left transition hover:-translate-y-0.5"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
          <Headset className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t("Live support chat")}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {t("Questions about your team or commission? Chat with us.")}
          </span>
        </span>
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-success" />
      </button>
    </div>
  );
}
