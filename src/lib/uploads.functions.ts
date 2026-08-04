import { createServerFn } from "@tanstack/react-start";

/**
 * Uploads a base64 image to imgbb and returns the hosted URL.
 * Keys come from the admin-managed pool (table `api_keys`); the
 * IMGBB_API_KEY secret is used as a fallback when the pool is empty.
 * If a key fails (quota, invalid), the next key in the pool is tried.
 */
export const uploadProofImage = createServerFn({ method: "POST" })
  .inputValidator((data: { base64: string; name?: string; purpose?: string }) => {
    if (!data?.base64 || typeof data.base64 !== "string") throw new Error("Image is required");
    // ~10MB base64 ceiling
    if (data.base64.length > 14_000_000) throw new Error("Image is too large (max 10MB)");
    return data;
  })
  .handler(async ({ data }) => {
    const { pickKeys, recordUsage } = await import("@/lib/api-keys.server");
    const purpose = data.purpose ?? "all";
    const pool = await pickKeys(purpose);
    const bytes = Math.round((data.base64.length * 3) / 4);

    const candidates: { id: string | null; key: string }[] = pool.map((k) => ({
      id: k.id,
      key: k.api_key,
    }));
    const envKey = process.env.IMGBB_API_KEY;
    if (envKey) candidates.push({ id: null, key: envKey });
    if (!candidates.length) throw new Error("Image hosting is not configured");

    let lastError = "Upload failed";
    for (const c of candidates) {
      try {
        const body = new FormData();
        body.append("key", c.key);
        body.append("image", data.base64);
        if (data.name) body.append("name", data.name.slice(0, 60));

        const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body });
        const json = (await res.json()) as {
          success?: boolean;
          data?: { url?: string; display_url?: string };
          error?: { message?: string };
        };
        if (res.ok && json.success && json.data?.url) {
          if (c.id) void recordUsage(c.id, true, bytes);
          return { url: json.data.display_url ?? json.data.url };
        }
        lastError = json.error?.message ?? `Upload failed (${res.status})`;
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Upload failed";
      }
      if (c.id) void recordUsage(c.id, false, 0, lastError);
    }
    throw new Error(lastError);
  });
