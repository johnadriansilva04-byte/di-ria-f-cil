import { useMemo } from "react";
import { Lightbulb, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { brl, type Entry, friendlyDate, addDays, today } from "@/lib/caixa";

interface SmartInsightsProps {
  entries: Entry[];
  lists: { id: string; name: string }[];
}

interface Insight {
  id: string;
  type: "positive" | "negative" | "neutral" | "warning";
  icon: typeof Lightbulb;
  title: string;
  description: string;
  value?: string;
}

export function SmartInsights({ entries, lists }: SmartInsightsProps) {
  const insights = useMemo(() => generateInsights(entries, lists), [entries, lists]);

  if (insights.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Lightbulb className="size-4" />
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
          Insights Inteligentes
        </h2>
      </div>

      <div className="space-y-3">
        {insights.slice(0, 4).map((insight) => (
          <div
            key={insight.id}
            className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50"
          >
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-lg shrink-0",
                insight.type === "positive" && "bg-income/10 text-income",
                insight.type === "negative" && "bg-expense/10 text-expense",
                insight.type === "warning" && "bg-yellow-500/10 text-yellow-500",
                insight.type === "neutral" && "bg-primary/10 text-primary",
              )}
            >
              <insight.icon className="size-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{insight.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{insight.description}</p>
              {insight.value && (
                <p className="text-[11px] font-semibold tabular-nums mt-1">{insight.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function generateInsights(entries: Entry[], lists: { id: string; name: string }[]): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  // Filter entries for this month
  const thisMonthEntries = entries.filter((e) => {
    const date = new Date(e.date);
    return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
  });

  // Filter entries for last month
  const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
  const lastMonthEntries = entries.filter((e) => {
    const date = new Date(e.date);
    return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
  });

  // Calculate totals
  const thisMonthTotals = thisMonthEntries.reduce(
    (acc, e) => {
      if (e.kind === "entrada") acc.income += e.amount;
      else acc.expense += e.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );

  const lastMonthTotals = lastMonthEntries.reduce(
    (acc, e) => {
      if (e.kind === "entrada") acc.income += e.amount;
      else acc.expense += e.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );

  // Compare with last month
  if (lastMonthEntries.length > 0) {
    const incomeChange = thisMonthTotals.income - lastMonthTotals.income;
    const expenseChange = thisMonthTotals.expense - lastMonthTotals.expense;

    if (incomeChange > 0) {
      insights.push({
        id: "income-up",
        type: "positive",
        icon: TrendingUp,
        title: "Receitas aumentaram",
        description: "Sua renda este mês é maior que no mês anterior",
        value: `+${brl(incomeChange)}`,
      });
    } else if (incomeChange < 0) {
      insights.push({
        id: "income-down",
        type: "warning",
        icon: TrendingDown,
        title: "Receitas diminuíram",
        description: "Sua renda este mês é menor que no mês anterior",
        value: brl(incomeChange),
      });
    }

    if (expenseChange > 0) {
      const percentIncrease = (expenseChange / lastMonthTotals.expense) * 100;
      insights.push({
        id: "expense-up",
        type: percentIncrease > 20 ? "negative" : "warning",
        icon: AlertCircle,
        title: "Gastos aumentaram",
        description: percentIncrease > 20 ? "Seus gastos aumentaram significativamente" : "Gastos maiores que o mês anterior",
        value: `+${brl(expenseChange)} (${percentIncrease.toFixed(0)}%)`,
      });
    } else if (expenseChange < 0) {
      insights.push({
        id: "expense-down",
        type: "positive",
        icon: CheckCircle,
        title: "Gastos reduzidos",
        description: "Você gastou menos que no mês anterior",
        value: brl(expenseChange),
      });
    }
  }

  // Find highest expense category
  const expensesByDescription = thisMonthEntries
    .filter((e) => e.kind === "saida")
    .reduce((acc, e) => {
      const key = e.label.toLowerCase();
      acc[key] = (acc[key] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

  const topExpense = Object.entries(expensesByDescription).sort((a, b) => b[1] - a[1])[0];

  if (topExpense) {
    insights.push({
      id: "top-expense",
      type: "neutral",
      icon: AlertCircle,
      title: "Maior gasto do mês",
      description: topExpense[0].charAt(0).toUpperCase() + topExpense[0].slice(1),
      value: brl(topExpense[1]),
    });
  }

  // Check recent activity
  const recentEntries = entries.filter((e) => {
    const daysSince = (Date.now() - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 7;
  });

  if (recentEntries.length === 0 && entries.length > 0) {
    const lastEntry = entries[0];
    const daysSinceLastEntry = Math.floor((Date.now() - new Date(lastEntry.date).getTime()) / (1000 * 60 * 60 * 24));
    insights.push({
      id: "no-activity",
      type: "warning",
      icon: AlertCircle,
      title: "Sem atividade recente",
      description: `Seu último lançamento foi há ${daysSinceLastEntry} dias`,
    });
  }

  // Check balance trend
  const totalBalance = entries.reduce((acc, e) => {
    if (e.kind === "entrada") acc += e.amount;
    else acc -= e.amount;
    return acc;
  }, 0);

  if (totalBalance < 0) {
    insights.push({
      id: "negative-balance",
      type: "negative",
      icon: TrendingDown,
      title: "Saldo negativo",
      description: "Suas despesas superam suas receitas totais",
      value: brl(totalBalance),
    });
  }

  // Multiple lists insight
  if (lists.length > 1) {
    insights.push({
      id: "multiple-lists",
      type: "positive",
      icon: CheckCircle,
      title: "Bem organizado",
      description: `Você está gerenciando ${lists.length} listas de forma eficiente`,
    });
  }

  return insights;
}
