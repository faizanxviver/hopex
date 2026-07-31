import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ArrowDownToLine,
  Gem,
  Grid2x2,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Moon,
  Shield,
  Sun,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Primary navigation — Withdraw intentionally lives under "More". */
export const primaryNav = [
  { to: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { to: "/plans", label: "Plans", short: "Plans", icon: Gem },
  { to: "/deposit", label: "Deposit", short: "Deposit", icon: ArrowDownToLine },
  { to: "/referrals", label: "Referrals", short: "Team", icon: Users },
  { to: "/more", label: "More", short: "More", icon: Grid2x2 },
] as const;

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-brand font-display text-sm font-black text-primary-foreground">
        A
      </span>
      {!compact ? <span className="font-display text-lg font-extrabold">Aurum Capital</span> : null}
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
  const [open, setOpen] = useState(false);
  const items = db.notifications.filter((n) => n.userId === user?.id);
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative grid h-10 w-10 place-items-center rounded-xl glass-soft"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="animate-rise absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl glass">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
            <p className="font-semibold">Notifications</p>
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
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() =>
                    update((d) => {
                      const t = d.notifications.find((x) => x.id === n.id);
                      if (t) t.read = true;
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
      ) : null}
    </div>
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
      <MessageCircle className="h-4 w-4" />
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-success px-1 text-[10px] font-bold text-background">
          {unread}
        </span>
      ) : null}
    </button>
  );
}

export function DashboardLayout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const { user, logout, theme, toggleTheme } = useStore();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen">
      <div className="aurora" />

      <header className="sticky top-0 z-40 glass-soft rounded-none px-4 py-3">
        <div className={cn("mx-auto flex items-center gap-3", wide ? "max-w-[100rem]" : "max-w-7xl")}>
          <Brand />

          <nav className="ml-6 hidden flex-1 items-center gap-1 md:flex">
            {primaryNav.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                  pathname === l.to
                    ? "gradient-cool text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            ))}
            {user?.role === "admin" ? (
              <Link
                to="/admin"
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                  pathname === "/admin"
                    ? "gradient-brand text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Shield className="h-4 w-4" />
                Admin
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
                logout();
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

      <main className={cn("mx-auto px-4 pb-28 pt-6 md:pb-12", wide ? "max-w-[100rem]" : "max-w-7xl")}>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 glass-soft rounded-none px-2 py-2 md:hidden">
        {primaryNav.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] font-medium",
              pathname === l.to ? "text-primary" : "text-muted-foreground",
            )}
          >
            <l.icon className="h-4 w-4" />
            {l.short}
          </Link>
        ))}
      </nav>
    </div>
  );
}
