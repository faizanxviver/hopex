import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  proofUrl?: string;
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
  imageUrl?: string;
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
  lastPayoutAt: string;
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
  status?: "sent" | "delivered" | "read";
  attachment?: { name: string; kind: "image" | "file"; url?: string } | null;
  replyTo?: { from: "user" | "support"; text: string } | null;
}

export interface PaymentMethod {
  id: string;
  name: string;
  kind: string;
  accountName: string;
  accountNumber: string;
  imageUrl?: string;
  instructions: string;
  active: boolean;
  sortOrder: number;
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
  phone?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
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
  quickAmounts: number[];
}

interface DB {
  users: User[];
  transactions: Transaction[];
  investments: Investment[];
  notifications: AppNotification[];
  chats: ChatMessage[];
  plans: Plan[];
  promos: PromoCode[];
  methods: PaymentMethod[];
  settings: Settings;
  sessionId: string | null;
}

const THEME_KEY = "hopex-theme";
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => new Date().toISOString();
const num = (v: unknown) => Number(v ?? 0);

/**
 * HopeX signs users in with a phone number. Supabase auth requires an email, so
 * we derive a deterministic address from the digits of the number.
 */
export const authEmail = (identifier: string) => {
  const raw = identifier.trim();
  if (raw.includes("@")) return raw.toLowerCase();
  return `${raw.replace(/\D/g, "")}@hopex.pk`;
};

const emptyDb = (): DB => ({
  users: [],
  transactions: [],
  investments: [],
  notifications: [],
  chats: [],
  plans: [],
  promos: [],
  methods: [],
  settings: {
    siteName: "HopeX",
    minDeposit: 1000,
    minWithdraw: 500,
    levels: [10, 2, 1, 4],
    quickAmounts: [1000, 3000, 5000, 10000, 25000, 50000],
  },
  sessionId: null,
});

/* ---------------- row <-> model mappers ---------------- */

type Row = Record<string, unknown>;

const toUser = (r: Row, roles: Set<string>): User => ({
  id: r.id as string,
  name: r.name as string,
  email: r.email as string,
  phone: (r.phone as string) ?? undefined,
  bankName: (r.bank_name as string) ?? undefined,
  accountName: (r.account_name as string) ?? undefined,
  accountNumber: (r.account_number as string) ?? undefined,
  role: roles.has(r.id as string) ? "admin" : "user",
  verified: Boolean(r.verified),
  blocked: Boolean(r.blocked),
  kyc: r.kyc as User["kyc"],
  twoFactor: Boolean(r.two_factor),
  language: (r.language as "en" | "ur") ?? "en",
  referralCode: r.referral_code as string,
  referredBy: (r.referred_by as string) ?? undefined,
  balance: num(r.balance),
  invested: num(r.invested),
  earnings: num(r.earnings),
  referralEarnings: num(r.referral_earnings),
  createdAt: r.created_at as string,
});

const fromUser = (u: User): Row => ({
  name: u.name,
  email: u.email,
  phone: u.phone ?? null,
  bank_name: u.bankName ?? null,
  account_name: u.accountName ?? null,
  account_number: u.accountNumber ?? null,
  verified: u.verified,
  blocked: u.blocked,
  kyc: u.kyc,
  two_factor: u.twoFactor,
  language: u.language,
  referred_by: u.referredBy ?? null,
  balance: u.balance,
  invested: u.invested,
  earnings: u.earnings,
  referral_earnings: u.referralEarnings,
});

const toTx = (r: Row): Transaction => ({
  id: r.id as string,
  userId: r.user_id as string,
  type: r.type as TxType,
  amount: num(r.amount),
  method: (r.method as string) ?? undefined,
  status: r.status as TxStatus,
  note: (r.note as string) ?? undefined,
  reference: (r.reference as string) ?? undefined,
  proofUrl: (r.proof_url as string) ?? undefined,
  createdAt: r.created_at as string,
});

const fromTx = (t: Transaction): Row => ({
  id: t.id,
  user_id: t.userId,
  type: t.type,
  amount: t.amount,
  method: t.method ?? null,
  status: t.status,
  note: t.note ?? null,
  reference: t.reference ?? null,
  proof_url: t.proofUrl ?? null,
  created_at: t.createdAt,
});

