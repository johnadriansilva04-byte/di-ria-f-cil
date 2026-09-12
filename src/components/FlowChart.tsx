import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { brl, brlCompact, type MonthPoint } from "@/lib/caixa";

const config = {
  income: { label: "Recebido", color: "var(--income)" },
  expense: { label: "Gasto", color: "var(--expense)" },
} satisfies ChartConfig;

const chartConfig = config;

interface FlowBarsProps {
  data: MonthPoint[];
  compact?: boolean;
}

/** Só as barras do fluxo — reaproveitadas no dashboard e na entrada do app. */
export function FlowBars({ data, compact = false }: FlowBarsProps) {
  return (
    <ChartContainer
      config={chartConfig}
      className={compact ? "h-32 w-full aspect-auto sm:h-40" : "h-52 w-full aspect-auto sm:h-64"}
    >
      <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={58}
          tickFormatter={(value: number) => brlCompact(value)}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.3 }}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
            color: "var(--foreground)",
          }}
          labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
          formatter={(value, name) => [
            brl(Number(value)),
            name === "income" ? "Recebido" : "Gasto",
          ]}
        />
        <Bar dataKey="income" fill="var(--income)" radius={[5, 5, 0, 0]} maxBarSize={38} />
        <Bar dataKey="expense" fill="var(--expense)" radius={[5, 5, 0, 0]} maxBarSize={38} />
      </BarChart>
    </ChartContainer>
  );
}

interface FlowChartProps {
  data: MonthPoint[];
  listName: string;
}

/** Fluxo dos últimos 6 meses — sempre só da lista ativa. */
export function FlowChart({ data, listName }: FlowChartProps) {
  const hasData = data.some((d) => d.income > 0 || d.expense > 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="size-3.5" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
            Últimos 6 meses
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-income" /> Recebido
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-expense" /> Gasto
          </span>
        </div>
      </header>{" "}
      {hasData ? (
        <FlowBars data={data} />
      ) : (
        <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/70 text-center">
          <p className="text-sm text-muted-foreground">Sem movimentação nos últimos 6 meses</p>
          <p className="text-xs text-muted-foreground/60">
            Os lançamentos de {listName} aparecem aqui.
          </p>
        </div>
      )}
    </section>
  );
}
