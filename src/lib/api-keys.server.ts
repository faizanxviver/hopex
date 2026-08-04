/** Server-only helpers for the imgbb API key pool. */

export type PoolKey = {
  id: string;
  label: string;
  api_key: string;
  purpose: string;
  uploads: number;
};

/** Returns active keys for a purpose, least-used first (simple load spreading). */
export async function pickKeys(purpose: string): Promise<PoolKey[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("api_keys")
      .select("id,label,api_key,purpose,uploads")
      .eq("provider", "imgbb")
      .eq("active", true)
      .in("purpose", ["all", purpose])
      .order("uploads", { ascending: true });
    return (data ?? []) as PoolKey[];
  } catch {
    return [];
  }
}

export async function recordUsage(id: string, ok: boolean, bytes: number, error?: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("api_keys")
      .select("uploads,failures,bytes")
      .eq("id", id)
      .maybeSingle();
    if (!data) return;
    await supabaseAdmin
      .from("api_keys")
      .update({
        uploads: data.uploads + (ok ? 1 : 0),
        failures: data.failures + (ok ? 0 : 1),
        bytes: Number(data.bytes ?? 0) + (ok ? bytes : 0),
        last_used_at: new Date().toISOString(),
        last_error: ok ? null : (error ?? "Upload failed").slice(0, 300),
      })
      .eq("id", id);
  } catch {
    /* usage stats are best-effort */
  }
}
