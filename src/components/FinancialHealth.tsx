import { useMemo } from "react";
import { Heart, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { brl, type Entry, type Totals } from "@/lib/caixa";

interface FinancialHealthProps {
  entries: Entry[];
  lists: { id: string; name: string }[];
}

interface HealthScore {
  score: number;
  label: string;
  color: string;
  factors: {
    name: string;
    status: "good" | "warning" | "bad";
    value: string;
  }[];
}

export function FinancialHealth({ entries, lists }: FinancialHealthProps) {
  const health = useMemo(() => calculateHealth(entries, lists), [entries, lists]);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Heart className="size-4" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
            Saúde Financeira
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums",
              health.color,
            )}
          >
            {health.score}
          </span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", health.color.replace("text-", "bg-"))}
            style={{ width: `${health.score}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{health.label}</p>
      </div>

      <div className="space-y-2">
        {health.factors.map((factor, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <div className="flex items-center gap-2">
              {factor.status === "good" && <TrendingUp className="size-3.5 text-income" />}
              {factor.status === "warning" && <AlertTriangle className="size-3.5 text-yellow-500" />}
              {factor.status === "bad" && <TrendingDown className="size-3.5 text-expense" />}
              <span className="text-xs text-muted-foreground">{factor.name}</span>
            </div>
            <span className="text-xs font-medium tabular-nums">{factor.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function calculateHealth(entries: Entry[], lists: { id: string; name: string }[]): HealthScore {
  const totals = entries.reduce(
    (acc, e) => {
      if (e.kind === "entrada") acc.income += e.amount;
      else acc.expense += e.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );

  const balance = totals.income - totals.expense;
  const savingsRate = totals.income > 0 ? (balance / totals.income) * 100 : 0;
  const hasMultipleLists = lists.length > 1;
  const recentActivity = entries.filter((e) => {
    const daysSince = (Date.now() - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 30;
  }).length;

  let score = 50; // Base score

  // Savings rate factor (40 points max)
  if (savingsRate >= 20) score += 40;
  else if (savingsRate >= 10) score += 30;
  else if (savingsRate >= 5) score += 20;
  else if (savingsRate >= 0) score += 10;
  else score -= 10;

  // Balance factor (20 points max)
  if (balance > 0) score += 20;
  else if (balance === 0) score += 10;
  else score -= 10;

  // Activity factor (20 points max)
  if (recentActivity >= 10) score += 20;
  else if (recentActivity >= 5) score += 15;
  else if (recentActivity >= 1) score += 10;
  else score -= 5;

  // Organization factor (20 points max)
  if (hasMultipleLists) score += 20;
  else if (lists.length === 1) score += 10;

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine label and color
  let label = "";
  let color = "text-muted-foreground";
  if (score >= 80) {
    label = "Excelente - Finanças saudáveis";
    color = "text-income";
  } else if (score >= 60) {
    label = "Boa - Caminho certo";
    color = "text-primary";
  } else if (score >= 40) {
    label = "Atenção - Pode melhorar";
    color = "text-yellow-500";
  } else {
    label = "Crítica - Precisa de ação";
    color = "text-expense";
  }

  // Build factors
  const factors = [
    {
      name: "Taxa de economia",
      status: savingsRate >= 10 ? "good" : savingsRate >= 0 ? "warning" : "bad",
      value: `${savingsRate.toFixed(1)}%`,
    },
    {
      name: "Saldo atual",
      status: balance > 0 ? "good" : balance === 0 ? "warning" : "bad",
      value: brl(balance),
    },
    {
      name: "Atividade (30 dias)",
      status: recentActivity >= 5 ? "good" : recentActivity >= 1 ? "warning" : "bad",
      value: `${recentActivity} lançamentos`,
    },
    {
      name: "Organização",
      status: hasMultipleLists ? "good" : "warning",
      value: `${lists.length} ${lists.length === 1 ? "lista" : "listas"}`,
    },
  ];

  return { score, label, color, factors };
}
