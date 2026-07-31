import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  ChartLine,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { GlassCard } from "@/components/glass";
import { Brand } from "@/components/dashboard-layout";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aurum Capital — Premium Investment Platform" },
      {
        name: "description",
        content:
          "Grow capital with transparent daily ROI plans, instant deposits and withdrawals, and a 4-level referral program built for serious investors.",
      },
      { property: "og:title", content: "Aurum Capital — Premium Investment Platform" },
      {
        property: "og:description",
        content: "Daily ROI plans, secure wallet, and a 4-level affiliate program.",
      },
    ],
  }),
  component: Landing,
});

const steps = [
  { icon: Wallet, title: "Fund your wallet", body: "Deposit via bank, USDT, JazzCash or EasyPaisa in minutes." },
  { icon: ChartLine, title: "Choose a plan", body: "Pick a duration and ROI that matches your risk appetite." },
  { icon: Sparkles, title: "Earn daily", body: "Returns accrue every day and settle to your available balance." },
  { icon: Users, title: "Refer & multiply", body: "Earn across 4 referral levels — 10%, 2%, 1% and 4%." },
];

function Landing() {
  const { db, user } = useStore();
  const plans = db.plans.filter((p) => p.active).slice(0, 4);

  return (
    <div className="relative min-h-screen">
      <div className="aurora" />

      <header className="sticky top-0 z-40 glass-soft rounded-none">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
          <Brand />
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={user ? "/dashboard" : "/auth"}
              className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {user ? "Dashboard" : "Sign in"}
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="rounded-xl gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-12 text-center sm:pt-16">
        <span className="animate-rise inline-flex items-center gap-2 rounded-full glass-soft px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <BadgeCheck className="h-3.5 w-3.5 text-gold" /> Trusted by 42,000+ investors in 38 countries
        </span>
        <h1 className="animate-rise mx-auto mt-5 max-w-4xl font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
          Capital that compounds <span className="text-gradient">every single day.</span>
        </h1>
        <p className="animate-rise mx-auto mt-4 max-w-xl text-base text-muted-foreground">
          Transparent daily ROI, instant deposits, 2-hour payouts and four levels of affiliate income.
        </p>
        <div className="animate-rise mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-2 rounded-2xl gradient-brand px-6 py-3 font-semibold text-primary-foreground glow transition hover:scale-[1.02]"
          >
            Start investing <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#plans" className="rounded-2xl glass px-6 py-3 font-semibold transition hover:-translate-y-0.5">
            View plans
          </a>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            { k: "$184M+", v: "Assets under management" },
            { k: "3.1%", v: "Peak daily ROI (VIP)" },
            { k: "< 2 hrs", v: "Average withdrawal time" },
          ].map((s) => (
            <GlassCard key={s.k} className="p-5">
              <p className="font-display text-3xl font-extrabold text-gradient">{s.k}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.v}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <GlassCard key={s.title} className="flex items-start gap-3 p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <s.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gold">Step {i + 1}</p>
                <h3 className="text-sm font-bold">{s.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section id="plans" className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-center font-display text-3xl font-extrabold sm:text-4xl">Investment plans</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Principal returned at maturity. No hidden fees.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p, i) => (
            <GlassCard key={p.id} glow={i === 2} className={i === 2 ? "border-gold/40 p-5" : "p-5"}>
              {i === 2 ? (
                <span className="mb-2 inline-block rounded-full bg-gold/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gold">
                  Most popular
                </span>
              ) : null}
              <h3 className="font-display text-lg font-extrabold">{p.name}</h3>
              <p className="mt-2 font-display text-4xl font-extrabold text-gradient">{p.dailyRoi}%</p>
              <p className="text-xs text-muted-foreground">daily ROI · {p.durationDays} days</p>
              <p className="mt-3 text-sm text-muted-foreground">
                ${p.min.toLocaleString()} – ${p.max.toLocaleString()}
              </p>
              <Link
                to="/plans"
                className="mt-4 block rounded-xl gradient-cool px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
              >
                Invest now
              </Link>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <GlassCard className="grid gap-6 p-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              A referral engine with <span className="text-gradient">4 levels of income</span>
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Commission is paid automatically whenever anyone in your network purchases a plan — up to
              four levels deep.
            </p>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl gradient-brand px-6 py-3 font-semibold text-primary-foreground"
            >
              Claim your link <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              ["L1", "10%"],
              ["L2", "2%"],
              ["L3", "1%"],
              ["L4", "4%"],
            ].map(([l, v]) => (
              <div key={l} className="rounded-2xl glass-soft p-4 text-center">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{l}</p>
                <p className="mt-1 font-display text-2xl font-extrabold text-gold">{v}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">FAQ</h2>
            <Accordion type="single" collapsible className="mt-4 rounded-3xl glass px-6">
              {[
                ["How fast are withdrawals processed?", "Most withdrawals settle within 2 hours. An active investment plan is required to withdraw."],
                ["Is my principal returned?", "Yes — principal is credited back to your available balance when the plan matures."],
                ["What payment methods are supported?", "Bank transfer, USDT (TRC20/ERC20), JazzCash and EasyPaisa."],
                ["Do I need KYC?", "KYC is required before your first withdrawal above $1,000."],
              ].map(([q, a]) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger className="text-left text-sm font-semibold">{q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <div className="grid content-start gap-3">
            {[
              { icon: ShieldCheck, t: "Segregated custody", b: "Client funds held in segregated treasury wallets." },
              { icon: Lock, t: "256-bit encryption", b: "Bank-grade encryption on every session and payout." },
              { icon: BadgeCheck, t: "Audited monthly", b: "Independent proof-of-reserve reporting." },
            ].map((x) => (
              <GlassCard key={x.t} className="flex items-start gap-3 p-5">
                <x.icon className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                <div>
                  <p className="font-semibold">{x.t}</p>
                  <p className="text-sm text-muted-foreground">{x.b}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>


      <footer className="border-t border-border/50 px-4 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["About", "Terms", "Privacy", "Support"].map((l) => (
              <a key={l} href="#" className="transition hover:text-foreground">
                {l}
              </a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Aurum Capital. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
