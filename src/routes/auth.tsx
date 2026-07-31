import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Apple, Chrome, Loader2, Lock, Mail, User as UserIcon } from "lucide-react";
import { GlassCard } from "@/components/glass";
import { Brand } from "@/components/dashboard-layout";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Search = { mode?: "login" | "signup"; ref?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "signup" ? "signup" : "login",
    ref: typeof s.ref === "string" ? s.ref : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in or create an account — Aurum Capital" },
      { name: "description", content: "Access your Aurum Capital investment wallet, plans and referral dashboard." },
      { property: "og:title", content: "Sign in — Aurum Capital" },
      { property: "og:description", content: "Secure access to your Aurum Capital investment account." },
    ],
  }),
  component: AuthPage,
});

function Field({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: typeof Mail }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        {...props}
        className="h-12 w-full rounded-xl border border-input bg-background/40 pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function AuthPage() {
  const { mode, ref } = Route.useSearch();
  const navigate = useNavigate();
  const { login, signup } = useStore();
  const isSignup = mode === "signup";
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", ref: ref ?? "" });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.includes("@") || form.password.length < 6) {
      toast.error("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    if (isSignup && form.name.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }
    setLoading(true);
    const error = isSignup
      ? await signup(form.name.trim(), form.email.trim(), form.password, form.ref.trim())
      : await login(form.email, form.password);
    setLoading(false);
    if (error) return toast.error(error);
    if (isSignup) toast.success("Account created — welcome to Aurum Capital!");
    else toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };


  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-10">
      <div className="aurora" />
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Brand />
          <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>

        <GlassCard className="p-7" glow>
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-secondary/50 p-1">
            {(["login", "signup"] as const).map((m) => (
              <Link
                key={m}
                to="/auth"
                search={{ mode: m }}
                className={cn(
                  "rounded-xl py-2 text-center text-sm font-semibold transition",
                  mode === m ? "gradient-cool text-primary-foreground shadow" : "text-muted-foreground",
                )}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </Link>
            ))}
          </div>

          <h1 key={mode} className="animate-rise font-display text-2xl font-extrabold">
            {isSignup ? "Start earning today" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup ? "Create your investor account in seconds." : "Sign in to your investment wallet."}
          </p>

          <form key={mode + "-form"} onSubmit={submit} className="animate-rise mt-6 space-y-3">
            {isSignup ? (
              <Field icon={UserIcon} placeholder="Full name" value={form.name} onChange={set("name")} />
            ) : null}
            <Field icon={Mail} type="email" placeholder="Email address" value={form.email} onChange={set("email")} />
            <Field icon={Lock} type="password" placeholder="Password" value={form.password} onChange={set("password")} />
            {isSignup ? (
              <Field icon={UserIcon} placeholder="Referral code (optional)" value={form.ref} onChange={set("ref")} />
            ) : (
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs font-medium text-primary">
                  Forgot password?
                </Link>
              </div>
            )}
            <button
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl gradient-brand font-semibold text-primary-foreground transition hover:scale-[1.01] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Protected by bank-grade encryption. By continuing you agree to our terms and privacy policy.
          </p>

        </GlassCard>
      </div>
    </div>
  );
}
