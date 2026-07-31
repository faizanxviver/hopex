import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

/* ---------------- types ---------------- */

export type TxType = "deposit" | "withdraw" | "investment" | "commission" | "bonus" | "payout";
export type TxStatus = "pending" | "processing" | "approved" | "completed" | "rejected";

export interface Transaction {
  id: string;
  userId: string;
  type: TxType;
  amount: number;
  method?: string;
  status: TxStatus;
  note?: string;
  reference?: string;
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  min: number;
  max: number;
  dailyRoi: number;
  durationDays: number;
  features: string[];
  active: boolean;
}

export interface Investment {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  dailyRoi: number;
  durationDays: number;
  startedAt: string;
  earned: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  kind: "success" | "info" | "warning";
  read: boolean;
  popup?: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  from: "user" | "support";
  text: string;
  createdAt: string;
}

export interface PromoCode {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  usageLimit: number;
  used: number;
  expiresAt: string;
  active: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "user" | "admin";
  verified: boolean;
  blocked: boolean;
  kyc: "not_submitted" | "pending" | "verified";
  twoFactor: boolean;
  language: "en" | "ur";
  referralCode: string;
  referredBy?: string;
  balance: number;
  invested: number;
  earnings: number;
  referralEarnings: number;
  createdAt: string;
}

interface Settings {
  siteName: string;
  minDeposit: number;
  minWithdraw: number;
  levels: [number, number, number, number];
}

interface DB {
  users: User[];
  transactions: Transaction[];
  investments: Investment[];
  notifications: AppNotification[];
  chats: ChatMessage[];
  plans: Plan[];
  promos: PromoCode[];
  settings: Settings;
  sessionId: string | null;
}

const KEY = "aurum-invest-db-v1";
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const code = () => "AUR" + Math.random().toString(36).slice(2, 7).toUpperCase();

const defaultPlans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    min: 50,
    max: 999,
    dailyRoi: 1.2,
    durationDays: 30,
    features: ["Daily payouts", "Principal returned", "Email support"],
    active: true,
  },
  {
    id: "growth",
    name: "Growth",
    min: 1000,
    max: 4999,
    dailyRoi: 1.8,
    durationDays: 45,
    features: ["Daily payouts", "Priority support", "Referral boost 5%"],
    active: true,
  },
  {
    id: "premium",
    name: "Premium",
    min: 5000,
    max: 19999,
    dailyRoi: 2.4,
    durationDays: 60,
    features: ["Daily payouts", "Dedicated manager", "Referral boost 10%"],
    active: true,
  },
  {
    id: "vip",
    name: "VIP",
    min: 20000,
    max: 250000,
    dailyRoi: 3.1,
    durationDays: 90,
    features: ["Daily payouts", "Private desk", "Custom exit terms", "VIP events"],
    active: true,
  },
];

