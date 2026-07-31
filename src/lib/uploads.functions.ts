import { createServerFn } from "@tanstack/react-start";

/**
 * Uploads a base64 image to imgbb and returns the hosted URL.
 * The API key stays on the server.
 */
export const uploadProofImage = createServerFn({ method: "POST" })
  .inputValidator((data: { base64: string; name?: string }) => {
    if (!data?.base64 || typeof data.base64 !== "string") throw new Error("Image is required");
    // ~10MB base64 ceiling
    if (data.base64.length > 14_000_000) throw new Error("Image is too large (max 10MB)");
    return data;
  })
  .handler(async ({ data }) => {
    const key = process.env.IMGBB_API_KEY;
    if (!key) throw new Error("Image hosting is not configured");

    const body = new FormData();
    body.append("key", key);
    body.append("image", data.base64);
    if (data.name) body.append("name", data.name.slice(0, 60));

    const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body });
    const json = (await res.json()) as {
      success?: boolean;
      data?: { url?: string; display_url?: string };
      error?: { message?: string };
    };
    if (!res.ok || !json.success || !json.data?.url) {
      throw new Error(json.error?.message ?? `Upload failed (${res.status})`);
    }
    return { url: json.data.display_url ?? json.data.url };
  });
