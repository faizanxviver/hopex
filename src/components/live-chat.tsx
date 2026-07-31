import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Mic,
  Paperclip,
  Search,
  Send,
  Smile,
  Trash2,
  X,
  Reply,
  MoreVertical,
  Phone,
  Video,
} from "lucide-react";
import { useStore, newId, timestamp } from "@/lib/store";
import type { ChatMessage } from "@/lib/store";
import { cn } from "@/lib/utils";

const EMOJIS = ["😀", "😂", "🥰", "😎", "🤝", "👍", "🙏", "🔥", "💰", "📈", "✅", "❓", "😢", "😡", "🎉", "💎"];

const AUTO_REPLIES = [
  "Thanks for reaching out! A support specialist is reviewing this right now.",
  "Got it ✅ — your request has been logged. Anything else I can help with?",
  "Deposits are usually approved within 1–24 hours after the screenshot is verified.",
  "Withdrawals are processed within 2 hours on business days once a plan is active.",
];

const QUICK_REPLIES = [
  "Where is my deposit?",
  "How do withdrawals work?",
  "Explain referral levels",
  "Talk to an agent",
];

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "TODAY";
  if (d.toDateString() === yest.toDateString()) return "YESTERDAY";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
}

export function LiveChat() {
  const { db, user, update, chatOpen, setChatOpen } = useStore();
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [emoji, setEmoji] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reply, setReply] = useState<{ from: "user" | "support"; text: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const all = useMemo(
    () => db.chats.filter((c) => c.userId === (user?.id ?? "guest")),
    [db.chats, user?.id],
  );
  const messages = query.trim()
    ? all.filter((m) => m.text.toLowerCase().includes(query.trim().toLowerCase()))
    : all;

  useEffect(() => {
    if (chatOpen) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, chatOpen, typing]);

  // Mark support messages as read once the window is open.
  useEffect(() => {
    if (!chatOpen || !user) return;
    const t = setTimeout(() => {
      update((d) => {
        d.chats = d.chats.map((c) =>
          c.userId === user.id && c.from === "user" ? { ...c, status: "read" } : c,
        );
        return d;
      });
    }, 900);
    return () => clearTimeout(t);
  }, [chatOpen, user, all.length, update]);

  if (!user || user.role === "admin" || !chatOpen) return null;

  const push = (msg: Omit<ChatMessage, "id" | "userId" | "createdAt">) =>
    update((d) => {
      d.chats.push({ id: newId(), userId: user.id, createdAt: timestamp(), ...msg });
      return d;
    });

  const send = (value?: string, attachment?: ChatMessage["attachment"]) => {
    const body = (value ?? text).trim();
    if (!body && !attachment) return;
    setText("");
    setEmoji(false);
    const replyTo = reply ?? undefined;
    setReply(null);
    push({ from: "user", text: body || (attachment?.name ?? ""), status: "sent", attachment, replyTo });

    setTimeout(() => setTyping(true), 500);
    setTimeout(() => {
      setTyping(false);
      push({
        from: "support",
        text: AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)],
        status: "read",
      });
    }, 2200);
  };

  const clearChat = () => {
    setMenu(false);
    update((d) => {
      d.chats = d.chats.filter((c) => c.userId !== user.id);
      d.chats.push({
        id: newId(),
        userId: user.id,
        from: "support",
        text: "Chat cleared. How can we help you today?",
        status: "read",
        createdAt: timestamp(),
      });
      return d;
    });
  };

  let lastDay = "";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-end sm:p-4">
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={() => setChatOpen(false)}
      />
      <div className="animate-rise relative flex h-full w-full flex-col overflow-hidden bg-card shadow-[var(--shadow-elegant)] sm:h-[min(40rem,90vh)] sm:w-[24rem] sm:rounded-3xl sm:border sm:border-border">
        {/* Header */}
        <div className="flex items-center gap-3 bg-[var(--gradient-cool)] px-3 py-2.5 text-primary-foreground">
          <button onClick={() => setChatOpen(false)} aria-label="Back" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-foreground/20 font-display text-sm font-black">
            A
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">HopeX Support</p>
            <p className="truncate text-[11px] opacity-90">{typing ? "typing…" : "online"}</p>
          </div>
          <button aria-label="Voice call" className="shrink-0 opacity-90">
            <Phone className="h-4 w-4" />
          </button>
          <button aria-label="Video call" className="shrink-0 opacity-90">
            <Video className="h-4 w-4" />
          </button>
          <button
            aria-label="Search messages"
            onClick={() => setSearching((s) => !s)}
            className="shrink-0 opacity-90"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            aria-label="Exit chat"
            onClick={() => setChatOpen(false)}
            className="shrink-0 rounded-lg bg-primary-foreground/15 p-1.5"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative shrink-0">
            <button aria-label="Chat menu" onClick={() => setMenu((m) => !m)} className="opacity-90">
              <MoreVertical className="h-4 w-4" />
            </button>
            {menu ? (
              <div className="absolute right-0 top-7 z-10 w-40 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
                <button
                  onClick={clearChat}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent"
                >
                  <Trash2 className="h-4 w-4" /> Clear chat
                </button>
                <button
                  onClick={() => {
                    setMenu(false);
                    setChatOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent"
                >
                  <X className="h-4 w-4" /> Close chat
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {searching ? (
          <div className="border-b border-border bg-card px-3 py-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in conversation…"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ) : null}

        {/* Messages */}
        <div className="chat-wallpaper flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
          <p className="mx-auto w-fit rounded-lg bg-warning/20 px-3 py-1 text-center text-[11px] text-foreground/80">
            🔒 Messages are end-to-end encrypted
          </p>
          {messages.map((m) => {
            const label = dayLabel(m.createdAt);
            const showDay = label !== lastDay;
            lastDay = label;
            const mine = m.from === "user";
            return (
              <div key={m.id}>
                {showDay ? (
                  <p className="mx-auto my-3 w-fit rounded-lg bg-background/70 px-3 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground">
                    {label}
                  </p>
                ) : null}
                <div className={cn("group flex items-end gap-1", mine ? "justify-end" : "justify-start")}>
                  {mine ? (
                    <button
                      onClick={() => setReply({ from: m.from, text: m.text })}
                      aria-label="Reply"
                      className="opacity-0 transition group-hover:opacity-100"
                    >
                      <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ) : null}
                  <div
                    className={cn(
                      "relative max-w-[80%] px-2.5 py-1.5 text-sm shadow-sm",
                      mine
                        ? "rounded-xl rounded-br-sm bg-[color-mix(in_oklab,var(--color-success)_28%,var(--color-card))] text-foreground"
                        : "rounded-xl rounded-bl-sm bg-card text-foreground",
                    )}
                  >
                    {m.replyTo ? (
                      <div className="mb-1 rounded-md border-l-2 border-primary bg-primary/10 px-2 py-1 text-[11px] text-muted-foreground">
                        <span className="block font-semibold text-primary">
                          {m.replyTo.from === "user" ? "You" : "HopeX Support"}
                        </span>
                        <span className="line-clamp-2">{m.replyTo.text}</span>
                      </div>
                    ) : null}
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
                        ) : m.status === "delivered" ? (
                          <CheckCheck className="h-3 w-3" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )
                      ) : null}
                    </span>
                  </div>
                  {!mine ? (
                    <button
                      onClick={() => setReply({ from: m.from, text: m.text })}
                      aria-label="Reply"
                      className="opacity-0 transition group-hover:opacity-100"
                    >
                      <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}

          {typing ? (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-xl rounded-bl-sm bg-card px-3 py-2.5 shadow-sm">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        {/* Quick replies */}
        {all.length < 3 ? (
          <div className="flex gap-2 overflow-x-auto border-t border-border bg-card px-3 py-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}

        {/* Reply preview */}
        {reply ? (
          <div className="flex items-center gap-2 border-t border-border bg-card px-3 py-2">
            <div className="min-w-0 flex-1 rounded-md border-l-2 border-primary bg-primary/10 px-2 py-1 text-[11px]">
              <span className="block font-semibold text-primary">
                {reply.from === "user" ? "You" : "HopeX Support"}
              </span>
              <span className="line-clamp-1 text-muted-foreground">{reply.text}</span>
            </div>
            <button onClick={() => setReply(null)} aria-label="Cancel reply">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : null}

        {/* Emoji tray */}
        {emoji ? (
          <div className="grid grid-cols-8 gap-1 border-t border-border bg-card px-3 py-2 text-xl">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => setText((t) => t + e)} className="rounded hover:bg-accent">
                {e}
              </button>
            ))}
          </div>
        ) : null}

        {/* Composer */}
        <div className="flex items-end gap-2 border-t border-border bg-card p-2">
          <div className="flex min-w-0 flex-1 items-end gap-1 rounded-3xl border border-input bg-background px-3 py-1.5">
            <button onClick={() => setEmoji((e) => !e)} aria-label="Emoji" className="pb-1.5 text-muted-foreground">
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
              placeholder="Message"
              className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none"
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
                if (f) send("", { name: f.name, kind: f.type.startsWith("image") ? "image" : "file" });
                e.target.value = "";
              }}
            />
          </div>
          <button
            onClick={() => (text.trim() ? send() : undefined)}
            aria-label={text.trim() ? "Send message" : "Voice message"}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full gradient-brand text-primary-foreground"
          >
            {text.trim() ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