const toInvestment = (r: Row): Investment => ({
  id: r.id as string,
  userId: r.user_id as string,
  planId: r.plan_id as string,
  planName: r.plan_name as string,
  amount: num(r.amount),
  dailyRoi: num(r.daily_roi),
  durationDays: Number(r.duration_days),
  startedAt: r.started_at as string,
  lastPayoutAt: (r.last_payout_at as string) ?? (r.started_at as string),
  earned: num(r.earned),
});

const fromInvestment = (i: Investment): Row => ({
  id: i.id,
  user_id: i.userId,
  plan_id: i.planId,
  plan_name: i.planName,
  amount: i.amount,
  daily_roi: i.dailyRoi,
  duration_days: i.durationDays,
  earned: i.earned,
  started_at: i.startedAt,
  last_payout_at: i.lastPayoutAt,
});


const toNotification = (r: Row): AppNotification => ({
  id: r.id as string,
  userId: r.user_id as string,
  title: r.title as string,
  body: r.body as string,
  kind: r.kind as AppNotification["kind"],
  read: Boolean(r.read),
  popup: Boolean(r.popup),
  createdAt: r.created_at as string,
});

const fromNotification = (n: AppNotification): Row => ({
  id: n.id,
  user_id: n.userId,
  title: n.title,
  body: n.body,
  kind: n.kind,
  read: n.read,
  popup: n.popup ?? false,
  created_at: n.createdAt,
});

const toChat = (r: Row): ChatMessage => ({
  id: r.id as string,
  userId: r.user_id as string,
  from: r.sender as "user" | "support",
  text: r.text as string,
  status: (r.status as ChatMessage["status"]) ?? "sent",
  attachment: (r.attachment as ChatMessage["attachment"]) ?? null,
  replyTo: (r.reply_to as ChatMessage["replyTo"]) ?? null,
  createdAt: r.created_at as string,
});

const fromChat = (c: ChatMessage): Row => ({
  id: c.id,
  user_id: c.userId,
  sender: c.from,
  text: c.text,
  status: c.status ?? "sent",
  attachment: c.attachment ?? null,
  reply_to: c.replyTo ?? null,
  created_at: c.createdAt,
});

const toPlan = (r: Row): Plan => ({
  id: r.id as string,
  name: r.name as string,
  min: num(r.min_amount),
  max: num(r.max_amount),
  dailyRoi: num(r.daily_roi),
  durationDays: Number(r.duration_days),
  features: (r.features as string[]) ?? [],
  active: Boolean(r.active),
  imageUrl: (r.image_url as string) ?? undefined,
});

const fromPlan = (p: Plan): Row => ({
  id: p.id,
  name: p.name,
  min_amount: p.min,
  max_amount: p.max,
  daily_roi: p.dailyRoi,
  duration_days: p.durationDays,
  features: p.features,
  active: p.active,
  image_url: p.imageUrl ?? null,
});

const toPromo = (r: Row): PromoCode => ({
  id: r.id as string,
  code: r.code as string,
  type: r.type as "percent" | "fixed",
  value: num(r.value),
  usageLimit: Number(r.usage_limit),
  used: Number(r.used),
  expiresAt: (r.expires_at as string) ?? "",
  active: Boolean(r.active),
});

const fromPromo = (p: PromoCode): Row => ({
  id: p.id,
  code: p.code.toUpperCase(),
  type: p.type,
  value: p.value,
  usage_limit: p.usageLimit,
  used: p.used,
  expires_at: p.expiresAt || null,
  active: p.active,
});

const toMethod = (r: Row): PaymentMethod => ({
  id: r.id as string,
  name: r.name as string,
  kind: (r.kind as string) ?? "wallet",
  accountName: (r.account_name as string) ?? "",
  accountNumber: (r.account_number as string) ?? "",
  imageUrl: (r.image_url as string) ?? undefined,
  instructions: (r.instructions as string) ?? "",
  active: Boolean(r.active),
  sortOrder: Number(r.sort_order ?? 0),
});

