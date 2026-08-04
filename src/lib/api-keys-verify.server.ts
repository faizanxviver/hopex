/** Server-only imgbb key verification (1x1 px test upload). */
const PIXEL =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export async function verifyImgbbKey(key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const body = new FormData();
    body.append("key", key);
    body.append("image", PIXEL);
    body.append("expiration", "60");
    const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body });
    const json = (await res.json()) as {
      success?: boolean;
      error?: { message?: string };
    };
    if (res.ok && json.success) return { ok: true };
    return { ok: false, error: json.error?.message ?? `Rejected (${res.status})` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
