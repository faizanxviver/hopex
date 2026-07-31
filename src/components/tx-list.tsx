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
    <div className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", TINT[tx.type])}>
        <Icon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold capitalize">{tx.method || tx.type}</p>
        <p className="truncate text-xs text-muted-foreground">
          {new Date(tx.createdAt).toLocaleString()}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <StatusBadge status={tx.status} />
          {tx.proofUrl ? (
            <a
              href={tx.proofUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              <ImageIcon className="h-3 w-3" /> proof
            </a>
          ) : null}
        </div>
      </div>

      <p
        className={cn(
          "shrink-0 font-display text-base font-extrabold tabular-nums",
          isDebit(tx) ? "text-destructive" : "text-success",
        )}
      >
        {isDebit(tx) ? "−" : "+"}
        {money(tx.amount)}
      </p>
    </div>
  );
}

export function TxList({ rows, empty }: { rows: Transaction[]; empty: React.ReactNode }) {
  if (!rows.length) {
    return (
      <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">{empty}</div>
    );
  }
  return (
    <div className="grid gap-3">
      {rows.map((t) => (
        <TxRow key={t.id} tx={t} />
      ))}
    </div>
  );
}
