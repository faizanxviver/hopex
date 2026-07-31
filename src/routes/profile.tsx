import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { IdCard, Upload } from "lucide-react";
import { AuthGuard, DashboardLayout } from "@/components/dashboard-layout";
import { GlassCard, SectionTitle } from "@/components/glass";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — Aurum Capital" },
      { name: "description", content: "Update your profile, complete KYC, manage security and notification preferences." },
      { property: "og:title", content: "Profile & Settings — Aurum Capital" },
      { property: "og:description", content: "Account, KYC and security settings." },
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
  const { user, update } = useStore();
  const [form, setForm] = useState({ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" });
  const [pwd, setPwd] = useState({ current: "", next: "" });
  const [prefs, setPrefs] = useState({ email: true, push: true, marketing: false });
  const [docs, setDocs] = useState({ front: "", back: "" });

  if (!user) return null;

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
      <SectionTitle title="Profile & settings" subtitle="Manage your identity, security and preferences." />

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h2 className="text-lg font-bold">Personal details</h2>
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
            <button className="h-12 w-full rounded-xl gradient-brand font-semibold text-primary-foreground">
              Save changes
            </button>
          </form>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">KYC verification</h2>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold capitalize text-primary">
              {user.kyc.replace("_", " ")}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload a government ID (front and back) to unlock higher withdrawal limits.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["front", "back"] as const).map((side) => (
              <label
                key={side}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground"
              >
                <IdCard className="h-6 w-6" />
                <span className="truncate">{docs[side] || `ID card ${side}`}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setDocs((d) => ({ ...d, [side]: e.target.files?.[0]?.name ?? "" }))}
                />
              </label>
            ))}
          </div>
          <button
            onClick={() => {
              if (!docs.front || !docs.back) return toast.error("Upload both sides of your ID.");
              update((d) => {
                const me = d.users.find((u) => u.id === user.id)!;
                me.kyc = "pending";
                return d;
              });
              toast.success("KYC documents submitted for review.");
            }}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl gradient-cool font-semibold text-primary-foreground"
          >
            <Upload className="h-4 w-4" /> Submit for review
          </button>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-bold">Security</h2>
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
              onClick={() => {
                if (pwd.current !== user.password) return toast.error("Current password is incorrect.");
                if (pwd.next.length < 6) return toast.error("New password must be at least 6 characters.");
                update((d) => {
                  const me = d.users.find((u) => u.id === user.id)!;
                  me.password = pwd.next;
                  return d;
                });
                setPwd({ current: "", next: "" });
                toast.success("Password changed.");
              }}
              className="h-12 w-full rounded-xl gradient-brand font-semibold text-primary-foreground"
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
          <h2 className="text-lg font-bold">Preferences</h2>
          <div className="mt-4 space-y-3">
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
            <div className="rounded-xl glass-soft px-4 py-3">
              <p className="mb-2 text-sm font-medium">Language</p>
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
                        ? "rounded-lg gradient-cool px-4 py-1.5 text-xs font-semibold text-primary-foreground"
                        : "rounded-lg glass-soft px-4 py-1.5 text-xs font-semibold text-muted-foreground"
                    }
                  >
                    {l === "en" ? "English" : "اردو"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
