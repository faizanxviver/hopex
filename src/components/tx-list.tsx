import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Gem,
  Gift,
  HandCoins,
  UsersRound,
  Image as ImageIcon,
} from "lucide-react";
import type { Transaction } from "@/lib/store";
import { money } from "@/lib/store";
import { StatusBadge } from "@/components/glass";
import { cn } from "@/lib/utils";

const ICONS = {
  deposit: ArrowDownLeft,
  withdraw: ArrowUpRight,
  investment: Gem,
  commission: UsersRound,
  bonus: Gift,
  payout: HandCoins,
} as const;

const TINT = {
  deposit: "bg-success/15 text-success",
  withdraw: "bg-destructive/15 text-destructive",
  investment: "bg-primary/15 text-primary",
  commission: "bg-gold/20 text-gold",
  bonus: "bg-gold/20 text-gold",
  payout: "bg-success/15 text-success",
} as const;

const isDebit = (t: Transaction) => t.type === "withdraw" || t.type === "investment";

export function TxRow({ tx }: { tx: Transaction }) {
  const Icon = ICONS[tx.type] ?? HandCoins;
  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-4 transition-all hover:scale-[1.01] hover:bg-white/5 border border-white/5">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl shadow-lg", TINT[tx.type])}>
        <Icon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold capitalize tracking-tight">{tx.method || tx.type}</p>
          <StatusBadge status={tx.status} className="scale-75 origin-left" />
        </div>
        <p className="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">
          {new Date(tx.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {tx.proofUrl ? (
            <a
              href={tx.proofUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] font-bold text-primary uppercase tracking-tighter"
            >
              <ImageIcon className="h-2.5 w-2.5" /> Proof
            </a>
          ) : null}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p
          className={cn(
            "font-display text-base font-black tabular-nums tracking-tighter",
            isDebit(tx) ? "text-red-400" : "text-emerald-400",
          )}
        >
          {isDebit(tx) ? "−" : "+"}
          {money(tx.amount)}
        </p>
      </div>
    </div>
  );
}

export function TxList({ rows, empty }: { rows: Transaction[]; empty: React.ReactNode }) {
  if (!rows.length) {
    return (
      <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground border border-dashed border-white/10">
        {empty}
      </div>
    );
  }
  return (
    <div className="grid gap-2.5">
      {rows.map((t, i) => (
        <div key={t.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
          <TxRow tx={t} />
        </div>
      ))}
    </div>
  );
}