const fromMethod = (m: PaymentMethod): Row => ({
  id: m.id,
  name: m.name,
  kind: m.kind,
  account_name: m.accountName,
  account_number: m.accountNumber,
  image_url: m.imageUrl ?? null,
  instructions: m.instructions,
  active: m.active,
  sort_order: m.sortOrder,
});

/* ---------------- context ---------------- */

interface Ctx {
  db: DB;
  hydrated: boolean;
  loading: boolean;
  user: User | null;
  update: (fn: (d: DB) => DB) => void;
  refresh: () => Promise<void>;
  signup: (name: string, phone: string, password: string, ref?: string) => Promise<string | null>;
  login: (phone: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  redeemPromo: (code: string, amount: number) => Promise<{ bonus: number; code: string } | null>;
  claimEarnings: () => Promise<number>;

  addNotification: (userId: string, n: Omit<AppNotification, "id" | "userId" | "read" | "createdAt">) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
}

const StoreContext = createContext<Ctx | null>(null);

/* ---------------- persistence ---------------- */

type Coll =
  | "users"
  | "transactions"
  | "investments"
  | "notifications"
  | "chats"
  | "plans"
  | "promos"
  | "methods";

const TABLES: Record<Coll, { table: string; from: (x: never) => Row; insertable: boolean; deletable: boolean }> = {
  users: { table: "profiles", from: fromUser as (x: never) => Row, insertable: false, deletable: false },
  transactions: { table: "transactions", from: fromTx as (x: never) => Row, insertable: true, deletable: true },
  investments: { table: "investments", from: fromInvestment as (x: never) => Row, insertable: true, deletable: true },
  notifications: { table: "notifications", from: fromNotification as (x: never) => Row, insertable: true, deletable: true },
  chats: { table: "chat_messages", from: fromChat as (x: never) => Row, insertable: true, deletable: true },
  plans: { table: "plans", from: fromPlan as (x: never) => Row, insertable: true, deletable: true },
  promos: { table: "promo_codes", from: fromPromo as (x: never) => Row, insertable: true, deletable: true },
  methods: { table: "payment_methods", from: fromMethod as (x: never) => Row, insertable: true, deletable: true },
};

type WithId = { id: string };

/* Loosely typed handle: the sync layer writes to tables generically. */
type LooseQuery = {
  insert: (rows: Row[]) => PromiseLike<{ error: unknown }>;
  update: (row: Row) => { eq: (col: string, val: unknown) => PromiseLike<{ error: unknown }> };
  delete: () => { in: (col: string, vals: string[]) => PromiseLike<{ error: unknown }> };
};
const sb = supabase as unknown as { from: (table: string) => LooseQuery };

/** Persists the difference between two in-memory snapshots to the database. */
async function persistDiff(prev: DB, next: DB) {
  const jobs: PromiseLike<{ error: unknown }>[] = [];


  (Object.keys(TABLES) as Coll[]).forEach((key) => {
    const meta = TABLES[key];
    const before = prev[key] as unknown as WithId[];
    const after = next[key] as unknown as WithId[];
    const beforeMap = new Map(before.map((r) => [r.id, r]));
    const afterMap = new Map(after.map((r) => [r.id, r]));

    const inserts: Row[] = [];
    const updates: { id: string; row: Row }[] = [];

    after.forEach((row) => {
      const old = beforeMap.get(row.id);
      if (!old) {
        if (meta.insertable) inserts.push({ id: row.id, ...meta.from(row as never) });
        return;
      }
      if (JSON.stringify(old) !== JSON.stringify(row)) {
        const payload = meta.from(row as never);
        delete payload.id;
        updates.push({ id: row.id, row: payload });
      }
    });

    const removed = before.filter((row) => !afterMap.has(row.id)).map((r) => r.id);

    if (inserts.length) jobs.push(sb.from(meta.table).insert(inserts));
    updates.forEach((u) => jobs.push(sb.from(meta.table).update(u.row).eq("id", u.id)));
    if (removed.length && meta.deletable) jobs.push(sb.from(meta.table).delete().in("id", removed));
  });

  if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) {
    jobs.push(
      sb
        .from("settings")
        .update({
          site_name: next.settings.siteName,
          min_deposit: next.settings.minDeposit,
          min_withdraw: next.settings.minWithdraw,
          levels: next.settings.levels,
          quick_amounts: next.settings.quickAmounts,
        })
        .eq("id", 1),
    );
  }


