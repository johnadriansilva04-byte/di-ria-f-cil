import { useState } from "react";
import { Target, Plus, X, Check, Trash2, Calendar, Loader2, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";
import { brl, formatDate, addDays, today } from "@/lib/caixa";
import type { Meta } from "@/hooks/use-metas";

interface FinancialGoalsProps {
  currentBalance: number;
  metas: Meta[];
  loading: boolean;
  addMeta: (meta: Omit<Meta, "id" | "user_id" | "created_at" | "updated_at">) => Promise<unknown>;
  deleteMeta: (id: string) => Promise<void>;
  addToMeta: (id: string, amount: number) => Promise<void>;
}

export function FinancialGoals({
  currentBalance,
  metas,
  loading,
  addMeta,
  deleteMeta,
  addToMeta,
}: FinancialGoalsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: "", target: "", deadline: "" });
  const [busy, setBusy] = useState(false);
  const [depositando, setDepositando] = useState<string | null>(null);
  const [valorDeposito, setValorDeposito] = useState("");
  const [salvandoDeposito, setSalvandoDeposito] = useState(false);

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

  const abrirDeposito = (id: string) => {
    setDepositando(id);
    setValorDeposito("");
  };

  const confirmarDeposito = async (id: string) => {
    const valor = parseFloat(valorDeposito.replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) return;

    try {
      setSalvandoDeposito(true);
      await addToMeta(id, valor);
      setDepositando(null);
      setValorDeposito("");
    } catch (e) {
      console.error("Erro ao guardar valor na meta:", e);
    } finally {
      setSalvandoDeposito(false);
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
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between">
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
          aria-label={showAddForm ? "Fechar formulário de meta" : "Nova meta"}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {showAddForm ? <X className="size-4" /> : <Plus className="size-4" />}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 space-y-3 rounded-xl border border-border/50 bg-secondary/30 p-4">
          <span className="text-xs font-semibold">Nova meta</span>
          <input
            type="text"
            placeholder="Nome da meta (ex: Viagem)"
            value={newGoal.name}
            onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
          />
          <input
            type="number"
            inputMode="decimal"
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
            {busy ? <Loader2 className="mx-auto size-4 animate-spin" /> : "Criar meta"}
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
            const progress = Math.min((meta.valor_atual / meta.valor_alvo) * 100, 100);
            const isCompleted = meta.concluida || progress >= 100;
            const emDeposito = depositando === meta.id;

            return (
              <div key={meta.id} className="rounded-xl border border-border/50 bg-secondary/30 p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{meta.nome}</p>
                    <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                      {brl(meta.valor_atual)} de {brl(meta.valor_alvo)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {isCompleted && <Check className="size-3.5 text-income" />}
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(meta.id)}
                      aria-label={`Excluir meta ${meta.nome}`}
                      className="rounded-md p-1 text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>

                <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isCompleted ? "bg-income" : "bg-primary",
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {progress.toFixed(0)}%
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar className="size-3" />
                    <span>{calculateEstimatedCompletion(meta)}</span>
                  </div>
                </div>

                {!isCompleted && (
                  <div className="mt-2.5 border-t border-border/40 pt-2.5">
                    {emDeposito ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          autoFocus
                          placeholder="Valor (R$)"
                          value={valorDeposito}
                          onChange={(e) => setValorDeposito(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void confirmarDeposito(meta.id);
                            if (e.key === "Escape") setDepositando(null);
                          }}
                          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                        />
                        <button
                          type="button"
                          onClick={() => void confirmarDeposito(meta.id)}
                          disabled={salvandoDeposito}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                          {salvandoDeposito ? <Loader2 className="size-3.5 animate-spin" /> : "Guardar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepositando(null)}
                          aria-label="Cancelar"
                          className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => abrirDeposito(meta.id)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary transition-colors hover:text-primary/80"
                      >
                        <PiggyBank className="size-3.5" />
                        Guardar valor nesta meta
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
