import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import "../styles.css";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider } from "@/lib/store";
import { LiveChat } from "@/components/live-chat";
import { SiteHead } from "@/components/site-head";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HopeX — Premium Investment Platform" },
      {
        name: "description",
        content:
          "HopeX is a premium investment platform with daily ROI plans, instant deposits, withdrawals and a 4-level referral program.",
      },
      { name: "author", content: "HopeX" },
      { property: "og:title", content: "HopeX — Premium Investment Platform" },
      {
        property: "og:description",
        content: "Daily ROI investment plans, secure wallet and a 4-level affiliate program.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "HopeX" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "index, follow" },
      {
        name: "keywords",
        content: "investment platform, daily roi, hopex, referral program, pakistan investment",
      },
      { name: "theme-color", content: "#0b1220" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "HopeX",
          url: "https://hopex.site",
          description:
            "HopeX is a premium investment platform with daily ROI plans, instant deposits, fast payouts and a 4-level referral program.",
        }),
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <SiteHead />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <LiveChat />
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast:
                "glass !rounded-2xl !border !border-primary/25 !bg-[color-mix(in_oklab,var(--card)_88%,var(--primary))] !text-foreground !shadow-[var(--shadow-elegant)] !backdrop-blur-xl",
              title: "!font-bold !text-foreground",
              description: "!text-muted-foreground",
              icon: "!text-primary",
              actionButton: "!bg-primary !text-primary-foreground !rounded-xl",
              cancelButton: "!bg-muted !text-muted-foreground !rounded-xl",
              success:
                "!border-success/40 !bg-[color-mix(in_oklab,var(--card)_86%,var(--success))] [&_[data-icon]]:!text-success",
              error:
                "!border-destructive/40 !bg-[color-mix(in_oklab,var(--card)_86%,var(--destructive))] [&_[data-icon]]:!text-destructive",
              warning:
                "!border-gold/45 !bg-[color-mix(in_oklab,var(--card)_86%,var(--gold))] [&_[data-icon]]:!text-gold",
              info: "!border-primary/40 !bg-[color-mix(in_oklab,var(--card)_88%,var(--primary))] [&_[data-icon]]:!text-primary",
            },
          }}
        />
      </StoreProvider>
    </QueryClientProvider>
  );
}
