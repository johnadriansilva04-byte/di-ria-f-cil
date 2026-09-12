import { useEffect } from "react";
import { Check, TrendingDown } from "lucide-react";
import { brl, type Kind } from "@/lib/caixa";
import { cn } from "@/lib/utils";

export type LaunchFx = {
  id: number;
  kind: Kind;
  amount: number;
  listName: string;
};

interface LaunchFeedbackProps {
  fx: LaunchFx;
  onDone: () => void;
}

/** Confirmação visual do lançamento: verde com check no ganho, vermelho no gasto. */
export function LaunchFeedback({ fx, onDone }: LaunchFeedbackProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 1300);
    return () => window.clearTimeout(timer);
  }, [fx.id, onDone]);

  const income = fx.kind === "entrada";

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
    >
      {/* clarão */}
      <div
        className={cn("caixa-flash absolute inset-0", income ? "bg-income/25" : "bg-expense/25")}
      />

      {/* anel que abre */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            "caixa-ring size-44 rounded-full border-4",
            income ? "border-income/60" : "border-expense/60",
          )}
        />
      </div>

      {/* selo de confirmação */}
      <div
        className={cn(
          "caixa-pop relative flex flex-col items-center gap-2 rounded-3xl border px-7 py-6 shadow-2xl backdrop-blur-sm",
          income ? "border-income/40 bg-income/15" : "border-expense/40 bg-expense/15",
        )}
      >
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-full",
            income ? "bg-income text-income-foreground" : "bg-expense text-expense-foreground",
          )}
        >
          {income ? (
            <Check className="size-7" strokeWidth={3} />
          ) : (
            <TrendingDown className="size-7" />
          )}
        </div>
        <p
          className={cn(
            "font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums",
            income ? "text-income" : "text-expense",
          )}
        >
          {income ? "+" : "−"} {brl(fx.amount)}
        </p>
        <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/80">
          {income ? "Ganho registrado" : "Gasto registrado"}
        </p>
        <p className="text-[11px] text-foreground/60">em {fx.listName}</p>
      </div>

      {/* valor que sobe no ganho e cai no gasto */}
      <div className="absolute inset-x-0 top-[42%] flex justify-center">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-bold tabular-nums",
            income
              ? "caixa-rise bg-income/20 text-income"
              : "caixa-drop bg-expense/20 text-expense",
          )}
        >
          {income ? "+" : "−"} {brl(fx.amount)}
        </span>
      </div>
    </div>
  );
}
