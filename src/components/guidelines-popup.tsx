import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Headphones,
  Info,
  PiggyBank,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { money, useStore, type GuidelineItem } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Info> = {
  deposit: ArrowDownToLine,
  withdraw: ArrowUpFromLine,
  invest: PiggyBank,
  fast: Zap,
  support: Headphones,
  secure: ShieldCheck,
  verified: BadgeCheck,
  info: Info,
};

export const GUIDELINE_ICON_KEYS = Object.keys(ICONS);

const TONES: Record<string, string> = {
  primary: "bg-primary/12 text-primary",
  success: "bg-success/12 text-success",
  gold: "bg-gold/15 text-gold",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/12 text-destructive",
};

export const GUIDELINE_TONES = Object.keys(TONES);

const hour12 = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;

/** Replaces live tokens so the popup always shows current platform numbers. */
export function useGuidelineTokens() {
  const { db } = useStore();
  const prices = db.plans.filter((p) => p.active !== false).map((p) => p.price);
  const minPlan = prices.length ? Math.min(...prices) : db.settings.minDeposit;
  const s = db.settings;
  const map: Record<string, string> = {
    "{minDeposit}": money(s.minDeposit),
    "{minWithdraw}": money(s.minWithdraw),
    "{minPlan}": money(minPlan),
    "{withdrawWindow}": `${hour12(s.withdrawOpenHour)} - ${hour12(s.withdrawCloseHour)}`,
    "{siteName}": s.siteName,
  };
  return (input: string) =>
    Object.entries(map).reduce((acc, [k, v]) => acc.split(k).join(v), input ?? "");
}

export function GuidelinesPopup() {
  const { db } = useStore();
  const { t } = useT();
  const fill = useGuidelineTokens();
  const [open, setOpen] = useState(false);

  const items: GuidelineItem[] = db.settings.guidelines ?? [];
  const active = db.settings.guidelinesActive && items.length > 0;
  const stamp = JSON.stringify([db.settings.guidelinesTitle, items]).length;

  useEffect(() => {
    if (!active) return;
    const key = `hopex-guidelines-${stamp}`;
    const seen = localStorage.getItem(key);
    const today = new Date().toDateString();
    if (seen === today) return;
    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, [active, stamp]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!active || !open) return null;

  const dismiss = () => {
    localStorage.setItem(`hopex-guidelines-${stamp}`, new Date().toDateString());
    setOpen(false);
  };

  const channel = (db.settings.supportLinks ?? []).find((l) =>
    l.label.toLowerCase().includes("channel"),
  );

  return (
    <div
      className="fixed inset-0 z-[130] flex h-[100dvh] items-center justify-center overflow-y-auto overscroll-contain bg-foreground/45 px-4 py-6 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-rise my-auto w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-border/50 bg-card shadow-[var(--shadow-elegant)]"
      >
        {/* Header */}
        <div className="relative overflow-hidden gradient-brand px-6 py-7 text-center text-primary-foreground">
          <span className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="relative">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/15 backdrop-blur-md">
              {db.settings.siteLogo ? (
                <img
                  src={db.settings.siteLogo}
                  alt={db.settings.siteName}
                  className="h-10 w-10 rounded-xl object-contain"
                />
              ) : (
                <span className="font-display text-2xl font-black">
                  {db.settings.siteName.slice(0, 1)}
                </span>
              )}
            </span>
            <h2 className="mt-3 font-display text-2xl font-black">{db.settings.siteName}</h2>
            <p className="text-xs opacity-80">{t(db.settings.guidelinesTitle)}</p>
          </div>
        </div>

        {/* Items */}
        <div className="max-h-[52dvh] space-y-4 overflow-y-auto px-5 py-5">
          {items.map((g, i) => {
            const Icon = ICONS[g.icon] ?? Info;
            return (
              <div key={i} className="flex items-start gap-3">
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
                    TONES[g.tone] ?? TONES.primary,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-black leading-tight">{fill(g.title)}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {fill(g.text)}
                  </p>
                </div>
              </div>
            );
          })}

          {channel?.url ? (
            <a
              href={channel.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-2xl bg-success/10 p-3"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
                <BadgeCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-success">{channel.label}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {t("Updates, guides & announcements")}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-success" />
            </a>
          ) : null}
        </div>

        {/* CTA */}
        <div className="px-5 pb-5">
          <button
            onClick={dismiss}
            className="btn-glass btn-glass-primary flex h-13 w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-black"
          >
            <CheckCircle2 className="h-5 w-5" /> {t("Got it")}
          </button>
        </div>
      </div>
    </div>
  );
}