function seed(): DB {
  const admin: User = {
    id: "admin",
    name: "Platform Admin",
    email: "admin@aurum.io",
    password: "admin123",
    role: "admin",
    verified: true,
    blocked: false,
    kyc: "verified",
    twoFactor: true,
    language: "en",
    referralCode: "ADMIN01",
    balance: 0,
    invested: 0,
    earnings: 0,
    referralEarnings: 0,
    createdAt: now(),
  };
  const demo: User = {
    id: "demo",
    name: "Ayaan Malik",
    email: "demo@aurum.io",
    password: "demo123",
    phone: "+92 300 1234567",
    role: "user",
    verified: true,
    blocked: false,
    kyc: "pending",
    twoFactor: false,
    language: "en",
    referralCode: "AURDEMO",
    balance: 4820.5,
    invested: 12500,
    earnings: 3260.75,
    referralEarnings: 940.2,
    createdAt: now(),
  };
  const downline: User[] = ["Hina Raza", "Bilal Ahmed", "Sara Khan", "Omar Farooq", "Zara Sheikh"].map(
    (name, i) => ({
      id: "u" + i,
      name,
      email: name.split(" ")[0].toLowerCase() + "@mail.com",
      password: "pass1234",
      role: "user" as const,
      verified: true,
      blocked: false,
      kyc: "verified" as const,
      twoFactor: false,
      language: "en" as const,
      referralCode: code(),
      referredBy: i < 3 ? "AURDEMO" : "AURDEMO2",
      balance: 300 + i * 120,
      invested: 800 + i * 450,
      earnings: 120 + i * 60,
      referralEarnings: i * 25,
      createdAt: now(),
    }),
  );
  const tx: Transaction[] = [
    { type: "deposit", amount: 5000, method: "USDT (TRC20)", status: "approved" },
    { type: "investment", amount: 5000, method: "Premium Plan", status: "completed" },
    { type: "commission", amount: 500, method: "Level 1", status: "completed" },
    { type: "withdraw", amount: 1200, method: "Bank Transfer", status: "pending" },
    { type: "bonus", amount: 100, method: "Welcome bonus", status: "completed" },
    { type: "payout", amount: 120, method: "Daily ROI", status: "completed" },
  ].map((t, i) => ({
    id: uid(),
    userId: "demo",
    ...(t as { type: TxType; amount: number; method: string; status: TxStatus }),
    createdAt: new Date(Date.now() - i * 86400000 * 1.4).toISOString(),
  }));

  return {
    users: [admin, demo, ...downline],
    transactions: tx,
    investments: [
      {
        id: uid(),
        userId: "demo",
        planId: "premium",
        planName: "Premium",
        amount: 7500,
        dailyRoi: 2.4,
        durationDays: 60,
        startedAt: new Date(Date.now() - 18 * 86400000).toISOString(),
        earned: 3240,
      },
      {
        id: uid(),
        userId: "demo",
        planId: "growth",
        planName: "Growth",
        amount: 5000,
        dailyRoi: 1.8,
        durationDays: 45,
        startedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        earned: 540,
      },
    ],
    notifications: [
      {
        id: uid(),
        userId: "demo",
        title: "Welcome bonus credited",
        body: "$100 welcome bonus has been added to your wallet.",
        kind: "success",
        read: false,
        popup: true,
        createdAt: now(),
      },
      {
        id: uid(),
        userId: "demo",
        title: "New VIP plan live",
        body: "3.1% daily ROI for 90 days. Limited allocation.",
        kind: "info",
        read: false,
        popup: true,
        createdAt: now(),
      },
      {
        id: uid(),
        userId: "demo",
        title: "Referral commission received",
        body: "You earned $52.00 from Level 1 referral Hina Raza.",
        kind: "success",
        read: true,
        createdAt: now(),
      },
    ],
    chats: [
      {
        id: uid(),
        userId: "demo",
        from: "support",
        text: "Hi 👋 Welcome to Aurum Capital support. How can we help today?",
        createdAt: now(),
      },
    ],
    plans: defaultPlans,
    promos: [
      {
        id: uid(),
        code: "WELCOME10",
        type: "percent",
        value: 10,
        usageLimit: 500,
        used: 34,
        expiresAt: "2026-12-31",
        active: true,
      },
      {
        id: uid(),
        code: "BOOST50",
        type: "fixed",
        value: 50,
        usageLimit: 100,
        used: 12,
        expiresAt: "2026-10-01",
        active: true,
      },
    ],
    settings: {
      siteName: "Aurum Capital",
      minDeposit: 50,
      minWithdraw: 25,
      levels: [10, 2, 1, 4],
    },
    sessionId: null,
  };
}

/* ---------------- context ---------------- */

