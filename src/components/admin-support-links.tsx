import { useState } from "react";
import { Link2, Save } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass";
import { useStore } from "@/lib/store";

export function SupportLinksSettings() {
  const { db, update } = useStore();
  const [links, setLinks] = useState(db.settings.supportLinks || []);

  const save = () => {
    update((d) => {
      d.settings.supportLinks = links;
      return d;
    });
    toast.success("Support links updated.");
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border/40">
      <div className="flex items-center gap-2">
        <Link2 className="h-4.4 w-4 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Support Popup Links</h3>
      </div>
      
      <div className="space-y-3">
        {["WhatsApp Channel", "WhatsApp Group", "Telegram"].map((label) => {
          const current = links.find(l => l.label === label)?.url || "";
          return (
            <div key={label}>
              <label className="mb-1.5 block text-[10px] font-bold uppercase text-muted-foreground">{label} URL</label>
              <input
                value={current}
                onChange={(e) => {
                  const val = e.target.value;
                  setLinks(prev => {
                    const filtered = prev.filter(l => l.label !== label);
                    return [...filtered, { label, url: val }];
                  });
                }}
                placeholder="https://..."
                className="h-11 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
              />
            </div>
          );
        })}
        <button onClick={save} className="btn-glass btn-glass-primary h-11 w-full flex items-center justify-center gap-2 font-bold">
          <Save className="h-4 w-4" /> Save Links
        </button>
      </div>
    </div>
  );
}
