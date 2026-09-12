import { ListChecks, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { brl, PERIODS, type Period, type Totals } from "@/lib/caixa";
import { cn } from "@/lib/utils";

interface WalletSummaryProps {
  listName: string;
  totals: Totals;
  period: Period;
  onPeriodChange: (period: Period) => void;
}

export function WalletSummary({ listName, totals, period, onPeriodChange }: WalletSummaryProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPeriodChange(p.id)}
            aria-pressed={period === p.id}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              period === p.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(45% 120% at 100% 0%, oklch(0.65 0.12 255 / 0.14), transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Wallet className="size-3.5" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Saldo de {listName}
          </p>
        </div>
        <p
          className={cn(
            "relative mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums tracking-tight sm:text-5xl",
            totals.balance < 0 ? "text-expense" : "text-foreground",
          )}
        >
          {brl(totals.balance)}
        </p>
        <p className="relative mt-1.5 text-xs text-muted-foreground">
          {totals.count === 0
            ? "Nenhum lançamento neste período"
            : `${totals.count} ${totals.count === 1 ? "lançamento" : "lançamentos"} neste período · apenas desta lista`}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-income" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Recebido
            </p>
          </div>
          <p className="mt-1.5 truncate font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-income sm:text-lg">
            {brl(totals.income)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="size-3.5 text-expense" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Gasto
            </p>
          </div>
          <p className="mt-1.5 truncate font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-expense sm:text-lg">
            {brl(totals.expense)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
          <div className="flex items-center gap-1.5">
            <ListChecks className="size-3.5 text-primary" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Lançamentos
            </p>
          </div>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-base font-bold tabular-nums sm:text-lg">
            {totals.count}
          </p>
        </div>
      </div>
    </section>
  );
}