interface Ctx {
  db: DB;
  hydrated: boolean;
  user: User | null;
  update: (fn: (d: DB) => DB) => void;
  signup: (name: string, email: string, password: string, ref?: string) => string | null;
  login: (email: string, password: string) => string | null;
  logout: () => void;
  resetPassword: (email: string) => boolean;
  addNotification: (userId: string, n: Omit<AppNotification, "id" | "userId" | "read" | "createdAt">) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => seed());
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDb(JSON.parse(raw) as DB);
      const t = (localStorage.getItem(KEY + "-theme") as "dark" | "light") || "dark";
      setTheme(t);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(db));
  }, [db, hydrated]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (hydrated) localStorage.setItem(KEY + "-theme", theme);
  }, [theme, hydrated]);

  const update = useCallback((fn: (d: DB) => DB) => setDb((prev) => fn(structuredClone(prev))), []);

  const user = useMemo(
    () => db.users.find((u) => u.id === db.sessionId) ?? null,
    [db.users, db.sessionId],
  );

  const addNotification: Ctx["addNotification"] = useCallback(
    (userId, n) => {
      update((d) => {
        d.notifications.unshift({ id: uid(), userId, read: false, createdAt: now(), ...n });
        return d;
      });
    },
    [update],
  );

  const signup: Ctx["signup"] = useCallback(
    (name, email, password, ref) => {
      let error: string | null = null;
      update((d) => {
        if (d.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
          error = "An account with this email already exists.";
          return d;
        }
        const u: User = {
          id: uid(),
          name,
          email,
          password,
          role: "user",
          verified: true,
          blocked: false,
          kyc: "not_submitted",
          twoFactor: false,
          language: "en",
          referralCode: code(),
          referredBy: ref || undefined,
          balance: 100,
          invested: 0,
          earnings: 0,
          referralEarnings: 0,
          createdAt: now(),
        };
        d.users.push(u);
        d.sessionId = u.id;
        d.transactions.unshift({
          id: uid(),
          userId: u.id,
          type: "bonus",
          amount: 100,
          method: "Welcome bonus",
          status: "completed",
          createdAt: now(),
        });
        d.notifications.unshift({
          id: uid(),
          userId: u.id,
          title: "Welcome to Aurum Capital 🎉",
          body: "Your $100 welcome bonus is ready. Pick a plan to start earning daily.",
          kind: "success",
          read: false,
          popup: true,
          createdAt: now(),
        });
        d.chats.push({
          id: uid(),
          userId: u.id,
          from: "support",
          text: "Hi 👋 Welcome to Aurum Capital support. How can we help today?",
          createdAt: now(),
        });
        return d;
      });
      return error;
    },
    [update],
  );

  const login: Ctx["login"] = useCallback(
    (email, password) => {
      const found = db.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
      );
      if (!found) return "Invalid email or password.";
      if (found.blocked) return "This account has been suspended. Contact support.";
      update((d) => {
        d.sessionId = found.id;
        return d;
      });
      return null;
    },
    [db.users, update],
  );

  const logout = useCallback(
    () =>
      update((d) => {
        d.sessionId = null;
        return d;
      }),
    [update],
  );

  const resetPassword = useCallback(
    (email: string) => db.users.some((u) => u.email.toLowerCase() === email.toLowerCase()),
    [db.users],
  );

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  const value: Ctx = {
    db,
    hydrated,
    user,
    update,
    signup,
    login,
    logout,
    resetPassword,
    addNotification,
    theme,
    toggleTheme,
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/* ---------------- helpers ---------------- */

export const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const newId = uid;
export const timestamp = now;

export function referralTree(db: DB, rootCode: string) {
  const levels: User[][] = [];
  let codes = [rootCode];
  for (let i = 0; i < 4; i++) {
    const members = db.users.filter((u) => u.referredBy && codes.includes(u.referredBy));
    levels.push(members);
    codes = members.map((m) => m.referralCode);
    if (!codes.length) {
      while (levels.length < 4) levels.push([]);
      break;
    }
  }
  return levels;
}

export function investmentProgress(inv: Investment) {
  const elapsed = (Date.now() - new Date(inv.startedAt).getTime()) / 86400000;
  const pct = Math.min(100, (elapsed / inv.durationDays) * 100);
  return { pct, daysLeft: Math.max(0, Math.ceil(inv.durationDays - elapsed)) };
}
