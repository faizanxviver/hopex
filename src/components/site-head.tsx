import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Applies admin-controlled branding + SEO tags to the live document head. */
function upsertMeta(selector: string, attrs: Record<string, string>) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
}

export function SiteHead() {
  const { db } = useStore();
  const s = db.settings;

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (s.siteTitle) document.title = s.siteTitle;

    if (s.seoDescription) {
      upsertMeta('meta[name="description"]', { name: "description", content: s.seoDescription });
      upsertMeta('meta[property="og:description"]', {
        property: "og:description",
        content: s.seoDescription,
      });
    }
    if (s.seoKeywords)
      upsertMeta('meta[name="keywords"]', { name: "keywords", content: s.seoKeywords });
    if (s.siteTitle)
      upsertMeta('meta[property="og:title"]', { property: "og:title", content: s.siteTitle });

    const image = s.ogImage || s.siteLogo;
    if (image) {
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
      upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
    }

    const icon = s.siteFavicon || s.siteLogo;
    if (icon) {
      document.head
        .querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]')
        .forEach((l) => l.remove());
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = icon;
      document.head.appendChild(link);
      const apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      apple.href = icon;
      document.head.appendChild(apple);
    }
  }, [
    s.siteTitle,
    s.seoDescription,
    s.seoKeywords,
    s.ogImage,
    s.siteLogo,
    s.siteFavicon,
  ]);

  return null;
}
