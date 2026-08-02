import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BellRing,
  CircleDollarSign,
  Gem,
  LayoutGrid,
  Headset,
  LogOut,
  Moon,
  ShieldHalf,
  Sun,
  UsersRound,
  House,
  MessageCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Primary navigation — Withdraw intentionally lives under "More". */
export const primaryNav = [
  { to: "/dashboard", label: "Dashboard", short: "Home", icon: House },
  { to: "/plans", label: "Plans", short: "Plans", icon: Gem },
  { to: "/deposit", label: "Deposit", short: "Deposit", icon: CircleDollarSign },
  { to: "/referrals", label: "Referrals", short: "Team", icon: UsersRound },
  { to: "/more", label: "More", short: "More", icon: LayoutGrid },
] as const;

export function Brand({ compact }: { compact?: boolean }) {
  const { db } = useStore();
  const name = db.settings.siteName || "HopeX";
  const logo = db.settings.siteLogo;
  const title = db.settings.siteTitle;

  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl gradient-brand font-display text-sm font-black text-primary-foreground">
        {logo ? (
          <img src={logo} alt={`${name} logo`} className="h-full w-full object-cover" />
        ) : (
          (name[0] ?? "H")
        )}
      </span>
      {!compact ? <span className="font-display text-lg font-extrabold">{name}</span> : null}
    </Link>
  );
}


export function AuthGuard({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { user, hydrated } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) navigate({ to: "/auth", replace: true });
    else if (admin && user.role !== "admin") navigate({ to: "/dashboard", replace: true });
  }, [hydrated, user, admin, navigate]);

  if (!hydrated || !user || (admin && user.role !== "admin")) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  return <>{children}</>;
}

function NotificationBell() {
  const { db, user, update } = useStore();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const items = db.notifications.filter((n) => n.userId === user?.id);
  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative grid h-10 w-10 place-items-center rounded-xl glass-soft"
      >
        <BellRing className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Anchored to the viewport so the panel can never overflow on mobile. */}
          <div className="animate-rise fixed inset-x-3 top-[4.5rem] z-50 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-elegant)] sm:inset-x-auto sm:right-4 sm:w-80">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
              <p className="font-semibold">{t("Notifications")}</p>
              <button
                className="text-xs text-primary"
                onClick={() =>
                  update((d) => {
                    d.notifications = d.notifications.map((n) =>
                      n.userId === user?.id ? { ...n, read: true } : n,
                    );
                    return d;
                  })
                }
              >
                {t("Mark all read")}
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">{t("No notifications yet.")}</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() =>
                      update((d) => {
                        const target = d.notifications.find((x) => x.id === n.id);
                        if (target) target.read = true;
                        return d;
                      })
                    }
                    className={cn(
                      "block w-full border-b border-border/40 p-4 text-left transition hover:bg-accent/40",
                      !n.read && "bg-primary/5",
                    )}
                  >
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

function ChatButton() {
  const { db, user, setChatOpen } = useStore();
  const unread = db.chats.filter((c) => c.userId === user?.id && c.from === "support").length;
  if (!user || user.role === "admin") return null;
  return (
    <button
      onClick={() => setChatOpen(true)}
      aria-label="Open live chat"
      className="relative grid h-10 w-10 place-items-center rounded-xl glass-soft"
    >
      <Headset className="h-4 w-4" />
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-success px-1 text-[10px] font-bold text-background">
          {unread}
        </span>
      ) : null}
    </button>
  );
}

/** Floating WhatsApp-style support button, always reachable. */
function ChatFab() {
  const { db, user, setChatOpen, chatOpen } = useStore();
  const unread = db.chats.filter(
    (c) => c.userId === user?.id && c.from === "support" && !c.status,
  ).length;
  if (!user || user.role === "admin" || chatOpen) return null;
  return (
    <button
      onClick={() => setChatOpen(true)}
      aria-label="Open live chat"
      className="fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.8)] transition hover:scale-105 md:bottom-8"
    >
      <MessageCircle className="h-6 w-6" fill="currentColor" strokeWidth={0} />
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {unread}
        </span>
      ) : null}
    </button>
  );
}

export function DashboardLayout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const { user, logout, theme, toggleTheme } = useStore();
  const { t } = useT();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen">
      <div className="aurora" />

      <header className="sticky top-0 z-40 glass-soft rounded-none px-4 py-3">
        <div
          className={cn("mx-auto flex items-center gap-3", wide ? "max-w-[100rem]" : "max-w-7xl")}
        >
          <Brand />

          <nav className="ml-6 hidden flex-1 items-center gap-1 md:flex">
            {primaryNav.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                  pathname === l.to
                    ? "btn-glass btn-glass-primary"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <l.icon className="h-4 w-4" />
                {t(l.label)}
              </Link>
            ))}
            {user?.role === "admin" ? (
              <Link
                to="/admin"
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                  pathname === "/admin"
                    ? "btn-glass btn-glass-gold"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <ShieldHalf className="h-4 w-4" />
                {t("Admin")}
              </Link>
            ) : null}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="grid h-10 w-10 place-items-center rounded-xl glass-soft"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <ChatButton />
            <NotificationBell />
            <Link
              to="/profile"
              aria-label="Profile"
              className="grid h-10 w-10 place-items-center rounded-xl gradient-brand font-bold text-primary-foreground"
            >
              {user?.name?.[0]}
            </Link>
            <button
              onClick={() => {
                void logout();
                navigate({ to: "/", replace: true });
              }}
              aria-label="Sign out"
              className="hidden h-10 w-10 place-items-center rounded-xl glass-soft text-muted-foreground transition hover:text-destructive md:grid"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main
        className={cn("mx-auto px-4 pb-32 pt-6 md:pb-12", wide ? "max-w-[100rem]" : "max-w-7xl")}
      >
        {children}
      </main>

      <ChatFab />

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 gap-1 rounded-3xl glass px-2 py-2 md:hidden">
        {primaryNav.map((l) => {
          const active = pathname === l.to;
          return (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold transition",
                active ? "btn-glass btn-glass-primary" : "text-muted-foreground",
              )}
            >
              <l.icon className="h-[18px] w-[18px]" />
              {t(l.short)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
