import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Lock, Phone, User as UserIcon, Gift } from "lucide-react";
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
      { title: "Sign in or create an account — HopeX" },
      {
        name: "description",
        content: "Access your HopeX investment wallet, plans and referral dashboard.",
      },
      { property: "og:title", content: "Sign in — HopeX" },
      { property: "og:description", content: "Secure access to your HopeX investment account." },
    ],
  }),
  component: AuthPage,
});

function Field({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: typeof Phone }) {
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
  const [form, setForm] = useState({ name: "", phone: "", password: "", ref: ref ?? "" });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 10 || form.password.length < 6) {
      toast.error("Enter a valid mobile number and a password of at least 6 characters.");
      return;
    }
    if (isSignup && form.name.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }
    setLoading(true);
    const error = isSignup
      ? await signup(form.name.trim(), form.phone.trim(), form.password, form.ref.trim())
      : await login(form.phone.trim(), form.password);
    setLoading(false);
    if (error) {
      return toast.error(
        error.toLowerCase().includes("invalid login")
          ? "Wrong mobile number or password."
          : error.replace(/email/gi, "mobile number"),
      );
    }
    if (isSignup) toast.success("Account created — welcome to HopeX!");
    else toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-10">
      <div className="aurora" />
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Brand />
          <Link
            to="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
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
                  mode === m
                    ? "gradient-cool text-primary-foreground shadow"
                    : "text-muted-foreground",
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
            {isSignup
              ? "Just your name and mobile number — your account is verified instantly."
              : "Sign in with your mobile number."}
          </p>

          <form key={mode + "-form"} onSubmit={submit} className="animate-rise mt-6 space-y-3">
            {isSignup ? (
              <Field
                icon={UserIcon}
                placeholder="Full name"
                value={form.name}
                onChange={set("name")}
              />
            ) : null}
            <Field
              icon={Phone}
              type="tel"
              inputMode="tel"
              placeholder="Mobile number (03XX XXXXXXX)"
              value={form.phone}
              onChange={set("phone")}
            />
            <Field
              icon={Lock}
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={set("password")}
            />
            {isSignup ? (
              <Field
                icon={Gift}
                placeholder="Referral code (optional)"
                value={form.ref}
                onChange={set("ref")}
              />
            ) : null}
            <button
              disabled={loading}
              className="btn-glass btn-glass-primary flex h-12 w-full items-center justify-center gap-2 text-base font-bold disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Protected by bank-grade encryption. By continuing you agree to our terms and privacy
            policy.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
