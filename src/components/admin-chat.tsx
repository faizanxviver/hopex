import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Ban,
  Check,
  CheckCheck,
  ChevronDown,
  MessagesSquare,
  MinusCircle,
  Paperclip,
  PlusCircle,
  Rocket,
  Search,
  Send,
  Smile,
  Trash2,
  UserRound,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { money, newId, timestamp, useStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/store";
import { cn } from "@/lib/utils";

const EMOJIS = ["👍", "🙏", "✅", "❌", "🔥", "💰", "📈", "🎉", "😀", "😎", "🤝", "💎"];

const CANNED = [
  "Assalam o Alaikum! HopeX support here — how can I help you today?",
  "Your deposit has been verified and credited ✅",
  "Please share a clear payment screenshot so we can verify it.",
  "Withdrawals are processed within 2 hours once a plan is active.",
  "Your request has been forwarded to the finance team.",
];

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "TODAY";
  if (d.toDateString() === yest.toDateString()) return "YESTERDAY";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }).toUpperCase();
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function AdminChat() {
  const { db, update } = useStore();
  const [selected, setSelected] = useState<string>("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [emoji, setEmoji] = useState(false);
  const [canned, setCanned] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [showInfo, setShowInfo] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const threads = useMemo(() => {
    const ids = Array.from(new Set(db.chats.map((c) => c.userId)));
    return ids
      .map((id) => {
        const msgs = db.chats.filter((c) => c.userId === id);
        const last = msgs[msgs.length - 1];
        const unread = msgs.filter((m) => m.from === "user" && m.status !== "read").length;
        const u = db.users.find((x) => x.id === id);
        return { id, name: u?.name ?? "Unknown user", user: u, last, unread, count: msgs.length };
      })
      .filter((t) => (filter === "unread" ? t.unread > 0 : true))
      .filter((t) => (q.trim() ? t.name.toLowerCase().includes(q.trim().toLowerCase()) : true))
      .sort((a, b) => (b.last?.createdAt ?? "").localeCompare(a.last?.createdAt ?? ""));
  }, [db.chats, db.users, q, filter]);

  const activeId = selected || threads[0]?.id || "";
  const messages = db.chats.filter((c) => c.userId === activeId);
  const person = db.users.find((u) => u.id === activeId);
  const totalUnread = db.chats.filter((c) => c.from === "user" && c.status !== "read").length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeId]);

  useEffect(() => {
    if (!activeId) return;
    const t = setTimeout(() => {
      update((d) => {
        d.chats = d.chats.map((c) =>
          c.userId === activeId && c.from === "user" ? { ...c, status: "read" } : c,
        );
        return d;
      });
    }, 800);
    return () => clearTimeout(t);
  }, [activeId, messages.length, update]);

  const send = (value?: string, attachment?: ChatMessage["attachment"]) => {
    const body = (value ?? text).trim();
    if ((!body && !attachment) || !activeId) return;
    setText("");
    setEmoji(false);
    setCanned(false);
    update((d) => {
      d.chats.push({
        id: newId(),
        userId: activeId,
        from: "support",
        text: body || (attachment?.name ?? ""),
        status: "read",
        attachment,
        createdAt: timestamp(),
      });
      return d;
    });
  };

  const adjust = (delta: number, label: string) =>
    update((d) => {
      const u = d.users.find((x) => x.id === activeId);
      if (!u) return d;
      u.balance = Math.max(0, u.balance + delta);
      d.transactions.unshift({
        id: newId(),
        userId: u.id,
        type: delta >= 0 ? "bonus" : "withdraw",
        amount: Math.abs(delta),
        method: label,
        status: "completed",
        createdAt: timestamp(),
      });
      return d;
    });

  let lastDay = "";

  return (
    <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)_18rem]">
      {/* Conversations */}
      <div className="glass flex h-[34rem] flex-col overflow-hidden rounded-3xl">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <MessagesSquare className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Inbox</p>
          {totalUnread ? (
            <span className="ml-auto rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
              {totalUnread} new
            </span>
          ) : null}
        </div>
        <div className="space-y-2 px-3 py-2">
          <div className="flex items-center gap-2 rounded-xl border border-input bg-background/50 px-3">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search users…"
              className="h-9 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <div className="inline-flex w-full gap-1 rounded-xl glass-soft p-1">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition",
                  filter === f
                    ? "gradient-cool text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition",
                activeId === t.id ? "bg-primary/12" : "hover:bg-accent",
              )}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full gradient-cool text-xs font-black text-primary-foreground">
                {initials(t.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{t.name}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    {t.last ? timeOf(t.last.createdAt) : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="line-clamp-1 flex-1 text-xs text-muted-foreground">
                    {t.last?.from === "support" ? "You: " : ""}
                    {t.last?.text ?? "No messages"}
                  </span>
                  {t.unread ? (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-success px-1 text-[10px] font-bold text-primary-foreground">
                      {t.unread}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          ))}
          {threads.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No conversations.</p>
          ) : null}
        </div>
      </div>

      {/* Thread */}
      <div className="glass flex h-[34rem] flex-col overflow-hidden rounded-3xl">
        <div className="flex items-center gap-3 bg-[var(--gradient-cool)] px-3 py-2.5 text-primary-foreground">
          <button
            onClick={() => setSelected("")}
            aria-label="Back to inbox"
            className="shrink-0 lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-foreground/20 text-xs font-black">
            {person ? initials(person.name) : "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{person?.name ?? "Select a chat"}</p>
            <p className="truncate text-[11px] opacity-90">
              {person ? `${person.phone ?? person.email} · ${money(person.balance)}` : "—"}
            </p>
          </div>
          <button
            onClick={() => setShowInfo((s) => !s)}
            aria-label="User details"
            className="hidden shrink-0 rounded-lg bg-primary-foreground/15 p-1.5 xl:block"
          >
            <UserRound className="h-4 w-4" />
          </button>
          <button
            aria-label="Clear conversation"
            onClick={() => {
              if (!activeId) return;
              update((d) => {
                d.chats = d.chats.filter((c) => c.userId !== activeId);
                return d;
              });
              toast.success("Conversation cleared.");
            }}
            className="shrink-0 rounded-lg bg-primary-foreground/15 p-1.5"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="chat-wallpaper flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
          {messages.map((m) => {
            const label = dayLabel(m.createdAt);
            const showDay = label !== lastDay;
            lastDay = label;
            const mine = m.from === "support";
            return (
              <div key={m.id}>
                {showDay ? (
                  <p className="mx-auto my-3 w-fit rounded-lg bg-background/70 px-3 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground">
                    {label}
                  </p>
                ) : null}
                <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "relative max-w-[78%] px-2.5 py-1.5 text-sm shadow-sm",
                      mine
                        ? "rounded-xl rounded-br-sm bg-[color-mix(in_oklab,var(--color-success)_28%,var(--color-card))] text-foreground"
                        : "rounded-xl rounded-bl-sm bg-card text-foreground",
                    )}
                  >
                    {m.attachment ? (
                      <div className="mb-1 flex items-center gap-2 rounded-md bg-background/60 px-2 py-1.5 text-[12px]">
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate">{m.attachment.name}</span>
                      </div>
                    ) : null}
                    <p className="whitespace-pre-wrap break-words pr-12">{m.text}</p>
                    <span className="absolute bottom-1 right-2 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      {timeOf(m.createdAt)}
                      {mine ? (
                        m.status === "read" ? (
                          <CheckCheck className="h-3 w-3 text-primary" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )
                      ) : null}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {messages.length === 0 ? (
            <p className="mx-auto w-fit rounded-lg bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              No messages yet
            </p>
          ) : null}
          <div ref={endRef} />
        </div>

        {canned ? (
          <div className="space-y-1 border-t border-border/60 bg-card px-3 py-2">
            {CANNED.map((c) => (
              <button
                key={c}
                onClick={() => send(c)}
                className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-xs hover:bg-accent"
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}

        {emoji ? (
          <div className="grid grid-cols-12 gap-1 border-t border-border/60 bg-card px-3 py-2 text-lg">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setText((t) => t + e)}
                className="rounded hover:bg-accent"
              >
                {e}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-end gap-2 border-t border-border/60 bg-card p-2">
          <button
            onClick={() => setCanned((c) => !c)}
            aria-label="Quick replies"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full glass-soft text-primary"
          >
            <Zap className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-1 items-end gap-1 rounded-3xl border border-input bg-background px-3 py-1.5">
            <button
              onClick={() => setEmoji((e) => !e)}
              aria-label="Emoji"
              className="pb-1.5 text-muted-foreground"
            >
              <Smile className="h-5 w-5" />
            </button>
            <textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Reply as HopeX Support"
              className="max-h-24 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none"
            />
            <button
              onClick={() => fileRef.current?.click()}
              aria-label="Attach file"
              className="pb-1.5 text-muted-foreground"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f)
                  send("", { name: f.name, kind: f.type.startsWith("image") ? "image" : "file" });
                e.target.value = "";
              }}
            />
          </div>
          <button
            onClick={() => send()}
            aria-label="Send"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full gradient-brand text-primary-foreground"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* User panel */}
      {person && showInfo ? (
        <div className="glass hidden h-[34rem] flex-col gap-3 overflow-y-auto rounded-3xl p-4 xl:flex">
          <div className="text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full gradient-brand font-display text-lg font-black text-primary-foreground">
              {initials(person.name)}
            </span>
            <p className="mt-2 font-display text-lg font-extrabold">{person.name}</p>
            <p className="text-xs text-muted-foreground">{person.phone ?? person.email}</p>
          </div>
          <div className="space-y-1.5 rounded-2xl glass-soft p-3 text-sm">
            <Line label="Balance" value={money(person.balance)} />
            <Line label="Invested" value={money(person.invested)} />
            <Line label="Earnings" value={money(person.earnings)} />
            <Line label="Referral code" value={person.referralCode} />
            <Line label="Referred by" value={person.referredBy ?? "—"} />
            <Line
              label="Active plans"
              value={String(db.investments.filter((i) => i.userId === person.id).length)}
            />
            <Line
              label="Pending txns"
              value={String(
                db.transactions.filter(
                  (t) =>
                    t.userId === person.id && (t.status === "pending" || t.status === "processing"),
                ).length,
              )}
            />
            <Line label="Status" value={person.blocked ? "Frozen" : "Active"} />
          </div>

          <button
            onClick={() => {
              const v = prompt(`Add funds to ${person.name} (PKR)`, "1000");
              if (!v || isNaN(Number(v))) return;
              adjust(Number(v), "Admin credit");
              toast.success("Funds added.");
            }}
            className="btn-glass btn-glass-primary flex h-11 w-full items-center justify-center gap-2 text-xs font-bold"
          >
            <PlusCircle className="h-4 w-4" /> Add funds
          </button>
          <button
            onClick={() => {
              const v = prompt(`Deduct funds from ${person.name} (PKR)`, "1000");
              if (!v || isNaN(Number(v))) return;
              adjust(-Number(v), "Admin adjustment");
              toast.success("Funds deducted.");
            }}
            className="btn-glass flex h-11 w-full items-center justify-center gap-2 text-xs font-semibold text-foreground"
          >
            <MinusCircle className="h-4 w-4" /> Deduct funds
          </button>
          <button
            onClick={() => {
              const plan = db.plans.find((p) => p.active);
              if (!plan) return toast.error("No active plan available.");
              const v = prompt(
                `Activate ${plan.name} for ${person.name} — amount (PKR)`,
                String(plan.min),
              );
              if (!v || isNaN(Number(v))) return;
              update((d) => {
                d.investments.unshift({
                  id: newId(),
                  userId: person.id,
                  planId: plan.id,
                  planName: plan.name,
                  amount: Number(v),
                  dailyRoi: plan.dailyRoi,
                  durationDays: plan.durationDays,
                  earned: 0,
                  startedAt: timestamp(),
                  lastPayoutAt: timestamp(),
                });
                return d;
              });
              toast.success("Plan activated.");
            }}
            className="btn-glass flex h-11 w-full items-center justify-center gap-2 text-xs font-semibold text-foreground"
          >
            <Rocket className="h-4 w-4" /> Activate a plan
          </button>
          <button
            onClick={() => {
              update((d) => {
                const u = d.users.find((x) => x.id === person.id);
                if (u) u.blocked = !u.blocked;
                return d;
              });
              toast.success(person.blocked ? "Account unfrozen." : "Account frozen.");
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-destructive/15 text-xs font-bold text-destructive"
          >
            <Ban className="h-4 w-4" />
            {person.blocked ? "Unfreeze account" : "Freeze account"}
          </button>
          <button
            onClick={() => setShowInfo(false)}
            className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground"
          >
            <ChevronDown className="h-3 w-3" /> Hide details
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-semibold">{value}</span>
    </div>
  );
}
