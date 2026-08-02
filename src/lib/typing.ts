import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight realtime "typing…" indicator for a 1:1 support thread.
 * Both sides join the same channel keyed by the customer's user id.
 */
export function useTyping(threadId: string | null, me: "user" | "support") {
  const [peerTyping, setPeerTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSent = useRef(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!threadId) return;
    const channel = supabase.channel(`typing:${threadId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on("broadcast", { event: "typing" }, (payload) => {
      const from = (payload.payload as { from?: string })?.from;
      if (from === me) return;
      setPeerTyping(true);
      if (clearTimer.current) clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => setPeerTyping(false), 2500);
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      channelRef.current = null;
      setPeerTyping(false);
      void supabase.removeChannel(channel);
    };
  }, [threadId, me]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSent.current < 900) return;
    lastSent.current = now;
    void channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { from: me },
    });
  }, [me]);

  return { peerTyping, notifyTyping };
}
