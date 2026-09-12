import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import {
  brl,
  errorMessage,
  formatDate,
  toNumber,
  type Entry,
  type EntryPatch,
  type WalletList,
} from "@/lib/caixa";
import { cn } from "@/lib/utils";

interface EntryRowProps {
  entry: Entry;
  lists: WalletList[];
  onSave: (id: string, patch: EntryPatch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onError: (msg: string | null) => void;
}

const inputClass =
  "w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/30";

export function EntryRow({ entry, lists, onSave, onDelete, onError }: EntryRowProps) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState(entry.label);
  const [amount, setAmount] = useState(String(entry.amount).replace(".", ","));
  const [date, setDate] = useState(entry.date);
  const [listaId, setListaId] = useState(entry.listaId ?? "");

  const income = entry.kind === "entrada";

  const save = async () => {
    const value = toNumber(amount);
    if (value <= 0) {
      onError("O valor precisa ser maior que zero.");
      return;
    }
    setBusy(true);
    onError(null);
    try {
      const patch: EntryPatch = { label: label.trim() || entry.label, amount: value, date };
      if (listaId && listaId !== entry.listaId) patch.listaId = listaId;
      await onSave(entry.id, patch);
      setEditing(false);
    } catch (e) {
      onError(errorMessage(e, "Não foi possível salvar a alteração."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    onError(null);
    try {
      await onDelete(entry.id);
    } catch (e) {
      onError(errorMessage(e, "Não foi possível apagar o lançamento."));
      setBusy(false);
      setConfirming(false);
    }
  };

  if (editing) {
    return (
      <li className="space-y-2 bg-secondary/20 px-4 py-3 sm:px-6">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Descrição"
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className={cn(inputClass, "tabular-nums")}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cn(inputClass, "tabular-nums")}
          />
        </div>
        {lists.length > 1 ? (
          <select
            value={listaId}
            onChange={(e) => setListaId(e.target.value)}
            className={inputClass}
            aria-label="Mover para outra lista"
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        ) : null}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Salvar
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setLabel(entry.label);
              setAmount(String(entry.amount).replace(".", ","));
              setDate(entry.date);
              setListaId(entry.listaId ?? "");
            }}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/30 sm:gap-4 sm:px-6">
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          income ? "bg-income/10 text-income" : "bg-expense/10 text-expense",
        )}
      >
        {income ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.label}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatDate(entry.date)}
          {entry.detail ? ` • ${entry.detail}` : ""}
        </p>
      </div>

      {confirming ? (
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-xs text-destructive">Apagar?</span>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            aria-label="Confirmar exclusão"
            className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            aria-label="Cancelar exclusão"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <>
          <span
            className={cn(
              "shrink-0 font-[family-name:var(--font-display)] text-sm font-bold tabular-nums",
              income ? "text-income" : "text-expense",
            )}
          >
            {income ? "+" : "−"} {brl(entry.amount)}
          </span>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Editar ${entry.label}`}
              className="rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Apagar ${entry.label}`}
              className="rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:bg-secondary hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </>
      )}
    </li>
  );
}
