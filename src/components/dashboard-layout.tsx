import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gem,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Receipt,
  Settings,
  Shield,
  Sun,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/plans", label: "Investment Plans", icon: Gem },
  { to: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { to: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { to: "/referrals", label: "Referrals", icon: Users },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/profile", label: "Profile & Settings", icon: Settings },
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

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout, theme, toggleTheme } = useStore();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [...nav, ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin Panel", icon: Shield } as const] : [])];

  const sidebar = (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="px-2 py-3">
        <Brand />
      </div>
      <nav className="flex-1 space-y-1">
        {links.map((l) => {
          const active = pathname === l.to;
          return (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "gradient-cool text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <l.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{l.label}</span>
            </Link>
          );
        })}
      </nav>
      <button
        onClick={() => {
          logout();
          navigate({ to: "/", replace: true });
        }}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="aurora" />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 glass rounded-none border-y-0 border-l-0 lg:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="animate-rise absolute inset-y-0 left-0 w-72 glass rounded-none">
            <button
              className="absolute right-3 top-4 text-muted-foreground"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 glass-soft rounded-none px-4 py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl glass-soft lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              <p className="truncate text-sm text-muted-foreground">
                Welcome back, <span className="font-semibold text-foreground">{user?.name}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="grid h-10 w-10 place-items-center rounded-xl glass-soft"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <NotificationBell />
              <span className="grid h-10 w-10 place-items-center rounded-xl gradient-brand font-bold text-primary-foreground">
                {user?.name?.[0]}
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 lg:pb-12">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 glass-soft rounded-none px-2 py-2 lg:hidden">
        {nav.slice(0, 5).map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] font-medium",
              pathname === l.to ? "text-primary" : "text-muted-foreground",
            )}
          >
            <l.icon className="h-4 w-4" />
            {l.label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
