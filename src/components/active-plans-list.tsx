import { Layers } from "lucide-react";
import { money, myInvestments, investmentProgress, useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Progress } from "@/components/ui/progress";
import { GlassCard } from "@/components/glass";

export function ActivePlansList({ userId }: { userId: string }) {
  const { db } = useStore();
  const { t } = useT();
  const investments = myInvestments(db, userId).slice(0, 5);

  if (!investments.length) return null;

  return (
    <section>
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {t("Active plans")}
      </p>
      <div className="space-y-3">
        {investments.map((inv) => {
          const { pct, daysLeft } = investmentProgress(inv);
          return (
            <GlassCard key={inv.id} className="p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Layers className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{inv.planName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {money(inv.amount)} · {daysLeft} {t("days left")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-success">+{money(inv.earned)}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">{t("Earned")}</p>
                </div>
              </div>
              <div className="mt-3">
                <Progress value={pct} className="h-1" />
              </div>
            </GlassCard>
          );
        })}
      </div>
    </section>
  );
}
