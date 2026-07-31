import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { useStore, newId, timestamp } from "@/lib/store";

export function LiveChat() {
  const { db, user, update } = useStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const messages = db.chats.filter((c) => c.userId === (user?.id ?? "guest"));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open]);

  if (!user || user.role === "admin") return null;

  const send = () => {
    const value = text.trim();
    if (!value) return;
    setText("");
    update((d) => {
      d.chats.push({ id: newId(), userId: user.id, from: "user", text: value, createdAt: timestamp() });
      return d;
    });
    setTimeout(() => {
      update((d) => {
        d.chats.push({
          id: newId(),
          userId: user.id,
          from: "support",
          text: "Thanks for reaching out! A support specialist will review this and reply shortly.",
          createdAt: timestamp(),
        });
        return d;
      });
    }, 1100);
  };

  return (
    <>
      {open ? (
        <div className="animate-rise fixed bottom-24 right-4 z-50 flex h-[26rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl glass md:bottom-24">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">Live Support</p>
              <p className="text-xs text-success">● Online now</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m) => (
              <div key={m.id} className={m.from === "user" ? "flex justify-end" : "flex justify-start"}>
                <p
                  className={
                    m.from === "user"
                      ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "max-w-[80%] rounded-2xl rounded-bl-sm bg-secondary px-3 py-2 text-sm text-secondary-foreground"
                  }
                >
                  {m.text}
                </p>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="flex items-center gap-2 border-t border-border/60 p-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…"
              className="h-10 flex-1 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={send}
              aria-label="Send message"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-brand text-primary-foreground"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open live chat"
        className="fixed bottom-20 right-4 z-50 grid h-14 w-14 place-items-center rounded-full gradient-brand text-primary-foreground glow transition hover:scale-105 md:bottom-6"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </>
  );
}
