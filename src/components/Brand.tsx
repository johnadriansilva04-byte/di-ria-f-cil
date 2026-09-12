import { cn } from "@/lib/utils";

/**
 * Identidade do EASY ACCOUNT.
 *
 * O símbolo é minimalista: uma linha de evolução subindo dentro de um
 * quadrado arredondado (movimento + saldo). Escala bem de 28px a 96px e
 * usa os tokens do app, então acompanha o tema.
 */

interface BrandMarkProps {
  className?: string | undefined;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-sm",
        className,
      )}
      style={{ backgroundImage: "linear-gradient(135deg, var(--primary), var(--income))" }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[60%] text-primary-foreground">
        <path
          d="M3.5 16.5 8.8 10.6l3.4 3.3L20.5 6"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20.5" cy="6" r="2.4" fill="currentColor" />
      </svg>
    </span>
  );
}

interface BrandLockupProps {
  className?: string | undefined;
  markClassName?: string | undefined;
  subtitle?: string | undefined;
  size?: "sm" | "md" | "lg" | undefined;
}

const WORDMARK_SIZES = {
  sm: "text-xs tracking-[0.22em]",
  md: "text-sm tracking-[0.24em]",
  lg: "text-base tracking-[0.3em] sm:text-lg",
} as const;

export function BrandLockup({ className, markClassName, subtitle, size = "md" }: BrandLockupProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark className={markClassName} />
      <span className="min-w-0 leading-none">
        <span
          className={cn(
            "block font-[family-name:var(--font-display)] font-bold uppercase",
            WORDMARK_SIZES[size],
          )}
        >
          Easy Account
        </span>
        {subtitle ? (
          <span className="mt-1 block text-[10px] text-muted-foreground/70">{subtitle}</span>
        ) : null}
      </span>
    </span>
  );
}