  const results = await Promise.all(jobs);
  const failed = results.find((r) => (r as { error?: unknown } | null)?.error);
  if (failed) console.error("Sync error", (failed as { error: unknown }).error);
}

/* ---------------- provider ---------------- */

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDb);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [chatOpen, setChatOpen] = useState(false);
  const sessionRef = useRef<string | null>(null);

  const load = useCallback(async (sessionId: string | null) => {
    sessionRef.current = sessionId;

    const [plansRes, settingsRes, methodsRes] = await Promise.all([
      supabase.from("plans").select("*").order("sort_order"),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("payment_methods").select("*").order("sort_order"),
    ]);

    const base = emptyDb();
    base.sessionId = sessionId;
    base.plans = ((plansRes.data as Row[]) ?? []).map(toPlan);
    base.methods = ((methodsRes.data as Row[]) ?? []).map(toMethod);
    const s = settingsRes.data as Row | null;
    if (s) {
      base.settings = {
        siteName: s.site_name as string,
        minDeposit: num(s.min_deposit),
        minWithdraw: num(s.min_withdraw),
        levels: (s.levels as [number, number, number, number]) ?? [10, 2, 1, 4],
        quickAmounts: ((s.quick_amounts as unknown[]) ?? []).map(num).filter((n) => n > 0),
      };
    }

    if (!sessionId) {
      setDb(base);
      setLoading(false);
      setHydrated(true);
      return;
    }

    const [profiles, roles, txs, invs, notifs, chats, promos] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("investments").select("*").order("started_at", { ascending: false }),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }),
      supabase.from("chat_messages").select("*").order("created_at"),
      supabase.from("promo_codes").select("*").order("created_at"),
    ]);

    const adminIds = new Set(
      ((roles.data as Row[]) ?? []).filter((r) => r.role === "admin").map((r) => r.user_id as string),
    );

    base.users = ((profiles.data as Row[]) ?? []).map((r) => toUser(r, adminIds));
    base.transactions = ((txs.data as Row[]) ?? []).map(toTx);
    base.investments = ((invs.data as Row[]) ?? []).map(toInvestment);
    base.notifications = ((notifs.data as Row[]) ?? []).map(toNotification);
    base.chats = ((chats.data as Row[]) ?? []).map(toChat);
    base.promos = ((promos.data as Row[]) ?? []).map(toPromo);

    setDb(base);
    setLoading(false);
    setHydrated(true);
  }, []);

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as "dark" | "light") || "light";
    setTheme(stored);

    supabase.auth.getSession().then(({ data }) => {
      void load(data.session?.user.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      const id = session?.user.id ?? null;
      if (id === sessionRef.current) return;
      setLoading(true);
      void load(id);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  /* Live sync — admin actions and new rows land in the UI immediately. */
  useEffect(() => {
    if (!hydrated) return;
    let queued: ReturnType<typeof setTimeout> | null = null;
    const ping = () => {
      if (queued) return;
      queued = setTimeout(() => {
        queued = null;
        void load(sessionRef.current);
      }, 400);
    };
    const channel = supabase.channel("hopex-live");
    [
      "transactions",
      "notifications",
      "chat_messages",
      "investments",
      "profiles",
      "plans",
      "payment_methods",
    ].forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, ping);
    });
    channel.subscribe();
    return () => {
      if (queued) clearTimeout(queued);
      void supabase.removeChannel(channel);
    };
  }, [hydrated, load]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const update = useCallback((fn: (d: DB) => DB) => {
    setDb((prev) => {
      const next = fn(structuredClone(prev));
      void persistDiff(prev, next);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    await load(sessionRef.current);
  }, [load]);

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

  const signup: Ctx["signup"] = useCallback(async (name, phone, password, ref) => {
    const { data, error } = await supabase.auth.signUp({
      email: authEmail(phone),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name: name.trim(), phone: phone.trim(), referred_by: ref?.trim().toUpperCase() || null },
      },
    });
    if (error) return error.message;
    if (!data.session) return null;
    setLoading(true);
    await load(data.session.user.id);
    return null;
  }, [load]);

  const login: Ctx["login"] = useCallback(async (phone, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail(phone), password });
    if (error) return error.message;
    const { data: profile } = await supabase
      .from("profiles")
      .select("blocked")
      .eq("id", data.user.id)
      .maybeSingle();
    if ((profile as Row | null)?.blocked) {
      await supabase.auth.signOut();
      return "This account has been suspended. Contact support.";
    }
    setLoading(true);
    await load(data.user.id);
    return null;
  }, [load]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    sessionRef.current = null;
    await load(null);
  }, [load]);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return error ? error.message : null;
  }, []);

  const redeemPromo = useCallback(async (code: string, amount: number) => {
    const { data, error } = await supabase.rpc("redeem_promo", { _code: code.trim(), _amount: amount });
    if (error || !data || !(data as unknown[]).length) return null;
    const row = (data as Row[])[0];
    return { bonus: num(row.bonus), code: row.code as string };
  }, []);

  /** Credits every completed 24-hour income cycle to the withdrawable balance. */
  const claimEarnings = useCallback(async () => {
    const { data, error } = await supabase.rpc("claim_earnings");
    if (error) return 0;
    const total = num(data);
    if (total > 0) await load(sessionRef.current);
    return total;
  }, [load]);


  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  const value: Ctx = {
    db,
    hydrated,
    loading,
    user,
    update,
    refresh,
    signup,
    login,
    logout,
    resetPassword,
    redeemPromo,
    claimEarnings,

    addNotification,
    theme,
    toggleTheme,
    chatOpen,
    setChatOpen,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/* ---------------- helpers ---------------- */

/** Every amount in HopeX is Pakistani Rupees. */
export const money = (n: number) =>
  "Rs " + Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

/** A user may withdraw only after purchasing at least one investment plan. */
export function hasActivePlan(db: DB, userId: string) {
  return db.investments.some((i) => i.userId === userId);
}

/** Total funds the user has deposited and that were approved by an admin. */
export function depositBalance(db: DB, userId: string) {
  return db.transactions
    .filter((t) => t.userId === userId && t.type === "deposit" && (t.status === "approved" || t.status === "completed"))
    .reduce((a, t) => a + t.amount, 0);
}

export function pendingDeposits(db: DB, userId: string) {
  return db.transactions
    .filter((t) => t.userId === userId && t.type === "deposit" && (t.status === "pending" || t.status === "processing"))
    .reduce((a, t) => a + t.amount, 0);
}

const DAY_MS = 86400000;

/** Investments that still have income cycles remaining. */
export function activeInvestments(db: DB, userId: string) {
  return db.investments.filter((i) => {
    const daily = (i.amount * i.dailyRoi) / 100;
    if (daily <= 0) return false;
    return Math.round(i.earned / daily) < i.durationDays;
  });
}

/**
 * Income accrued in real time since the last credited cycle.
 * Displayed as a live ticker; the actual credit happens on the server every 24h.
 */
export function liveEarnings(db: DB, userId: string, atMs = Date.now()) {
  return activeInvestments(db, userId).reduce((sum, i) => {
    const daily = (i.amount * i.dailyRoi) / 100;
    const elapsed = Math.max(0, atMs - new Date(i.lastPayoutAt).getTime());
    return sum + daily * Math.min(1, elapsed / DAY_MS);
  }, 0);
}

/** Milliseconds until the next automatic payout, or null when nothing is running. */
export function nextPayoutIn(db: DB, userId: string, atMs = Date.now()) {
  const times = activeInvestments(db, userId).map(
    (i) => new Date(i.lastPayoutAt).getTime() + DAY_MS - atMs,
  );
  if (!times.length) return null;
  return Math.max(0, Math.min(...times));
}

/** Total daily income across every running plan. */
export function dailyIncome(db: DB, userId: string) {
  return activeInvestments(db, userId).reduce((s, i) => s + (i.amount * i.dailyRoi) / 100, 0);
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Processing",
  processing: "Processing",
  approved: "Successful",
  completed: "Successful",
  rejected: "Declined",
};

export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;
