import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { brl, brlCompact, totalsByList, type Entry, type WalletList } from "@/lib/caixa";
import { cn } from "@/lib/utils";

interface HomeDonutChartProps {
  lists: WalletList[];
  entries: Entry[];
  onOpenList?: (id: string) => void;
  onOpenSidebar?: () => void;
}

const DONUT_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
  "var(--income)",
  "var(--expense)",
];

const config = { resultado: { label: "Resultado" } } satisfies ChartConfig;

/**
 * Gráfico geral (donut) da Home: o RESULTADO de cada caixa como fatia.

 * Os CARDS dos caixas ficam à esquerda como legenda compacta (cada um com a
 * bolinha da cor da sua fatia) e o donut fica à direita. Clicar em um card abre o caixa.
 */
export function HomeDonutChart({ lists, entries, onOpenList, onOpenSidebar }: HomeDonutChartProps) {
  const byList = useMemo(() => totalsByList(entries), [entries]);
  const data = useMemo(
    () =>
      lists.map((l) => ({
        id: l.id,
        name: l.name,
        value: Math.abs(Math.round(byList[l.id]?.balance ?? 0)),
      })),
    [lists, byList],
  );

  const totalAbs = data.reduce((sum, d) => sum + d.value, 0);
  const totalBalance = lists.reduce((sum, l) => sum + (byList[l.id]?.balance ?? 0), 0);

  if (lists.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
            Gráfico geral
          </h2>
          <span className="text-[11px] text-muted-foreground">resultado por caixa</span>
        </header>
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 px-5 py-10 text-center">
          <p className="text-sm font-medium text-foreground">Você ainda não tem caixas.</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Crie uma lista na barra lateral para começar a lançar..
          </p>
          {onOpenSidebar ? (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="mt-1 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] lg:hidden"
            >
              Criar primeiro caixa
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
            Gráfico geral
          </h2>
          <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            resultado por caixa
          </span>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          total {brlCompact(totalAbs)}
        </span>
      </header>

      {/* Cards dos caixas (legenda) à esquerda + donut à direita */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <ul className="flex w-full flex-col gap-2">
          {data.map((d, index) => {
            const s = byList[d.id] ?? {
              income: 0,
              expense: 0,
              balance: 0,
              count: 0,
            };
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => onOpenList?.(d.id)}
                  aria-label={`Abrir caixa ${d.name}`}
                  className="group flex w-full items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-2 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      background: DONUT_PALETTE[index % DONUT_PALETTE.length] ?? DONUT_PALETTE[0],
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold leading-tight">{d.name}</span>
                    <span className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground/70">
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="size-3 text-income" />
                        {brlCompact(s.income)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <TrendingDown className="size-3 text-expense" />
                        {brlCompact(s.expense)}
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-[family-name:var(--font-display)] text-xs font-bold tabular-nums leading-tight",
                      s.balance < 0
                        ? "text-expense"
                        : s.balance > 0
                          ? "text-income"
                          : "text-muted-foreground/60",
                    )}
                  >
                    {s.balance >= 0 ? "+" : "−"} {brlCompact(Math.abs(s.balance))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Donut à direita */}
        <div className="flex justify-center lg:justify-end">
          <div className="relative size-44 sm:size-52 lg:size-56">
            {totalAbs > 0 ? (
              <ChartContainer config={config} className="aspect-auto size-full">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "var(--foreground)",
                    }}
                    formatter={(value) => brl(Number(value))}
                  />
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="70%"
                    outerRadius="100%"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {data.map((d, index) => (
                      <Cell
                        key={d.id}
                        fill={DONUT_PALETTE[index % DONUT_PALETTE.length] ?? DONUT_PALETTE[0]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div aria-hidden className="size-full rounded-full border-[14px] border-border/40" />
            )}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Resultado geral
              </span>
              <span
                className={cn(
                  "mt-0.5 font-[family-name:var(--font-display)] text-lg font-bold tabular-nums sm:text-xl",
                  totalBalance < 0
                    ? "text-expense"
                    : totalBalance > 0
                      ? "text-income"
                      : "text-muted-foreground/60",
                )}
              >
                {totalBalance >= 0 ? "+" : "−"} {brl(Math.abs(totalBalance))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
