import { useEffect, useRef } from "react";
import { Check } from "lucide-react";

/** Peças de confete: só transform/opacity, nada que pese no celular. */
const PECAS = Array.from({ length: 28 }, (_, i) => i);
const CORES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-5)",
  "var(--income)",
  "var(--primary)",
];

interface GoalCelebrationProps {
  name: string;
  onDone: () => void;
}

/**
 * Celebração de meta concluída: confete curto + selo "Meta concluída!".
 * Some sozinha depois de ~2,8s (o pai desmonta por `onDone`).
 */
export function GoalCelebration({ name, onDone }: GoalCelebrationProps) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const timer = window.setTimeout(() => doneRef.current(), 2800);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center overflow-hidden"
    >
      <div aria-hidden className="absolute inset-0">
        {PECAS.map((i) => (
          <span
            key={i}
            className="confetti absolute top-0 block size-2 rounded-[2px]"
            style={{
              left: `${(i * 100) / PECAS.length}%`,
              background: CORES[i % CORES.length],
              animationDelay: `${(i % 7) * 130}ms`,
              animationDuration: `${1700 + (i % 5) * 240}ms`,
            }}
          />
        ))}
      </div>

      <div className="caixa-pop relative flex flex-col items-center gap-2 rounded-3xl border border-chart-5/40 bg-card/95 px-7 py-6 shadow-2xl backdrop-blur-sm">
        <div className="flex size-14 items-center justify-center rounded-full bg-chart-5 text-background">
          <Check className="size-7" strokeWidth={3} />
        </div>
        <p className="font-[family-name:var(--font-display)] text-xl font-bold">Meta concluída!</p>
        <p className="max-w-[16rem] text-center text-xs text-muted-foreground">{name}</p>
      </div>
    </div>
  );
}
