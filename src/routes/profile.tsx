import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Languages,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
  Wallet,
  Smartphone,
  BadgeCheck,
} from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Profile & Settings — HopeX" },
      {
        name: "description",
        content: "View your account details, manage your payout account, password, theme and language.",
      },
      { property: "og:title", content: "Profile & Settings — HopeX" },
      { property: "og:description", content: "Account, payout account and preference settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AuthGuard>
      <DashboardLayout>
        <Profile />
      </DashboardLayout>
    </AuthGuard>
  ),
});

/** Only these two wallets are supported for payouts. */
export const PAYOUT_METHODS = [
  { id: "JazzCash", icon: Smartphone },
  { id: "Easypaisa", icon: Wallet },
] as const;

function Profile() {
  const { user, update, theme, toggleTheme } = useStore();
  const { t } = useT();
  const [pwd, setPwd] = useState({ current: "", next: "" });

  if (!user) return null;

  return (
    <div>
      <SectionTitle
        title={t("Profile & settings")}
        subtitle={t("Your account details, payout account and preferences.")}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Personal details — read only */}
        <GlassCard>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-brand font-display font-black text-primary-foreground">
              {user.name[0]}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold">{t("Personal details")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("Locked for your security — contact support to change these.")}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {[
              { label: t("Full name"), value: user.name, icon: UserRound },
              { label: t("Mobile number"), value: user.phone ?? "—", icon: Smartphone },
              { label: t("Referral code"), value: user.referralCode, icon: BadgeCheck },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3 rounded-2xl glass-soft px-4 py-3">
                <f.icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] uppercase tracking-widest text-muted-foreground">
                    {f.label}
                  </span>
                  <span className="block truncate text-sm font-semibold">{f.value}</span>
                </span>
                <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Payout account */}
        <PayoutAccountCard />

        {/* Security */}
        <GlassCard>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="h-4 w-4 text-primary" /> {t("Security")}
          </h2>
          <div className="mt-4 space-y-3">
            <input
              type="password"
              placeholder={t("Current password")}
              value={pwd.current}
              onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              placeholder={t("New password")}
              value={pwd.next}
              onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={async () => {
                if (pwd.next.length < 6)
                  return toast.error("New password must be at least 6 characters.");
                const { error: signInError } = await supabase.auth.signInWithPassword({
                  email: user.email,
                  password: pwd.current,
                });
                if (signInError) return toast.error("Current password is incorrect.");
                const { error } = await supabase.auth.updateUser({ password: pwd.next });
                if (error) return toast.error(error.message);
                setPwd({ current: "", next: "" });
                toast.success("Password changed.");
              }}
              className="btn-glass btn-glass-primary flex h-12 w-full items-center justify-center font-semibold"
            >
              {t("Change password")}
            </button>
          </div>
        </GlassCard>

        {/* Preferences */}
        <GlassCard>
          <h2 className="text-lg font-bold">{t("Preferences")}</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl glass-soft px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </span>
                <p className="text-sm font-semibold">
                  {theme === "dark" ? t("Light mode") : t("Dark mode")}
                </p>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </div>

            <div className="rounded-xl glass-soft px-4 py-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Languages className="h-4 w-4" /> {t("Language")}
              </p>
              <div className="flex gap-2">
                {(
                  [
                    { id: "en", label: "English" },
                    { id: "ur", label: "اردو" },
                  ] as const
                ).map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      update((d) => {
                        const me = d.users.find((u) => u.id === user.id)!;
                        me.language = l.id;
                        return d;
                      });
                      toast.success(l.id === "ur" ? "زبان اردو کر دی گئی۔" : "Language set to English.");
                    }}
                    className={cn(
                      "flex-1 rounded-xl py-2.5 text-sm font-semibold transition",
                      user.language === l.id
                        ? "btn-glass btn-glass-primary"
                        : "glass-soft text-muted-foreground",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <Link
              to="/investments"
              className="btn-glass flex h-12 items-center justify-center text-sm font-semibold text-foreground"
            >
              {t("Active plans")}
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

/** Bind / change the single account every payout is sent to. */
export function PayoutAccountCard() {
  const { user, update } = useStore();
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [method, setMethod] = useState<string>(user?.bankName || PAYOUT_METHODS[0].id);
  const [holder, setHolder] = useState(user?.accountName ?? "");
  const [account, setAccount] = useState(user?.accountNumber ?? "");

  if (!user) return null;
  const bound = Boolean(user.accountNumber && user.accountName);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (holder.trim().length < 3) return toast.error("Enter the account holder name.");
    if (!/^\d{10,15}$/.test(account.trim().replace(/\D/g, "")))
      return toast.error("Enter a valid mobile account number.");
    update((d) => {
      const me = d.users.find((u) => u.id === user.id)!;
      me.bankName = method;
      me.accountName = holder.trim();
      me.accountNumber = account.trim();
      return d;
    });
    setEditing(false);
    toast.success("Payout account saved.");
  };

  return (
    <GlassCard>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Wallet className="h-4 w-4 text-gold" /> {t("Payout account")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("Every withdrawal is sent to this account only.")}
      </p>

      {bound && !editing ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl glass-soft p-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {user.bankName}
            </p>
            <p className="mt-1 font-display text-lg font-extrabold">{user.accountName}</p>
            <p className="font-mono text-sm text-muted-foreground">{user.accountNumber}</p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="btn-glass flex h-11 w-full items-center justify-center text-sm font-semibold text-foreground"
          >
            {t("Change account")}
          </button>
        </div>
      ) : (
        <form onSubmit={save} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {PAYOUT_METHODS.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border p-3 text-left text-sm font-semibold transition",
                  method === m.id ? "border-primary bg-primary/10" : "border-border glass-soft",
                )}
              >
                <m.icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{m.id}</span>
              </button>
            ))}
          </div>
          <input
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
            placeholder={t("Account holder name")}
            className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            inputMode="numeric"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="03XXXXXXXXX"
            className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            {bound ? (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn-glass flex h-12 flex-1 items-center justify-center text-sm font-semibold text-foreground"
              >
                {t("Cancel")}
              </button>
            ) : null}
            <button className="btn-glass btn-glass-primary flex h-12 flex-1 items-center justify-center text-sm font-bold">
              {t("Save account")}
            </button>
          </div>
        </form>
      )}
    </GlassCard>
  );
}
