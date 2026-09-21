import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { PieChart as PieChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { brl, brlCompact, type Entry, filterByPeriod, type Period } from "@/lib/caixa";

interface ExpenseCategoriesProps {
  entries: Entry[];
  period?: Period;
}

const CATEGORY_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--expense)",
  "var(--primary)",
];

const config = {
  value: { label: "Valor" },
} satisfies ChartConfig;

export function ExpenseCategories({ entries, period = "mes" }: ExpenseCategoriesProps) {
  const periodEntries = useMemo(() => filterByPeriod(entries, period), [entries, period]);

  const categories = useMemo(() => {
    const expenses = periodEntries.filter((e) => e.kind === "saida");
    const grouped = expenses.reduce((acc, e) => {
      const key = e.label.toLowerCase();
      acc[key] = (acc[key] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        percentage: 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((cat, index, arr) => ({
        ...cat,
        percentage: (cat.value / arr.reduce((sum, c) => sum + c.value, 0)) * 100,
      }));
  }, [periodEntries]);

  const total = categories.reduce((sum, cat) => sum + cat.value, 0);

  if (categories.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PieChartIcon className="size-4" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
            Distribuição de Gastos
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">Sem gastos neste período</p>
          <p className="text-xs text-muted-foreground/60">Os lançamentos aparecerão aqui.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PieChartIcon className="size-4" />
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
          Distribuição de Gastos
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-48">
          <ChartContainer config={config} className="aspect-auto h-full">
            <ResponsiveContainer width="100%" height="100%">
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
                  data={categories}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="60%"
                  outerRadius="80%"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {categories.map((_, index) => (
                    <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="space-y-2">
          {categories.map((category, index) => (
            <div key={category.name} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full"
                  style={{ background: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                />
                <span className="text-xs text-muted-foreground">{category.name}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium tabular-nums">{brlCompact(category.value)}</p>
                <p className="text-[10px] text-muted-foreground">{category.percentage.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
