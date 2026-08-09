import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Phone,
  Reply,
  Search,
  Send,
  Smile,
  Trash2,
  Video,
  X,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { useStore, newId, timestamp } from "@/lib/store";
import { ChatAttachment, ImageLightbox } from "@/components/chat-media";
import { uploadChatImage, useVoiceRecorder, formatDuration } from "@/lib/chat-media";
import type { ChatMessage } from "@/lib/store";
import { useTyping } from "@/lib/typing";
import { cn } from "@/lib/utils";

const EMOJIS = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😍",
  "🥰",
  "😎", "🤝", "👍", "👏", "🙏", "🔥", "💰", "💵", "📈", "📉", "✅", "❌", "❓", "😢", "😡", "🎉", "💎", "⏳", "📷", "🧾", "🏦", "🤔", "🙌", "💯", "⭐", "❤️", "🙌", "✨", "🚀", "📱", "🎁", "🔥"
  "🤝",
  "👍",
  "👏",
  "🙏",
  "🔥",
  "💰",
  "💵",
  "📈",
  "📉",
  "✅",
  "❌",
  "❓",
  "😢",
  "😡",
  "🎉",
  "💎",
  "⏳",
  "📷",
  "🧾",
  "🏦",
  "🤔",
  "🙌",
  "💯",
  "⭐",
];

const QUICK_REPLIES = [
  "Where is my deposit?",
  "How do withdrawals work?",
  "Explain referral levels",
  "My plan is not active",
];

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "TODAY";
  if (d.toDateString() === yest.toDateString()) return "YESTERDAY";
  return d
    .toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    .toUpperCase();
}

