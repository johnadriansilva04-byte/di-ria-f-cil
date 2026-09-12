import { useMemo } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { brl, brlCompact, totalsByList, type Entry, type WalletList } from "@/lib/caixa";
import { cn } from "@/lib/utils";

interface HomeDonutChartProps {
  lists: WalletList[];
  entries: Entry[];
}

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
  "var(--income)",
  "var(--expense)",
];

const config = { recebido: { label: "Recebido" } } satisfies ChartConfig;

/** Pizza (donut) da visão geral: recebido de cada caixa como parte do conjunto. */
export function HomeDonutChart({ lists, entries }: HomeDonutChartProps) {
  const byList = useMemo(() => totalsByList(entries), [entries]);
  const data = useMemo(
    () =>
      lists
        .map((l) => ({
          name: l.name,
          value: Math.round(byList[l.id]?.income ?? 0),
        }))
        .filter((d) => d.value > 0),
    [lists, byList],
  );

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0 || data.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
            Gráfico geral
          </h2>
          <span className="text-[11px] text-muted-foreground">recebido por caixa</span>
        </header>
        <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/70 text-center">
          <p className="text-sm text-muted-foreground">Sem recebimentos ainda.</p>
          <p className="text-xs text-muted-foreground/60">
            Os recebidos dos seus caixas aparecem aqui.
          </p>
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
            recebido por caixa
          </span>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          total {brlCompact(total)}
        </span>
      </header>

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        {/* Donut */}
        <div className="relative size-44 shrink-0 sm:size-52">
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
                innerRadius="68%"
                outerRadius="100%"
                paddingAngle={3}
                strokeWidth={0}
              >
                {data.map((d, index) => (
                  <Cell key={d.name} fill={PALETTE[index % PALETTE.length] ?? PALETTE[0]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Recebido
            </span>
            <span className="mt-0.5 font-[family-name:var(--font-display)] text-lg font-bold tabular-nums sm:text-xl">
              {brlCompact(total)}
            </span>
          </div>
        </div>

        {/* Legenda */}
        <ul className="w-full min-w-0 flex-1 space-y-1.5">
          {data.map((d, index) => (
            <li key={d.name} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: PALETTE[index % PALETTE.length] ?? PALETTE[0] }}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {d.name}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground/60">
                {total > 0 ? ((d.value / total) * 100).toFixed(0).replace(".", ",") : "0"}%
              </span>
              <span
                className={cn(
                  "w-20 shrink-0 truncate text-right font-[family-name:var(--font-display)] text-sm font-bold tabular-nums",
                  d.value > 0 ? "text-income" : "text-muted-foreground/60",
                )}
              >
                {brlCompact(d.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
