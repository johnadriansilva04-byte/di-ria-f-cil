import { useState, useMemo } from "react";
import { Target, Plus, X, Check, Trash2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { brl, formatDate, addDays, today } from "@/lib/caixa";

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
  createdAt: string;
}

interface FinancialGoalsProps {
  currentBalance: number;
}

const STORAGE_KEY = "financial_goals";

export function FinancialGoals({ currentBalance }: FinancialGoalsProps) {
  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: "", target: "", deadline: "" });

  const saveGoals = (updatedGoals: Goal[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedGoals));
      setGoals(updatedGoals);
    } catch {
      // Storage might be full or blocked
    }
  };

  const addGoal = () => {
    if (!newGoal.name.trim() || !newGoal.target || !newGoal.deadline) return;

    const goal: Goal = {
      id: Date.now().toString(),
      name: newGoal.name.trim(),
      target: parseFloat(newGoal.target),
      current: 0,
      deadline: newGoal.deadline,
      createdAt: today(),
    };

    saveGoals([...goals, goal]);
    setNewGoal({ name: "", target: "", deadline: "" });
    setShowAddForm(false);
  };

  const updateGoalProgress = (id: string, amount: number) => {
    const updated = goals.map((g) => (g.id === id ? { ...g, current: Math.min(g.current + amount, g.target) } : g));
    saveGoals(updated);
  };

  const deleteGoal = (id: string) => {
    saveGoals(goals.filter((g) => g.id !== id));
  };

  const calculateEstimatedCompletion = (goal: Goal) => {
    if (goal.current >= goal.target) return "Concluída!";
    if (currentBalance <= 0) return "Sem saldo disponível";

    const remaining = goal.target - goal.current;
    const monthsNeeded = Math.ceil(remaining / currentBalance);
    const completionDate = addDays(today(), monthsNeeded * 30);

    return `Previsão: ${formatDate(completionDate)}`;
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="size-4" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
            Metas Financeiras
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Nova meta</span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Nome da meta (ex: Viagem)"
            value={newGoal.name}
            onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
          />
          <input
            type="number"
            placeholder="Valor alvo (R$)"
            value={newGoal.target}
            onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
          />
          <input
            type="date"
            value={newGoal.deadline}
            onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
            min={today()}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
          />
          <button
            type="button"
            onClick={addGoal}
            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Criar meta
          </button>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 px-5 py-8 text-center">
          <Target className="size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Sem metas definidas</p>
          <p className="text-xs text-muted-foreground/60">Crie metas para acompanhar seus objetivos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const progress = (goal.current / goal.target) * 100;
            const isCompleted = progress >= 100;

            return (
              <div key={goal.id} className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-xs font-medium">{goal.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {brl(goal.current)} de {brl(goal.target)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isCompleted && <Check className="size-3.5 text-income" />}
                    <button
                      type="button"
                      onClick={() => deleteGoal(goal.id)}
                      className="rounded-md p-1 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden mb-2">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isCompleted ? "bg-income" : "bg-primary",
                    )}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{progress.toFixed(0)}% concluído</span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar className="size-3" />
                    <span>{calculateEstimatedCompletion(goal)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
