import { useMemo, useState } from "react";
import { ArrowRight, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  balanceTrend,
  brl,
  brlCompact,
  familyEntriesOf,
  totalsByRoot,
  type Entry,
  type Totals,
  type WalletList,
} from "@/lib/caixa";
import { corDoIndice } from "@/lib/palette";
import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";

interface HomeDonutChartProps {
  lists: WalletList[];
  /** Caixas principais, já calculados pelo pai (evita recalcular). */
  roots: WalletList[];
  entries: Entry[];
  onOpenList?: (id: string) => void;
  onOpenSidebar?: () => void;
}

type MetricaId = "resultado" | "receitas" | "gastos";

/**
 * Métricas do donut. Cada uma é uma régua só sua — o gráfico nunca mistura
 * receita, gasto e resultado na mesma fatia; o usuário escolhe qual olhar.
 */
const METRICAS: {
  id: MetricaId;
  label: string;
  valor: (t: Totals) => number;
  legenda: string;
  Icone: typeof TrendingUp;
  tom: string;
}[] = [
  {
    id: "resultado",
    label: "Resultado",
    valor: (t) => t.balance,
    legenda: "resultado por caixa",
    Icone: Scale,
    tom: "text-muted-foreground/60",
  },
  {
    id: "receitas",
    label: "Receitas",
    valor: (t) => t.income,
    legenda: "receitas por caixa",
    Icone: TrendingUp,
    tom: "text-income",
  },
  {
    id: "gastos",
    label: "Gastos",
    valor: (t) => t.expense,
    legenda: "gastos por caixa",
    Icone: TrendingDown,
    tom: "text-expense",
  },
];

const config = { valor: { label: "Valor" } } satisfies ChartConfig;

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--foreground)",
};

/**
 * Gráfico geral (donut) da Home: a participação de cada caixa principal.
 *
 * Só os caixas principais entram no gráfico — os envelopes são somados dentro
 * do caixa ao qual pertencem, nunca como fatias independentes. O usuário troca
 * a métrica (resultado / receitas / gastos) e a legenda vira os CARDS dos
 * caixas, cada um com sua cor, sua tendência e o atalho para abrir.
 */
export function HomeDonutChart({
  lists,
  roots,
  entries,
  onOpenList,
  onOpenSidebar,
}: HomeDonutChartProps) {
  const [metricaId, setMetricaId] = useState<MetricaId>("resultado");
  const metrica = METRICAS.find((m) => m.id === metricaId) ?? METRICAS[0]!;

  const byList = useMemo(() => totalsByRoot(lists, entries), [lists, entries]);

  const data = useMemo(
    () =>
      roots.map((l, index) => {
        const t = byList[l.id] ?? { income: 0, expense: 0, balance: 0, count: 0 };
        return {
          id: l.id,
          name: l.name,
          cor: corDoIndice(index),
          totais: t,
          valor: metrica.valor(t),
          fatia: Math.abs(Math.round(metrica.valor(t))),
        };
      }),
    [roots, byList, metrica],
  );

  const totalFatias = data.reduce((sum, d) => sum + d.fatia, 0);
  const totalMetrica = data.reduce((sum, d) => sum + d.valor, 0);

  const tendencias = useMemo(() => {
    const map = new Map<string, ReturnType<typeof balanceTrend>>();
    for (const l of roots) map.set(l.id, balanceTrend(familyEntriesOf(lists, entries, l.id)));
    return map;
  }, [roots, lists, entries]);

  if (data.length === 0) {
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
            Crie uma lista na barra lateral para começar a lançar.
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
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
            Gráfico geral
          </h2>
          <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {metrica.legenda}
          </span>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          total {brlCompact(totalFatias)}
        </span>
      </header>

      {/* Régua do gráfico: cada métrica é uma conta só sua, sem mistura. */}
      <div
        role="tablist"
        aria-label="Métrica do gráfico"
        className="mb-4 inline-flex rounded-full border border-border bg-secondary/40 p-0.5"
      >
        {METRICAS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={metricaId === m.id}
            onClick={() => setMetricaId(m.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
              metricaId === m.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <m.Icone className={cn("size-3", metricaId === m.id ? m.tom : "opacity-70")} />
            {m.label}
          </button>
        ))}
      </div>

      {/* Donut em cima */}
      <div className="flex justify-center">
        <div className="relative size-48 sm:size-56">
          {totalFatias > 0 ? (
            <ChartContainer config={config} className="aspect-auto size-full">
              <PieChart>
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => brl(Number(value))} />
                <Pie
                  data={data}
                  dataKey="fatia"
                  nameKey="name"
                  innerRadius="70%"
                  outerRadius="100%"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {data.map((d) => (
                    <Cell key={d.id} fill={d.cor} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : (
            <div aria-hidden className="size-full rounded-full border-[14px] border-border/40" />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {metrica.label} geral
            </span>
            <span
              className={cn(
                "mt-0.5 font-[family-name:var(--font-display)] text-lg font-bold tabular-nums sm:text-xl",
                totalMetrica < 0
                  ? "text-expense"
                  : totalMetrica > 0
                    ? "text-income"
                    : "text-muted-foreground/60",
              )}
            >
              {totalMetrica >= 0 ? "+" : "−"} {brl(Math.abs(totalMetrica))}
            </span>
          </div>
        </div>
      </div>

      {/* Legenda = cards dos caixas */}
      <ul className="mt-5 grid w-full gap-2 sm:grid-cols-2">
        {data.map((d) => {
          const outras = METRICAS.filter((m) => m.id !== metricaId);
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onOpenList?.(d.id)}
                aria-label={`Abrir caixa ${d.name}`}
                className="group flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
              >
                <span className="size-3 shrink-0 rounded-full" style={{ background: d.cor }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{d.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/70">
                    {outras.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1">
                        <m.Icone className={cn("size-3", m.tom)} />
                        {brlCompact(m.valor(d.totais))}
                      </span>
                    ))}
                  </span>
                </span>
                <Sparkline data={tendencias.get(d.id) ?? []} positive={d.totais.balance >= 0} />
                <span
                  className={cn(
                    "shrink-0 font-[family-name:var(--font-display)] text-sm font-bold tabular-nums",
                    d.valor < 0
                      ? "text-expense"
                      : d.valor > 0
                        ? "text-income"
                        : "text-muted-foreground/60",
                  )}
                >
                  {d.valor >= 0 ? "+" : "−"} {brl(Math.abs(d.valor))}
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
