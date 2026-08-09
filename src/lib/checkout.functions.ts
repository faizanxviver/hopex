import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_BASE = "https://mintage.site";

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `tk_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function orderNo() {
  const d = new Date();
  const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `HX${stamp}${suffix}`;
}

/**
 * Creates a one-time checkout session and returns the external gateway URL.
 * The amount is stored server-side; the gateway can only read it through the token.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { amount: number }) => {
    const amount = Number(data?.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount");
    if (amount > 10_000_000) throw new Error("Amount is too large");
    return { amount: Math.round(amount) };
  })
  .handler(async ({ data, context }) => {
    const token = randomToken();
    const order = orderNo();

    const { error } = await context.supabase.from("checkout_sessions").insert({
      token,
      order_no: order,
      user_id: context.userId,
      amount: data.amount,
      status: "created",
    });
    if (error) throw new Error(error.message);

    return {
      token,
      orderNo: order,
      url: `${GATEWAY_BASE}/checkout?token=${encodeURIComponent(token)}`,
    };
  });
