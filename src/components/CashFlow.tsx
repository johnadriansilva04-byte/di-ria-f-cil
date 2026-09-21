import { useMemo } from "react";
import { ArrowDownCircle, ArrowUpCircle, Wallet, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { brl, PERIODS, type Entry, filterByPeriod, type Period } from "@/lib/caixa";

interface CashFlowProps {
  entries: Entry[];
  period?: Period;
}

export function CashFlow({ entries, period = "mes" }: CashFlowProps) {
  const periodEntries = useMemo(() => filterByPeriod(entries, period), [entries, period]);

  const flow = useMemo(() => {
    const income = periodEntries.filter((e) => e.kind === "entrada").reduce((sum, e) => sum + e.amount, 0);
    const expense = periodEntries.filter((e) => e.kind === "saida").reduce((sum, e) => sum + e.amount, 0);
    const net = income - expense;
    const flowRate = income > 0 ? (net / income) * 100 : 0;

    return { income, expense, net, flowRate };
  }, [periodEntries]);

  // O período é a razão de existir deste card: sem dizer qual é, os números
  // parecem repetir o hero (que é o acumulado de tudo).
  const periodoLabel = PERIODS.find((p) => p.id === period)?.label ?? "Este mês";

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wallet className="size-4" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
            Fluxo de Caixa
          </h2>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          {periodoLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        <div className="rounded-xl border border-border/50 bg-secondary/30 p-2.5 sm:p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <ArrowUpCircle className="size-3.5 shrink-0 text-income" />
            <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Entradas
            </span>
          </div>
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-income sm:text-base">
            {brl(flow.income)}
          </p>
        </div>

        <div className="rounded-xl border border-border/50 bg-secondary/30 p-2.5 sm:p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <ArrowDownCircle className="size-3.5 shrink-0 text-expense" />
            <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Saídas
            </span>
          </div>
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-expense sm:text-base">
            {brl(flow.expense)}
          </p>
        </div>

        <div className="rounded-xl border border-border/50 bg-secondary/30 p-2.5 sm:p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <TrendingUp className={cn("size-3.5 shrink-0", flow.net >= 0 ? "text-income" : "text-expense")} />
            <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Sobrou
            </span>
          </div>
          <p
            className={cn(
              "font-[family-name:var(--font-display)] text-sm font-bold tabular-nums sm:text-base",
              flow.net >= 0 ? "text-income" : "text-expense",
            )}
          >
            {brl(flow.net)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/50 py-3">
        <span className="text-xs text-muted-foreground">Guardado do que entrou</span>
        <div className="flex items-center gap-2">
          <div className="h-2 w-20 overflow-hidden rounded-full bg-secondary sm:w-24">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                flow.flowRate >= 20 ? "bg-income" : flow.flowRate >= 0 ? "bg-yellow-500" : "bg-expense",
              )}
              style={{ width: `${Math.min(Math.abs(flow.flowRate), 100)}%` }}
            />
          </div>
          <span
            className={cn(
              "text-xs font-bold tabular-nums",
              flow.flowRate >= 20 ? "text-income" : flow.flowRate >= 0 ? "text-yellow-500" : "text-expense",
            )}
          >
            {flow.flowRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </section>
  );
}
