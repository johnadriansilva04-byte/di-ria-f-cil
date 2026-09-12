import { useEffect, useMemo } from "react";
import { PartyPopper, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type CelebrationKind = "goal" | "record";

export interface Celebration {
  id: number;
  kind: CelebrationKind;
  title: string;
  subtitle?: string;
}

interface CelebrationOverlayProps {
  celebration: Celebration;
  onDone: () => void;
}

/** Pequenos quadrados coloridos que caem como confete (CSS puro, leve). */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.45,
        duration: 2.2 + Math.random() * 1.6,
        color: ["#22c55e", "#38bdf8", "#f59e0b", "#ef4444", "#a78bfa", "#f472b6"][i % 6]!,
        rotate: Math.random() * 360,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="celebrate-confetti absolute top-[-6%] block size-2 rounded-[1px]"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/** Comemoração de meta/recorde batida: confetes + selo + fanfarra já tocada. */
export function CelebrationOverlay({ celebration, onDone }: CelebrationOverlayProps) {
  const isRecord = celebration.kind === "record";

  useEffect(() => {
    const timer = window.setTimeout(onDone, 2800);
    return () => window.clearTimeout(timer);
  }, [celebration.id, onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[65] flex items-center justify-center overflow-hidden"
    >
      {/* clarão dourado */}
      <div className="celebrate-glow absolute inset-0 bg-chart-5/20" />
      <Confetti />

      {/* selo */}
      <div className="celebrate-pop relative flex flex-col items-center gap-1.5 rounded-3xl border border-chart-5/40 bg-card/90 px-8 py-7 text-center shadow-2xl backdrop-blur-sm">
        <div
          className={cn(
            "flex size-16 items-center justify-center rounded-full",
            isRecord ? "bg-chart-5 text-background" : "bg-income text-income-foreground",
          )}
        >
          {isRecord ? <Trophy className="size-8" /> : <PartyPopper className="size-8" />}
        </div>
        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          {isRecord ? "RECORDE! 🏆" : "Meta batida! 🎉"}
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">{celebration.title}</p>
        {celebration.subtitle ? (
          <p className="text-xs text-foreground/70">{celebration.subtitle}</p>
        ) : null}
        <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-chart-5">
          <Sparkles className="size-3.5" />
          {isRecord ? "Novo recorde mensal" : "Progresso no caixa"}
        </div>
      </div>
    </div>
  );
}