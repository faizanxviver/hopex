import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Ban,
  Bell,
  BadgeCheck,
  Check,
  CheckCheck,
  Coins,
  MessagesSquare,
  MinusCircle,
  Paperclip,
  Mic,
  PenLine,
  PlusCircle,
  Rocket,
  Search,
  Send,
  ShieldCheck,
  Smile,
  SquarePen,
  Trash2,
  UserRound,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { toast } from "sonner";
import { money, newId, timestamp, useStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/store";
import { useTyping } from "@/lib/typing";
import { ChatAttachment, ImageLightbox } from "@/components/chat-media";
import { uploadChatImage, useVoiceRecorder, formatDuration } from "@/lib/chat-media";
import { cn } from "@/lib/utils";

const EMOJIS = [
  "👍",
  "🙏",
  "✅",
  "❌",
  "🔥",
  "💰",
  "📈",
  "🎉",
  "😀",
  "😎",
  "🤝",
  "💎",
  "⏳",
  "🧾",
  "🏦",
  "💯",
];

const CANNED = [
  "Assalam o Alaikum! HopeX support here — how can I help you today?",
  "Your deposit has been verified and credited ✅",
  "Please share a clear payment screenshot so we can verify it.",
  "Withdrawals are processed between 8:00 AM and 8:00 PM (PKT) once a plan is active.",
  "Your request has been forwarded to the finance team.",
  "Thank you for your patience — this is now resolved.",
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
  const { db, update, addNotification } = useStore();
  const [selected, setSelected] = useState<string>("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [emoji, setEmoji] = useState(false);
  const [canned, setCanned] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [showInfo, setShowInfo] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeQuery, setComposeQuery] = useState("");
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
        return { id, name: u?.name ?? "Unknown user", phone: u?.phone ?? "", user: u, last, unread, count: msgs.length };
      })
      .filter((t) => (filter === "unread" ? t.unread > 0 : true))
      .filter((t) =>
        q.trim()
          ? t.name.toLowerCase().includes(q.trim().toLowerCase()) ||
            t.phone.includes(q.trim())
          : true,
      )

      .sort((a, b) => (b.last?.createdAt ?? "").localeCompare(a.last?.createdAt ?? ""));
  }, [db.chats, db.users, q, filter]);

  const activeId = selected || threads[0]?.id || "";
  const messages = db.chats.filter((c) => c.userId === activeId);
  const person = db.users.find((u) => u.id === activeId);
  const totalUnread = db.chats.filter((c) => c.from === "user" && c.status !== "read").length;

  const contacts = db.users
    .filter((u) => u.role === "user")
    .filter((u) =>
      composeQuery.trim()
        ? `${u.name} ${u.phone ?? ""} ${u.email}`.toLowerCase().includes(composeQuery.toLowerCase())
        : true,
    );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeId]);

  const { peerTyping, notifyTyping } = useTyping(activeId || null, "support");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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

  const send = (value?: string, attachment?: ChatMessage["attachment"], to = activeId) => {
    if (!to) return;
    const body = (value ?? text).trim();
    if (!body && !attachment) return;

    setText("");
    setEmoji(false);
    setCanned(false);
    update((d) => {
      d.chats.push({
        id: newId(),
        userId: to,
        from: "support",
        text: body || (attachment?.name ?? ""),
        status: "sent",
        attachment,
        createdAt: timestamp(),
      });
      return d;
    });
  };

  const { recording, seconds, start, stop, cancel } = useVoiceRecorder((url, secs) => {
    send("", { name: "Voice message", kind: "audio", url, duration: secs });
  });

  const sendImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Only images can be shared.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Image must be under 8MB.");
    setUploading(true);
    try {
      const url = await uploadChatImage(file);
      send("", { name: file.name, kind: "image", url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
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
      {/* ---- Conversations ---- */}
      <div
        className={cn(
          "wa flex h-[32rem] flex-col overflow-hidden rounded-2xl sm:h-[34rem] lg:flex",
          selected && "hidden lg:flex",
        )}
      >
        <div className="wa-header flex items-center gap-2 px-4 py-3">
          <MessagesSquare className="h-4 w-4" />
          <p className="text-sm font-bold">Inbox</p>
          {totalUnread ? (
            <span className="rounded-full bg-[var(--wa-green)] px-2 py-0.5 text-[10px] font-bold text-white">
              {totalUnread}
            </span>
          ) : null}
          <button
            onClick={() => setComposeOpen(true)}
            aria-label="Start a new chat"
            className="ml-auto rounded-lg bg-white/15 p-1.5"
          >
            <SquarePen className="h-4 w-4" />
          </button>
        </div>

        <div className="wa-panel space-y-2 px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-[var(--wa-in)] px-3">
            <Search className="h-3.5 w-3.5 wa-dim" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or phone…"
              className="h-9 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <div className="inline-flex w-full gap-1">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 rounded-full py-1 text-xs font-semibold capitalize transition",
                  filter === f
                    ? "bg-[var(--wa-green)]/20 text-[var(--wa-teal-2)]"
                    : "wa-dim hover:bg-black/5",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="wa-panel flex-1 overflow-y-auto pb-2">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                activeId === t.id ? "bg-black/5" : "hover:bg-black/[0.03]",
              )}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--wa-teal-2)] text-xs font-black text-white">
                {initials(t.name)}
              </span>
              <span className="min-w-0 flex-1 border-b border-black/5 pb-2">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{t.name}</span>
                  <span className="ml-auto shrink-0 text-[10px] wa-dim">
                    {t.last ? timeOf(t.last.createdAt) : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="line-clamp-1 flex-1 text-xs wa-dim">
                    {t.last?.from === "support" ? "You: " : ""}
                    {t.last?.text ?? "No messages"}
                  </span>
                  {t.unread ? (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[var(--wa-green)] px-1 text-[10px] font-bold text-white">
                      {t.unread}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          ))}
          {threads.length === 0 ? <p className="p-4 text-sm wa-dim">No conversations.</p> : null}
        </div>
      </div>

      {/* ---- Thread ---- */}
      <div
        className={cn(
          "wa flex h-[32rem] flex-col overflow-hidden rounded-2xl sm:h-[34rem]",
          !selected && "hidden lg:flex",
        )}
      >
        <div className="wa-header flex items-center gap-3 px-3 py-2.5">
          <button
            onClick={() => setSelected("")}
            aria-label="Back to inbox"
            className="shrink-0 lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-black">
            {person ? initials(person.name) : "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{person?.name ?? "Select a chat"}</p>
            <p className="truncate text-[11px] opacity-80">
              {peerTyping
                ? "typing…"
                : person
                  ? `${person.phone ?? person.email} · ${money(person.balance)}`
                  : "—"}
            </p>
          </div>
          <button
            onClick={() => setShowInfo((s) => !s)}
            aria-label="User details"
            className="hidden shrink-0 rounded-lg bg-white/15 p-1.5 xl:block"
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
            className="shrink-0 rounded-lg bg-white/15 p-1.5"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="wa-wall flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
          {messages.map((m) => {
            const label = dayLabel(m.createdAt);
            const showDay = label !== lastDay;
            lastDay = label;
            const mine = m.from === "support";
            return (
              <div key={m.id}>
                {showDay ? (
                  <p className="wa-divider mx-auto my-3 w-fit rounded-md px-3 py-1 text-[11px] font-semibold">
                    {label}
                  </p>
                ) : null}
                <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "wa-bubble",
                      mine ? "wa-out wa-bubble-out" : "wa-in wa-bubble-in",
                    )}
                  >
                    {m.attachment ? (
                      <ChatAttachment
                        attachment={m.attachment}
                        mine={mine}
                        onOpenImage={setLightbox}
                      />
                    ) : null}
                    {m.text && m.text !== m.attachment?.name ? (
                      <span className="whitespace-pre-wrap font-semibold">{m.text}</span>
                    ) : null}
                    <span className="wa-meta">
                      {timeOf(m.createdAt)}
                      {mine ? (
                        m.status === "read" ? (
                          <CheckCheck className="h-[15px] w-[15px] text-[var(--wa-tick)]" />
                        ) : (
                          <Check className="h-[15px] w-[15px]" />
                        )
                      ) : null}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {messages.length === 0 ? (
            <p className="wa-divider mx-auto w-fit rounded-md px-3 py-1 text-xs">No messages yet</p>
          ) : null}
          {peerTyping ? (
            <div className="flex justify-start">
              <div className="wa-bubble wa-in wa-bubble-in flex items-center gap-1 py-2.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-50"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        {canned ? (
          <div className="wa-panel space-y-1 px-3 py-2">
            {CANNED.map((c) => (
              <button
                key={c}
                onClick={() => send(c)}
                className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-xs hover:bg-black/5"
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}

        {emoji ? (
          <div className="wa-panel grid grid-cols-8 gap-1 px-3 py-2 text-lg">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setText((t) => t + e)}
                className="rounded hover:bg-black/5"
              >
                {e}
              </button>
            ))}
          </div>
        ) : null}

        <div className="wa-panel flex items-end gap-2 p-2">
          <button
            onClick={() => setCanned((c) => !c)}
            aria-label="Quick replies"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--wa-in)] text-[var(--wa-teal-2)]"
          >
            <Zap className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-1 items-end gap-1 rounded-3xl bg-[var(--wa-in)] px-3 py-1.5">
            <button
              onClick={() => setEmoji((e) => !e)}
              aria-label="Emoji"
              className="pb-1.5 wa-dim"
            >
              <Smile className="h-5 w-5" />
            </button>
            <textarea
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                notifyTyping();
              }}
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
              className="pb-1.5 wa-dim"
            >
              <Paperclip className="h-5 w-5 -rotate-45" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void sendImage(f);
              }}
            />
          </div>
          {recording ? (
            <div className="flex items-center gap-2 rounded-full bg-[var(--wa-in)] px-3 py-2 text-xs font-semibold">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
              <span className="tabular-nums">{formatDuration(seconds)}</span>
              <button onClick={cancel} className="wa-dim" aria-label="Cancel recording">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <button
            onClick={() => {
              if (recording) return stop();
              if (text.trim()) return send();
              void start().catch((e) =>
                toast.error(e instanceof Error ? e.message : "Microphone permission denied."),
              );
            }}
            disabled={uploading}
            aria-label={recording ? "Send voice message" : "Send"}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--wa-teal-2)] text-white disabled:opacity-60"
          >
            {recording || text.trim() ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ---- User control panel ---- */}
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
              label="Plans"
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
            <Line
              label="Payout"
              value={
                person.accountNumber ? `${person.bankName} · ${person.accountNumber}` : "Not bound"
              }
            />
            <Line label="Status" value={person.blocked ? "Frozen" : "Active"} />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <Action
              icon={PlusCircle}
              label="Add funds"
              onClick={() => {
                const v = prompt(`Add funds to ${person.name} (PKR)`, "1000");
                if (!v || isNaN(Number(v))) return;
                adjust(Number(v), "Admin credit");
                addNotification(person.id, {
                  title: "Funds added",
                  body: `${money(Number(v))} was credited by support.`,
                  kind: "success",
                });
                toast.success("Funds added.");
              }}
              primary
            />
            <Action
              icon={MinusCircle}
              label="Deduct funds"
              onClick={() => {
                const v = prompt(`Deduct funds from ${person.name} (PKR)`, "1000");
                if (!v || isNaN(Number(v))) return;
                adjust(-Number(v), "Admin adjustment");
                toast.success("Funds deducted.");
              }}
            />
          </div>


          <div className="grid grid-cols-2 gap-2 mt-2">
            <Action
              icon={Wallet}
              label="Set balance"
              onClick={() => {
                const v = prompt(`Set balance for ${person.name}`, String(person.balance));
                if (v == null || isNaN(Number(v))) return;
                update((d) => {
                  const u = d.users.find((x) => x.id === person.id);
                  if (u) u.balance = Number(v);
                  return d;
                });
                toast.success("Balance updated.");
              }}
            />
            <Action
              icon={ShieldCheck}
              label="Reset Pwd"
              onClick={async () => {
                const next = prompt(`Enter new password for ${person.name}`, "hopex123");
                if (!next) return;
                // Simulating password reset since migration-based RPC isn't available
                toast.success("Password reset simulated for: " + next);
              }}
            />

          </div>


          <Action
            icon={Rocket}
            label="Activate a plan"
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
          />

          <Action
            icon={Bell}
            label="Send notification"
            onClick={() => {
              const body = prompt(`Message to ${person.name}`);
              if (!body) return;
              addNotification(person.id, {
                title: "Message from HopeX",
                body,
                kind: "info",
                popup: true,
              });
              toast.success("Notification sent.");
            }}
          />

          <Action
            icon={PenLine}
            label="Reset payout account"
            onClick={() => {
              update((d) => {
                const u = d.users.find((x) => x.id === person.id);
                if (u) {
                  u.bankName = "";
                  u.accountName = "";
                  u.accountNumber = "";
                }
                return d;
              });
              toast.success("Payout account cleared — user can bind a new one.");
            }}
          />

          <Action
            icon={BadgeCheck}
            label={person.verified ? "Mark unverified" : "Mark verified"}
            onClick={() => {
              update((d) => {
                const u = d.users.find((x) => x.id === person.id);
                if (u) u.verified = !u.verified;
                return d;
              });
              toast.success("Verification updated.");
            }}
          />

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
        </div>
      ) : null}

      {/* ---- New chat sheet ---- */}
      {composeOpen ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
          onClick={() => setComposeOpen(false)}
        >
          <div
            className="glass w-full max-w-sm overflow-hidden rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
              <p className="text-sm font-bold">Start a new chat</p>
              <button onClick={() => setComposeOpen(false)} aria-label="Close" className="ml-auto">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-4 py-2">
              <input
                autoFocus
                value={composeQuery}
                onChange={(e) => setComposeQuery(e.target.value)}
                placeholder="Search members…"
                className="h-10 w-full rounded-xl border border-input bg-background/50 px-3 text-sm outline-none"
              />
            </div>
            <div className="max-h-72 overflow-y-auto px-2 pb-3">
              {contacts.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelected(u.id);
                    setComposeOpen(false);
                    setComposeQuery("");
                    if (!db.chats.some((c) => c.userId === u.id)) {
                      send(
                        "Hi 👋 HopeX support here — how can we help you today?",
                        undefined,
                        u.id,
                      );
                    }
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-accent"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full gradient-cool text-xs font-black text-primary-foreground">
                    {initials(u.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{u.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {u.phone ?? u.email}
                    </span>
                  </span>
                </button>
              ))}
              {contacts.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No members found.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {lightbox ? <ImageLightbox url={lightbox} onClose={() => setLightbox(null)} /> : null}
    </div>
  );
}

function Action({
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  icon: typeof PlusCircle;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "btn-glass flex h-11 w-full items-center justify-center gap-2 text-xs font-semibold",
        primary ? "btn-glass-primary font-bold" : "text-foreground",
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
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
