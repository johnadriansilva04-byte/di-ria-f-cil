import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
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
    <section className="space-y-4">
      {/* Period Selector - Simplified */}
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

      {/* Main Balance Card - Cleaner Design */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(45% 120% at 100% 0%, oklch(0.65 0.12 255 / 0.14), transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Wallet className="size-3.5" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {listName}
            </p>
          </div>
          <p
            className={cn(
              "font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums tracking-tight sm:text-5xl",
              totals.balance < 0 ? "text-expense" : "text-foreground",
            )}
          >
            {brl(totals.balance)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {totals.count === 0
              ? "Nenhum lançamento neste período"
              : `${totals.count} ${totals.count === 1 ? "lançamento" : "lançamentos"}`}
          </p>
        </div>
      </div>

      {/* Income/Expense Summary - Simplified */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="size-3.5 text-income" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Receitas
            </p>
          </div>
          <p className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums text-income">
            {brl(totals.income)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="size-3.5 text-expense" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Despesas
            </p>
          </div>
          <p className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums text-expense">
            {brl(totals.expense)}
          </p>
        </div>
      </div>
    </section>
  );
}
