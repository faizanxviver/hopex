import { BellRing, Plus, Trash2 } from "lucide-react";
import { GUIDELINE_ICON_KEYS, GUIDELINE_TONES } from "@/components/guidelines-popup";
import { DEFAULT_GUIDELINES, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Admin editor for the dashboard "Platform Guidelines" notification popup. */
export function GuidelinesSettings() {
  const { db, update } = useStore();
  const items = db.settings.guidelines ?? [];

  const patch = (i: number, key: "icon" | "title" | "text" | "tone", value: string) =>
    update((d) => {
      const row = d.settings.guidelines[i];
      if (row) row[key] = value;
      return d;
    });

  return (
    <div className="rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold">
          <BellRing className="h-4 w-4 text-primary" /> Dashboard notification popup
        </p>
        <button
          onClick={() =>
            update((d) => {
              d.settings.guidelinesActive = !d.settings.guidelinesActive;
              return d;
            })
          }
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            db.settings.guidelinesActive
              ? "bg-success/15 text-success"
              : "bg-muted text-muted-foreground",
          )}
        >
          {db.settings.guidelinesActive ? "Live" : "Off"}
        </button>
      </div>

      <input
        defaultValue={db.settings.guidelinesTitle}
        onBlur={(e) =>
          update((d) => {
            d.settings.guidelinesTitle = e.target.value;
            return d;
          })
        }
        placeholder="Popup subtitle e.g. Platform Guidelines"
        className="mt-3 h-11 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
      />

      <div className="mt-3 space-y-3">
        {items.map((g, i) => (
          <div key={i} className="rounded-xl border border-border/50 p-3">
            <div className="flex gap-2">
              <select
                value={g.icon}
                onChange={(e) => patch(i, "icon", e.target.value)}
                className="h-10 flex-1 rounded-lg border border-input bg-background/40 px-2 text-xs outline-none"
              >
                {GUIDELINE_ICON_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <select
                value={g.tone}
                onChange={(e) => patch(i, "tone", e.target.value)}
                className="h-10 flex-1 rounded-lg border border-input bg-background/40 px-2 text-xs outline-none"
              >
                {GUIDELINE_TONES.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  update((d) => {
                    d.settings.guidelines = d.settings.guidelines.filter((_, x) => x !== i);
                    return d;
                  })
                }
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-destructive/12 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <input
              defaultValue={g.title}
              onBlur={(e) => patch(i, "title", e.target.value)}
              placeholder="Title"
              className="mt-2 h-10 w-full rounded-lg border border-input bg-background/40 px-3 text-xs outline-none"
            />
            <input
              defaultValue={g.text}
              onBlur={(e) => patch(i, "text", e.target.value)}
              placeholder="Description"
              className="mt-2 h-10 w-full rounded-lg border border-input bg-background/40 px-3 text-xs outline-none"
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() =>
            update((d) => {
              d.settings.guidelines = [
                ...d.settings.guidelines,
                { icon: "info", title: "New guideline", text: "Describe it here", tone: "primary" },
              ];
              return d;
            })
          }
          className="btn-glass flex h-10 items-center gap-1.5 px-4 text-xs font-bold text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add item
        </button>
        <button
          onClick={() =>
            update((d) => {
              d.settings.guidelines = DEFAULT_GUIDELINES.map((g) => ({ ...g }));
              return d;
            })
          }
          className="btn-glass h-10 px-4 text-xs font-bold text-muted-foreground"
        >
          Reset to defaults
        </button>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Live tokens: {"{minDeposit}"} {"{minWithdraw}"} {"{minPlan}"} {"{withdrawWindow}"}{" "}
        {"{siteName}"} — they always render the current platform values.
      </p>
    </div>
  );
}