export function LiveChat() {
  const { db, user, update, chatOpen, setChatOpen } = useStore();
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState(false);
  const [attach, setAttach] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [menu, setMenu] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [reply, setReply] = useState<{ from: "user" | "support"; text: string } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const all = useMemo(
    () => db.chats.filter((c) => c.userId === (user?.id ?? "guest")),
    [db.chats, user?.id],
  );
  const messages = query.trim()
    ? all.filter((m) => m.text.toLowerCase().includes(query.trim().toLowerCase()))
    : all;

  const support = db.users.find((u) => u.role === "admin");
  const agentOnline = Boolean(support);

  useEffect(() => {
    if (chatOpen) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, chatOpen]);

  const { peerTyping, notifyTyping } = useTyping(user?.id ?? null, "user");

  /* Viewing the thread marks the agent's messages as read on our side. */
  useEffect(() => {
    if (!chatOpen || !user) return;
    const unread = all.some((c) => c.from === "support" && c.status !== "read");
    if (!unread) return;
    const t = setTimeout(() => {
      update((d) => {
        d.chats = d.chats.map((c) =>
          c.userId === user.id && c.from === "support" ? { ...c, status: "read" } : c,
        );
        return d;
      });
    }, 500);
    return () => clearTimeout(t);
  }, [chatOpen, user, all, update]);

  const { recording, seconds, start, stop, cancel } = useVoiceRecorder((url, secs) => {
    if (!user) return;
    update((d) => {
      d.chats.push({
        id: newId(),
        userId: user.id,
        createdAt: timestamp(),
        from: "user",
        text: "",
        status: "sent",
        attachment: { name: "Voice message", kind: "audio", url, duration: secs },
      });
      return d;
    });
    toast.success("Voice message sent!");
  });

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
    setAttach(false);
    const replyTo = reply ?? undefined;
    setReply(null);
    push({
      from: "user",
      text: body || (attachment?.name ?? ""),
      status: "sent",
      attachment,
      replyTo,
    });
  };

  const clearChat = () => {
    setMenu(false);
    update((d) => {
      d.chats = d.chats.filter((c) => c.userId !== user.id);
      return d;
    });
  };

  const sendImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Only images can be shared.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Image must be under 8MB.");
    setAttach(false);
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


  let lastDay = "";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-end sm:p-4">
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={() => setChatOpen(false)}
      />

      <div className="wa animate-rise relative flex h-full w-full flex-col overflow-hidden shadow-[var(--shadow-elegant)] sm:h-[min(42rem,92vh)] sm:w-[24.5rem] sm:rounded-2xl">
        {/* ---- Header ---- */}
        <div className="wa-header flex items-center gap-3 px-3 py-2.5">
          <button onClick={() => setChatOpen(false)} aria-label="Back" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500 text-emerald-950 font-display text-sm font-black">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[15px] font-semibold">HopeX Support</p>
            <p className="truncate text-[11px] opacity-80">
              {peerTyping ? "typing…" : agentOnline ? "online" : "typically replies in minutes"}
            </p>
          </div>
          <button aria-label="Video call" className="shrink-0 opacity-90">
            <Video className="h-[18px] w-[18px]" />
          </button>
          <button aria-label="Voice call" className="shrink-0 opacity-90">
            <Phone className="h-[17px] w-[17px]" />
          </button>
          <div className="relative shrink-0">
            <button
              aria-label="Chat menu"
              onClick={() => setMenu((m) => !m)}
              className="opacity-90"
            >
              <MoreVertical className="h-[18px] w-[18px]" />
            </button>
            {menu ? (
              <div className="absolute right-0 top-7 z-20 w-44 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-xl">
                <button
                  onClick={() => {
                    setMenu(false);
                    setSearching(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent"
                >
                  <Search className="h-4 w-4" /> Search
                </button>
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
                  <X className="h-4 w-4" /> Exit chat
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {searching ? (
          <div className="wa-panel flex items-center gap-2 px-3 py-2">
            <Search className="h-4 w-4 wa-dim" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in conversation…"
              className="h-8 flex-1 bg-transparent text-sm outline-none"
            />
            <button
              onClick={() => {
                setSearching(false);
                setQuery("");
              }}
              aria-label="Close search"
            >
              <X className="h-4 w-4 wa-dim" />
            </button>
          </div>
        ) : null}

        {/* ---- Messages ---- */}
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
          }}
          className="wa-wall relative flex-1 space-y-1.5 overflow-y-auto px-3 py-4"
        >
          <p className="wa-divider mx-auto w-fit rounded-md px-3 py-1 text-center text-[11px]">
            🔒 Messages are end-to-end encrypted
          </p>

          {messages.map((m, idx) => {
            const label = dayLabel(m.createdAt);
            const showDay = label !== lastDay;
            lastDay = label;
            const mine = m.from === "user";
            return (
              <div key={m.id} className="animate-in fade-in slide-in-from-bottom-1 duration-300" style={{ animationDelay: `${Math.min(idx * 50, 500)}ms` }}>
                {showDay ? (
                  <p className="wa-divider mx-auto my-3 w-fit rounded-md px-3 py-1 text-[11px] font-semibold">
                    {label}
                  </p>
                ) : null}
                <div
                  className={cn(
                    "group flex items-end gap-1",
                    mine ? "justify-end" : "justify-start",
                  )}
                >
                  {mine ? (
                    <button
                      onClick={() => setReply({ from: m.from, text: m.text })}
                      aria-label="Reply"
                      className="opacity-0 transition group-hover:opacity-100"
                    >
                      <Reply className="h-3.5 w-3.5 wa-dim" />
                    </button>
                  ) : null}
                  <div
                    className={cn(
                      "wa-bubble",
                      mine ? "wa-out wa-bubble-out" : "wa-in wa-bubble-in",
                    )}
                  >
                    {m.replyTo ? (
                      <div className="mb-1 rounded-md border-l-[3px] border-[var(--wa-green)] bg-black/5 px-2 py-1 text-[11px]">
                        <span className="block font-semibold text-[var(--wa-teal-2)]">
                          {m.replyTo.from === "user" ? "You" : "HopeX Support"}
                        </span>
                        <span className="line-clamp-2 wa-dim">{m.replyTo.text}</span>
                      </div>
                    ) : null}
                    {m.attachment ? (
                      <ChatAttachment
                        attachment={m.attachment}
                        mine={mine}
                        onOpenImage={setLightbox}
                      />
                    ) : null}
                    {m.text ? (
                      <span className="whitespace-pre-wrap font-bold leading-relaxed">{m.text}</span>
                    ) : null}
                    <span className="wa-meta">
                      {timeOf(m.createdAt)}
                      {mine ? (
                        m.status === "read" ? (
                          <CheckCheck className="h-[15px] w-[15px] text-[var(--wa-tick)]" />
                        ) : m.status === "delivered" ? (
                          <CheckCheck className="h-[15px] w-[15px]" />
                        ) : (
                          <Check className="h-[15px] w-[15px]" />
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
                      <Reply className="h-3.5 w-3.5 wa-dim" />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
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
          {uploading ? (
            <div className="flex justify-end">
              <div className="wa-bubble wa-out wa-bubble-out text-xs opacity-70">
                Uploading image…
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        {!atBottom ? (
          <button
            onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
            aria-label="Scroll to latest"
            className="absolute bottom-24 right-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-[var(--wa-in)] shadow-md"
          >
            <ChevronDown className="h-4 w-4 wa-dim" />
          </button>
        ) : null}

        {/* Quick replies */}
        {all.length < 3 ? (
          <div className="wa-panel flex gap-2 overflow-x-auto px-3 py-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="shrink-0 rounded-full border border-[var(--wa-green)]/50 bg-[var(--wa-green)]/10 px-3 py-1 text-xs font-medium text-[var(--wa-teal-2)]"
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}

        {/* Reply preview */}
        {reply ? (
          <div className="wa-panel flex items-center gap-2 px-3 py-2">
            <div className="min-w-0 flex-1 rounded-md border-l-[3px] border-[var(--wa-green)] bg-black/5 px-2 py-1 text-[11px]">
              <span className="block font-semibold text-[var(--wa-teal-2)]">
                {reply.from === "user" ? "You" : "HopeX Support"}
              </span>
              <span className="line-clamp-1 wa-dim">{reply.text}</span>
            </div>
            <button onClick={() => setReply(null)} aria-label="Cancel reply">
              <X className="h-4 w-4 wa-dim" />
            </button>
          </div>
        ) : null}

        {/* Attachment sheet */}
        {attach ? (
          <div className="wa-panel grid grid-cols-3 gap-2 px-4 py-3">
            {[
              { label: "Document", icon: FileText, tone: "#5157ae" },
              { label: "Gallery", icon: ImageIcon, tone: "#bf59cf" },
              { label: "Camera", icon: Camera, tone: "#d3396d" },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-1.5 text-[11px] wa-dim"
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-full text-white"
                  style={{ background: a.tone }}
                >
                  <a.icon className="h-5 w-5" />
                </span>
                {a.label}
              </button>
            ))}
          </div>
        ) : null}

        {/* Emoji tray */}
        {emoji ? (
          <div className="wa-panel grid grid-cols-8 gap-1 px-3 py-2 text-xl">
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

        {/* Composer */}
        <div className="wa-panel flex items-end gap-2 p-2 border-t border-white/5">
          {recording ? (
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-3xl bg-[var(--wa-in)] px-4 py-3">
              <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-destructive" />
              <span className="text-sm font-semibold tabular-nums">{formatDuration(seconds)}</span>
              <span className="truncate text-xs wa-dim">Recording… slide to cancel</span>
              <button
                onClick={cancel}
                className="ml-auto shrink-0 wa-dim"
                aria-label="Cancel recording"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 items-end gap-1 rounded-3xl bg-[var(--wa-in)] px-3 py-1.5">
              <button
                onClick={() => {
                  setEmoji((e) => !e);
                  setAttach(false);
                }}
                aria-label="Emoji"
                className="pb-1.5 wa-dim"
              >
                <Smile className="h-[22px] w-[22px]" />
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
                placeholder="Message"
                className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none"
              />
              <button
                onClick={() => {
                  setAttach((a) => !a);
                  setEmoji(false);
                }}
                aria-label="Attach"
                className="pb-1.5 wa-dim"
              >
                <Paperclip className="h-[21px] w-[21px] -rotate-45" />
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                aria-label="Camera"
                className="pb-1.5 wa-dim"
              >
                <Camera className="h-[21px] w-[21px]" />
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void sendImage(f);
                }}
              />
            </div>
          )}
          <button
            onClick={() => {
              if (recording) return stop();
              if (text.trim()) return send();
              void start().catch((e) =>
                toast.error(e instanceof Error ? e.message : "Microphone permission denied."),
              );
            }}
            disabled={uploading}
            aria-label={
              recording
                ? "Send voice message"
                : text.trim()
                  ? "Send message"
                  : "Record voice message"
            }
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--wa-teal-2)] text-white disabled:opacity-60"
          >
            {recording || text.trim() ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {lightbox ? <ImageLightbox url={lightbox} onClose={() => setLightbox(null)} /> : null}
    </div>
  );
}
