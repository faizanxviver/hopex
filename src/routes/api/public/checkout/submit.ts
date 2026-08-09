import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const ALLOWED_ORIGINS = [
  "https://mintage.site",
  "https://www.mintage.site",
  "https://freebuff.com",
  "https://www.freebuff.com",
];

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]!;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type,x-gateway-key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  } as Record<string, string>;
}

const bodySchema = z.object({
  token: z.string().regex(/^tk_[a-f0-9]{20,80}$/),
  method_id: z.string().max(80).optional(),
  method_name: z.string().trim().min(1).max(60),
  proof_url: z.string().url().max(500),
  gateway_reference: z.string().trim().max(60).optional(),
});

/** Constant-time string compare (no length leak beyond equality). */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/checkout/submit")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) }),

      POST: async ({ request }) => {
        const headers = {
          ...corsHeaders(request.headers.get("origin")),
          "content-type": "application/json",
        };
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), { status, headers });

        const sharedKey = process.env["GATEWAY_SHARED_SECRET"] ?? "";
        if (!sharedKey) {
          return json({ status: "misconfigured", message: "Gateway secret not configured" }, 503);
        }
        const provided =
          request.headers.get("x-gateway-key") ?? request.headers.get("x-gateway-secret") ?? "";
        if (!safeEqual(provided, sharedKey)) {
          return json({ status: "unauthorized", message: "Invalid gateway key" }, 401);
        }

        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return json({ status: "invalid", message: "Invalid request body" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: session } = await supabaseAdmin
          .from("checkout_sessions")
          .select("id,user_id,amount,order_no,status,expires_at")
          .eq("token", parsed.token)
          .maybeSingle();

        if (!session) return json({ status: "invalid", message: "Unknown token" }, 404);
        if (session.status !== "created") {
          return json({ status: "consumed", message: "Already submitted" }, 409);
        }
        if (new Date(session.expires_at).getTime() < Date.now()) {
          await supabaseAdmin
            .from("checkout_sessions")
            .update({ status: "expired" })
            .eq("id", session.id);
          return json({ status: "expired", message: "Session expired" }, 410);
        }

        const amount = Number(session.amount);
        const reference = parsed.gateway_reference || session.order_no;

        const { data: tx, error: txError } = await supabaseAdmin
          .from("transactions")
          .insert({
            user_id: session.user_id,
            type: "deposit",
            amount,
            method: parsed.method_name,
            status: "processing",
            reference,
            proof_url: parsed.proof_url,
            note: `MPay auto gateway · order ${session.order_no}`,
          })
          .select("id")
          .single();

        if (txError) return json({ status: "error", message: txError.message }, 500);

        await supabaseAdmin
          .from("checkout_sessions")
          .update({
            status: "submitted",
            method_id: parsed.method_id ?? null,
            method_name: parsed.method_name,
            proof_url: parsed.proof_url,
            gateway_reference: reference,
            transaction_id: tx.id,
          })
          .eq("id", session.id);

        await supabaseAdmin.from("notifications").insert({
          user_id: session.user_id,
          title: "MPay deposit received",
          body: `Rs ${amount.toLocaleString("en-PK")} via ${parsed.method_name} (MPay) is being verified.`,
          kind: "info",
        });

        return json({ status: "ok", reference, amount });
      },
    },
  },
});
