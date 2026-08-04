import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const mask = (k: string) =>
  k.length <= 10 ? "•".repeat(k.length) : `${k.slice(0, 4)}${"•".repeat(10)}${k.slice(-4)}`;

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export type ApiKeyRow = {
  id: string;
  label: string;
  purpose: string;
  active: boolean;
  uploads: number;
  failures: number;
  bytes: number;
  last_used_at: string | null;
  last_error: string | null;
  created_at: string;
  masked: string;
  key?: string;
};

/** Admin: list all imgbb keys (masked unless `reveal`). */
export const listApiKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { reveal?: boolean } | undefined) => data ?? {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const keys: ApiKeyRow[] = (rows ?? []).map((r: any) => ({
      id: r.id,
      label: r.label,
      purpose: r.purpose,
      active: r.active,
      uploads: r.uploads,
      failures: r.failures,
      bytes: Number(r.bytes ?? 0),
      last_used_at: r.last_used_at,
      last_error: r.last_error,
      created_at: r.created_at,
      masked: mask(r.api_key),
      ...(data.reveal ? { key: r.api_key as string } : {}),
    }));

    const env = process.env.IMGBB_API_KEY;
    return {
      keys,
      fallback: env
        ? { masked: mask(env), ...(data.reveal ? { key: env } : {}) }
        : null,
    };
  });

/** Admin: add a new key (validated against imgbb before saving). */
export const addApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { key: string; label?: string; purpose?: string }) => {
    if (!data?.key || data.key.trim().length < 8) throw new Error("Enter a valid API key");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { verifyImgbbKey } = await import("@/lib/api-keys-verify.server");
    const check = await verifyImgbbKey(data.key.trim());
    if (!check.ok) throw new Error(check.error ?? "Key rejected by imgbb");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("api_keys").insert({
      provider: "imgbb",
      api_key: data.key.trim(),
      label: (data.label ?? "").trim() || "imgbb key",
      purpose: data.purpose ?? "all",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: enable/disable, rename, re-scope or delete a key. */
export const updateApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id: string;
      active?: boolean;
      label?: string;
      purpose?: string;
      remove?: boolean;
      resetStats?: boolean;
    }) => {
      if (!data?.id) throw new Error("Key id required");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.remove) {
      const { error } = await supabaseAdmin.from("api_keys").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const patch: {
      active?: boolean;
      label?: string;
      purpose?: string;
      uploads?: number;
      failures?: number;
      bytes?: number;
      last_error?: string | null;
    } = {};
    if (typeof data.active === "boolean") patch.active = data.active;
    if (data.label !== undefined) patch.label = data.label.trim() || "imgbb key";
    if (data.purpose !== undefined) patch.purpose = data.purpose;
    if (data.resetStats) {
      patch.uploads = 0;
      patch.failures = 0;
      patch.bytes = 0;
      patch.last_error = null;
    }
    const { error } = await supabaseAdmin.from("api_keys").update(patch).eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: live health check of a stored key. */
export const testApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("Key id required");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("api_keys")
      .select("api_key")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Key not found");
    const { verifyImgbbKey } = await import("@/lib/api-keys-verify.server");
    const check = await verifyImgbbKey(row.api_key as string);
    await supabaseAdmin
      .from("api_keys")
      .update({ last_error: check.ok ? null : (check.error ?? "Key rejected") })
      .eq("id", data.id);
    return check;
  });
