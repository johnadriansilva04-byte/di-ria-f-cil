import { useState } from "react";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import {
  brl,
  insertEntry,
  toNumber,
  type Kind,
  type Entry,
} from "@/lib/caixa";

interface TransactionFormProps {
  userId: string;
  daily: string;
  hourRate: string;
  onSuccess: (entry: Entry) => void;
  onError: (msg: string) => void;
}

export function TransactionForm({
  userId,
  daily,
  hourRate,
  onSuccess,
  onError,
}: TransactionFormProps) {
  const [kind, setKind] = useState<Kind>("entrada");
  const [label, setLabel] = useState("");
  const [hours, setHours] = useState("");
  const [expense, setExpense] = useState("");

  const extras = toNumber(hours) * toNumber(hourRate);
  const entradaTotal = toNumber(daily) + extras;

  const submit = async () => {
    const amount = kind === "entrada" ? entradaTotal : toNumber(expense);
    if (amount <= 0) return;
    const detail =
      kind === "entrada" && extras > 0
        ? `Diária ${brl(toNumber(daily))} + ${hours}h x ${brl(toNumber(hourRate))}`
        : undefined;
    try {
      onError("");
      const entry = await insertEntry({
        userId,
        label: label.trim() || (kind === "entrada" ? "Diária" : "Gasto"),
        kind,
        amount,
        detail,
      });
      onSuccess(entry);
      setLabel("");
      setHours("");
      setExpense("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      console.error("Erro ao salvar lançamento:", msg);
      onError("Erro ao salvar lançamento. Tente novamente.");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Kind toggle */}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
        <button
          type="button"
          onClick={() => setKind("entrada")}
          className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
            kind === "entrada"
              ? "bg-income text-income-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowUpCircle className="size-4" /> Receber
        </button>
        <button
          type="button"
          onClick={() => setKind("saida")}
          className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
            kind === "saida"
              ? "bg-expense text-expense-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowDownCircle className="size-4" /> Gastar
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {/* Label */}
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {kind === "entrada" ? "Do que é" : "Do que foi o gasto"}
          </span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={
              kind === "entrada" ? "Ex: Diária na obra" : "Ex: Material, almoço"
            }
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring/30"
          />
        </label>

        {kind === "entrada" ? (
          <>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Valor da diária (R$)
              </span>
              <input
                value={daily}
                onChange={(e) => {}}
                inputMode="decimal"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                readOnly
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Horas extras
                </span>
                <input
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm tabular-nums outline-none placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring/30"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Valor/hora (R$)
                </span>
                <input
                  value={hourRate}
                  onChange={(e) => {}}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm tabular-nums outline-none placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring/30"
                  readOnly
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Total:{" "}
              <span className="font-semibold tabular-nums text-income">
                {brl(entradaTotal)}
              </span>
              {extras > 0 ? ` (extras ${brl(extras)})` : ""}
            </p>
          </>
        ) : (
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Valor gasto (R$)
            </span>
            <input
              value={expense}
              onChange={(e) => setExpense(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums outline-none placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring/30"
            />
          </label>
        )}

        <button
          type="button"
          onClick={() => void submit()}
          className={`w-full rounded-lg px-4 py-3 text-sm font-bold transition-transform active:scale-[0.99] ${
            kind === "entrada"
              ? "bg-income text-income-foreground hover:brightness-110"
              : "bg-expense text-expense-foreground hover:brightness-110"
          }`}
        >
          {kind === "entrada" ? "+ Receber" : "+ Gastar"}
        </button>
      </div>
    </div>
  );
}
