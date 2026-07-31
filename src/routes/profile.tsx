import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Calculator, Languages, Moon, Sun } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { Switch } from "@/components/ui/switch";
import { money, useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — HopeX" },
      { name: "description", content: "Update your profile, manage security, language, theme and notification preferences." },
      { property: "og:title", content: "Profile & Settings — HopeX" },
      { property: "og:description", content: "Account, security and preference settings." },
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

function Profile() {
  const { user, update, theme, toggleTheme } = useStore();
  const { t } = useT();
  const [form, setForm] = useState({ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" });
  const [pwd, setPwd] = useState({ current: "", next: "" });
  const [prefs, setPrefs] = useState({ email: true, push: true, marketing: false });
  const [calc, setCalc] = useState({ amount: "1000", roi: "2.4", days: "60" });

  if (!user) return null;

  const profit = (Number(calc.amount) || 0) * ((Number(calc.roi) || 0) / 100) * (Number(calc.days) || 0);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    update((d) => {
      const me = d.users.find((u) => u.id === user.id)!;
      me.name = form.name;
      me.email = form.email;
      me.phone = form.phone;
      return d;
    });
    toast.success("Profile updated.");
  };

  return (
    <div>
      <SectionTitle title={t("Profile & settings")} subtitle="Manage your identity, security and preferences." />

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h2 className="text-lg font-bold">{t("Personal details")}</h2>
          <form onSubmit={save} className="mt-4 space-y-3">
            {(["name", "email", "phone"] as const).map((k) => (
              <div key={k}>
                <label className="mb-1.5 block text-xs font-semibold capitalize text-muted-foreground">{k}</label>
                <input
                  value={form[k]}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
            <button className="btn-glass btn-glass-primary h-12 w-full font-semibold">{t("Save")}</button>
          </form>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-bold">{t("Security")}</h2>
          <div className="mt-4 space-y-3">
            <input
              type="password"
              placeholder="Current password"
              value={pwd.current}
              onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              placeholder="New password"
              value={pwd.next}
              onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={async () => {
                if (pwd.next.length < 6) return toast.error("New password must be at least 6 characters.");
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
              className="btn-glass btn-glass-primary h-12 w-full font-semibold"
            >
              Change password
            </button>

            <div className="flex items-center justify-between rounded-xl glass-soft px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Two-factor authentication</p>
                <p className="text-xs text-muted-foreground">Extra layer of login protection</p>
              </div>
              <Switch
                checked={user.twoFactor}
                onCheckedChange={(v) => {
                  update((d) => {
                    const me = d.users.find((u) => u.id === user.id)!;
                    me.twoFactor = v;
                    return d;
                  });
                  toast.success(`2FA ${v ? "enabled" : "disabled"}.`);
                }}
              />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-bold">{t("Preferences")}</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl glass-soft px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </span>
                <p className="text-sm font-semibold">{theme === "dark" ? t("Light mode") : t("Dark mode")}</p>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </div>

            <div className="rounded-xl glass-soft px-4 py-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Languages className="h-4 w-4" /> {t("Language")}
              </p>
              <div className="flex gap-2">
                {(["en", "ur"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      update((d) => {
                        const me = d.users.find((u) => u.id === user.id)!;
                        me.language = l;
                        return d;
                      });
                      toast.success(l === "en" ? "Language set to English." : "زبان اردو پر سیٹ کر دی گئی۔");
                    }}
                    className={
                      user.language === l
                        ? "btn-glass btn-glass-primary px-4 py-1.5 text-xs font-semibold"
                        : "btn-glass px-4 py-1.5 text-xs font-semibold text-muted-foreground"
                    }
                  >
                    {l === "en" ? "English" : "اردو"}
                  </button>
                ))}
              </div>
            </div>

            {(
              [
                ["email", "Email notifications"],
                ["push", "In-app notifications"],
                ["marketing", "Product & promo updates"],
              ] as const
            ).map(([k, label]) => (
              <div key={k} className="flex items-center justify-between rounded-xl glass-soft px-4 py-3">
                <p className="text-sm font-medium">{label}</p>
                <Switch checked={prefs[k]} onCheckedChange={(v) => setPrefs((p) => ({ ...p, [k]: v }))} />
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Calculator className="h-4 w-4 text-primary" /> {t("Profit calculator")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(
              [
                ["amount", "Amount (USD)"],
                ["roi", "Daily ROI (%)"],
                ["days", "Duration (days)"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="text-xs text-muted-foreground">
                {label}
                <input
                  type="number"
                  value={calc[k]}
                  onChange={(e) => setCalc((c) => ({ ...c, [k]: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-background/40 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Projected profit: <b className="text-success">{money(profit)}</b> · total return{" "}
            <b className="text-gold">{money(profit + (Number(calc.amount) || 0))}</b>
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
