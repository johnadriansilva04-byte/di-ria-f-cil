import { Trash2, ArrowLeft } from "lucide-react";
import {
  brl,
  deleteEntry,
  formatDate,
  type Entry,
} from "@/lib/caixa";

interface StatementViewProps {
  entries: Entry[];
  loaded: boolean;
  onDelete: (id: string) => void;
  onDeleteError: (msg: string) => void;
  onBack: () => void;
  walletName: string;
}

export function StatementView({
  entries,
  loaded,
  onDelete,
  onDeleteError,
  onBack,
  walletName,
}: StatementViewProps) {
  const handleDelete = async (entry: Entry) => {
    try {
      onDelete(entry.id);
      await deleteEntry(entry.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      console.error("Erro ao apagar lançamento:", msg);
      onDeleteError("Erro ao apagar lançamento. Tente novamente.");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </button>
        <div className="h-5 w-px bg-border" />
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          Extrato — {walletName}
        </h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {entries.length} registro(s)
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!loaded ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            Carregando…
          </p>
        ) : entries.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum lançamento ainda.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Registre recebimentos ou gastos para ver o extrato aqui.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-secondary/30"
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                    entry.kind === "entrada"
                      ? "bg-income/10 text-income"
                      : "bg-expense/10 text-expense"
                  }`}
                >
                  <span className="text-xs font-bold">
                    {entry.kind === "entrada" ? "+" : "-"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(entry.date)}
                    {entry.detail ? ` • ${entry.detail}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-[family-name:var(--font-display)] text-sm font-semibold tabular-nums ${
                    entry.kind === "entrada" ? "text-income" : "text-expense"
                  }`}
                >
                  {entry.kind === "entrada" ? "+" : "-"} {brl(entry.amount)}
                </span>
                <button
                  type="button"
                  aria-label={`Apagar ${entry.label}`}
                  onClick={() => void handleDelete(entry)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground/40 transition-colors hover:bg-secondary hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
