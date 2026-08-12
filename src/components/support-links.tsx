import { useState } from "react";
import { MessageCircle, ExternalLink, X, Send, Users, Megaphone, Smartphone, Headset, Link2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function SupportIcon() {
  const [open, setOpen] = useState(false);
  const { db } = useStore();
  const { t } = useT();

  const links = db.settings.supportLinks?.length > 0 ? db.settings.supportLinks : [
    { label: "WhatsApp Channel", url: "https://whatsapp.com/channel/..." },
    { label: "WhatsApp Group", url: "https://chat.whatsapp.com/..." },
    { label: "Support Chat", url: "https://wa.me/" + (db.settings.supportWhatsapp || "923000000000") },
  ];

  const getIcon = (label: string) => {
    if (label.includes("Channel")) return Megaphone;
    if (label.includes("Group")) return Users;
    if (label.includes("Support")) return Send;
    return Link2;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="grid h-10 w-10 place-items-center rounded-xl glass-soft text-primary transition-transform active:scale-95"
      >
        <Headset className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="animate-rise fixed inset-x-4 top-[4.5rem] z-[70] overflow-hidden rounded-3xl border border-border bg-popover/90 p-2 text-popover-foreground shadow-[var(--shadow-elegant)] backdrop-blur-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-64">
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
              <p className="font-display text-sm font-bold">{t("Support links")}</p>
              <button onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-1 p-1">
              {links.map((l) => {
                const Icon = getIcon(l.label);
                return (
                  <a
                    key={l.label}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-primary/10 group"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-xs font-bold">{t(l.label)}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 transition group-hover:opacity-50" />
                  </a>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
