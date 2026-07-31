import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import { GlassCard } from "@/components/glass";
import { Brand } from "@/components/dashboard-layout";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — HopeX" },
      {
        name: "description",
        content: "Request a secure password reset link for your HopeX account.",
      },
      { property: "og:title", content: "Reset your password — HopeX" },
      { property: "og:description", content: "Request a secure password reset link." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const { resetPassword } = useStore();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <div className="aurora" />
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Brand />
          <Link
            to="/auth"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
        <GlassCard className="p-7">
          {sent ? (
            <div className="animate-rise text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/15 text-success">
                <Mail className="h-6 w-6" />
              </span>
              <h1 className="mt-4 font-display text-2xl font-extrabold">Check your inbox</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                If an account exists for <b>{email}</b>, a reset link is on its way. (Email delivery
                is
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-extrabold">Forgot password?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your email and we&apos;ll send a secure reset link.
              </p>
              <form
                className="mt-6 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!email.includes("@")) return toast.error("Enter a valid email address.");
                  const error = await resetPassword(email);
                  if (error) return toast.error(error);
                  setSent(true);
                  toast.success("Reset link sent — check your inbox.");
                }}
              >
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="h-12 w-full rounded-xl border border-input bg-background/40 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button className="h-12 w-full rounded-xl gradient-brand font-semibold text-primary-foreground">
                  Send reset link
                </button>
              </form>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
