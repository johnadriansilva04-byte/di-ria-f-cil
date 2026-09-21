import { useState } from "react";
import { Target, Plus, X, Check, Trash2, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { brl, formatDate, addDays, today } from "@/lib/caixa";
import { useMetas, type Meta } from "@/hooks/use-metas";

interface FinancialGoalsProps {
  currentBalance: number;
  userId: string;
}

export function FinancialGoals({ currentBalance, userId }: FinancialGoalsProps) {
  const { metas, loading, addMeta, deleteMeta, addToMeta } = useMetas(userId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: "", target: "", deadline: "" });
  const [busy, setBusy] = useState(false);

  const handleAddGoal = async () => {
    if (!newGoal.name.trim() || !newGoal.target || !newGoal.deadline) return;

    try {
      setBusy(true);
      await addMeta({
        nome: newGoal.name.trim(),
        valor_alvo: parseFloat(newGoal.target),
        valor_atual: 0,
        data_limite: newGoal.deadline,
        concluida: false,
      });
      setNewGoal({ name: "", target: "", deadline: "" });
      setShowAddForm(false);
    } catch (e) {
      console.error("Erro ao criar meta:", e);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteMeta(id);
    } catch (e) {
      console.error("Erro ao excluir meta:", e);
    }
  };

  const calculateEstimatedCompletion = (meta: Meta) => {
    if (meta.concluida || meta.valor_atual >= meta.valor_alvo) return "Concluída!";
    if (currentBalance <= 0) return "Sem saldo disponível";

    const remaining = meta.valor_alvo - meta.valor_atual;
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
            onClick={handleAddGoal}
            disabled={busy}
            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin mx-auto" /> : "Criar meta"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : metas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 px-5 py-8 text-center">
          <Target className="size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Sem metas definidas</p>
          <p className="text-xs text-muted-foreground/60">Crie metas para acompanhar seus objetivos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {metas.map((meta) => {
            const progress = (meta.valor_atual / meta.valor_alvo) * 100;
            const isCompleted = meta.concluida || progress >= 100;

            return (
              <div key={meta.id} className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-xs font-medium">{meta.nome}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {brl(meta.valor_atual)} de {brl(meta.valor_alvo)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isCompleted && <Check className="size-3.5 text-income" />}
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(meta.id)}
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
                    <span>{calculateEstimatedCompletion(meta)}</span>
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
