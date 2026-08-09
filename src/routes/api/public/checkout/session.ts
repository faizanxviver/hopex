import { createFileRoute } from "@tanstack/react-router";

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
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "content-type,x-gateway-key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  } as Record<string, string>;
}

export const Route = createFileRoute("/api/public/checkout/session")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) }),

      GET: async ({ request }) => {
        const headers = {
          ...corsHeaders(request.headers.get("origin")),
          "content-type": "application/json",
        };
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), { status, headers });

        const token = new URL(request.url).searchParams.get("token") ?? "";
        if (!/^tk_[a-f0-9]{20,80}$/.test(token)) {
          return json({ status: "invalid", message: "Invalid token" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: session } = await supabaseAdmin
          .from("checkout_sessions")
          .select("token,order_no,amount,status,expires_at")
          .eq("token", token)
          .maybeSingle();

        if (!session) return json({ status: "invalid", message: "Unknown token" }, 404);
        if (session.status !== "created") {
          return json({ status: "consumed", message: "This checkout was already completed" }, 409);
        }
        if (new Date(session.expires_at).getTime() < Date.now()) {
          return json({ status: "expired", message: "This checkout session has expired" }, 410);
        }

        const { data: methods } = await supabaseAdmin
          .from("payment_methods")
          .select("id,name,account_name,account_number,instructions,image_url")
          .eq("active", true)
          .order("sort_order");

        return json({
          status: "ok",
          token: session.token,
          order_no: session.order_no,
          amount: Number(session.amount),
          currency: "PKR",
          merchant_name: "HopeX",
          return_url: "https://hopex.site/deposit-history",
          expires_at: session.expires_at,
          methods: (methods ?? []).map((m) => ({
            id: m.id,
            name: m.name,
            account_name: m.account_name,
            account_number: m.account_number,
            instructions: m.instructions,
            logo_url: m.image_url,
          })),
        });
      },
    },
  },
});
