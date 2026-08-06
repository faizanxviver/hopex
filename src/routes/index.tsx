import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  ChartLine,
  Lock,
  ShieldCheck,
  UsersRound,
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
import { WithdrawalProofsCarousel } from "@/components/withdrawal-proofs";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HopeX — Premium Investment Platform" },
      {
        name: "description",
        content:
          "Grow capital with transparent daily ROI plans, instant deposits and payouts, and a 4-level referral program built for serious investors.",
      },
      { property: "og:title", content: "HopeX — Premium Investment Platform" },
      {
        property: "og:description",
        content: "Daily ROI plans, secure wallet, and a 4-level affiliate program.",
      },
      { property: "og:url", content: "https://hopex.site/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://hopex.site/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "HopeX",
          url: "https://hopex.site",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            [
              "When do I get my first income?",
              "Immediately — day 1 income is credited the moment your plan activates, then every 24 hours automatically.",
            ],
            ["How fast are payouts?", "Most payouts settle within 2 hours. An active plan is required to withdraw."],
            ["Is my principal returned?", "Yes — principal returns to your balance when the plan matures."],
            [
              "Which payment methods work?",
              "Bank transfer, USDT (TRC20/ERC20), JazzCash and EasyPaisa.",
            ],
          ].map(([q, a]) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }),
      },
    ],
  }),
  component: Landing,
});

const steps = [
  { icon: Wallet, title: "Fund", body: "Deposit via bank, USDT, JazzCash or EasyPaisa." },
  { icon: ChartLine, title: "Activate", body: "Pick a plan — your first income lands instantly." },
  { icon: UsersRound, title: "Multiply", body: "Earn across 4 referral levels on every purchase." },
];

function Landing() {
  const { db, user } = useStore();
  const plans = db.plans.filter((p) => p.active).slice(0, 4);

  return (
    <div className="relative min-h-screen">
      <div className="aurora" />

      <header className="sticky top-0 z-40 glass-soft rounded-none">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
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
              className="btn-glass btn-glass-primary px-5 py-2 text-sm font-bold"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-12 text-center">
        <span className="animate-rise inline-flex items-center gap-2 rounded-full glass-soft px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <BadgeCheck className="h-3.5 w-3.5 text-gold" /> Trusted by 42,000+ investors
        </span>
        <h1 className="animate-rise mx-auto mt-5 max-w-3xl font-display text-4xl font-black leading-[1.05] sm:text-6xl">
          Capital that compounds <span className="text-gradient">every single day.</span>
        </h1>
        <p className="animate-rise mx-auto mt-4 max-w-lg text-base text-muted-foreground">
          Daily ROI credited automatically every 24 hours, fast payouts and four levels of affiliate
          income.
        </p>
        <div className="animate-rise mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="btn-glass btn-glass-primary inline-flex items-center gap-2 px-7 py-3.5 text-base font-bold"
          >
            Start investing <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#plans" className="btn-glass px-7 py-3.5 text-base font-bold text-foreground">
            View plans
          </a>
        </div>

        <div className="mt-9 grid gap-3 sm:grid-cols-3">
          {[
            { k: "Rs 5.2B+", v: "Assets under management" },
            { k: "3.1%", v: "Peak daily ROI" },
            { k: "< 2 hrs", v: "Average payout time" },
          ].map((s) => (
            <GlassCard key={s.k} className="p-5">
              <p className="font-display text-2xl font-black text-gradient">{s.k}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.v}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* How it works — condensed to three moves */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {steps.map((s, i) => (
            <GlassCard key={s.title} className="flex items-start gap-3 p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <s.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gold">
                  Step {i + 1}
                </p>
                <h2 className="text-sm font-bold">{s.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-center font-display text-3xl font-black">Investment plans</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Principal returned at maturity. No hidden fees.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p, i) => (
            <GlassCard key={p.id} glow={i === 2} className={i === 2 ? "border-gold/40 p-5" : "p-5"}>
              <h3 className="font-display text-base font-extrabold">{p.name}</h3>
              <p className="mt-2 font-display text-3xl font-black text-gradient">{p.dailyRoi}%</p>
              <p className="text-xs text-muted-foreground">daily · {p.durationDays} days</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Rs {p.min.toLocaleString("en-PK")} – Rs {p.max.toLocaleString("en-PK")}
              </p>
              <Link
                to="/plans"
                className="btn-glass btn-glass-primary mt-4 block px-4 py-2.5 text-center text-sm font-bold"
              >
                Invest now
              </Link>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Referral + trust + FAQ in one band */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard className="p-6">
            <h2 className="font-display text-2xl font-black">
              4 levels of <span className="text-gradient">referral income</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Commission is paid the moment anyone in your network activates a plan.
            </p>
            <div className="mt-5 grid grid-cols-4 gap-2">
              {[
                ["L1", "10%"],
                ["L2", "2%"],
                ["L3", "1%"],
                ["L4", "4%"],
              ].map(([l, v]) => (
                <div key={l} className="rounded-2xl glass-soft p-3 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</p>
                  <p className="mt-1 font-display text-lg font-black text-gold">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-2">
              {[
                { icon: ShieldCheck, t: "Segregated custody" },
                { icon: Lock, t: "256-bit encryption" },
                { icon: BadgeCheck, t: "Audited monthly" },
              ].map((x) => (
                <p key={x.t} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <x.icon className="h-4 w-4 shrink-0 text-gold" /> {x.t}
                </p>
              ))}
            </div>
          </GlassCard>

          <div>
            <h2 className="font-display text-2xl font-black">FAQ</h2>
            <Accordion type="single" collapsible className="mt-3 rounded-3xl glass px-6">
              {[
                [
                  "When do I get my first income?",
                  "Immediately — day 1 income is credited the moment your plan activates, then every 24 hours automatically.",
                ],
                [
                  "How fast are payouts?",
                  "Most payouts settle within 2 hours. An active plan is required to withdraw.",
                ],
                [
                  "Is my principal returned?",
                  "Yes — principal returns to your balance when the plan matures.",
                ],
                [
                  "Which payment methods work?",
                  "Bank transfer, USDT (TRC20/ERC20), JazzCash and EasyPaisa.",
                ],
              ].map(([q, a]) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger className="text-left text-sm font-semibold">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Proofs Carousel */}
      {db.settings.showProofsSection && (
        <section className="mx-auto max-w-6xl px-4 py-12 overflow-hidden">
          <h2 className="text-center font-display text-2xl font-black mb-8">Verified Payouts</h2>
          <div className="flex gap-4 animate-scroll hover:pause-scroll">
            {/* Mock or actual proofs */}
            {[...Array(10)].map((_, i) => (
              <GlassCard 
                key={i} 
                className="w-48 h-64 shrink-0 p-0 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                onClick={() => {}}
              >
                <div className="h-full w-full bg-muted flex items-center justify-center relative group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-[10px] text-white font-bold truncate">
                    Verified Payout Rs {(Math.random() * 50000 + 500).toFixed(0)}
                  </div>
                  <ShieldCheck className="h-12 w-12 text-success/20 group-hover:text-success/40 transition-colors" />
                </div>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-border/50 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["About", "Terms", "Privacy", "Support"].map((l) => (
              <a key={l} href="#" className="transition hover:text-foreground">
                {l}
              </a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">© 2026 HopeX. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
