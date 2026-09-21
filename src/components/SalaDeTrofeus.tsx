import { useState } from "react";
import {
  Award,
  CalendarCheck,
  Crown,
  Lock,
  Medal,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/caixa";
import type { TrofeuNaSala } from "@/hooks/use-conquistas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const ICONES: Record<string, LucideIcon> = {
  trophy: Trophy,
  star: Star,
  award: Award,
  crown: Crown,
  medal: Medal,
  sparkles: Sparkles,
  "calendar-check": CalendarCheck,
};

function iconeDe(nome: string): LucideIcon {
  return ICONES[nome] ?? Trophy;
}

interface SalaDeTrofeusProps {
  catalogo: TrofeuNaSala[];
  loading: boolean;
  tabelaFaltando: boolean;
  /** Tipo do troféu recém-ganho, que ganha o brilho de novidade. */
  novoTipo?: string | null;
}

/**
 * Sala de Troféus: vitrine discreta das metas que o usuário já bateu.
 *
 * Os troféus ficam em selos quadrados e só o escolhido abre a ficha, para a
 * seção não competir com os números do caixa na tela do celular.
 */
export function SalaDeTrofeus({
  catalogo,
  loading,
  tabelaFaltando,
  novoTipo,
}: SalaDeTrofeusProps) {
  const [aberto, setAberto] = useState<TrofeuNaSala | null>(null);

  const ganhos = catalogo.filter((t) => t.conquistada).length;
  const total = catalogo.length;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-chart-5/10 text-chart-5">
            <Trophy className="size-4" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
            Sala de Troféus
          </h2>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {loading ? "…" : `${ganhos}/${total}`}
        </span>
      </div>

      {tabelaFaltando ? (
        <p className="rounded-xl border border-dashed border-border/70 px-4 py-5 text-center text-xs text-muted-foreground">
          A Sala de Troféus ainda não está ligada. Rode o SQL de conquistas no Supabase para começar
          a colecionar.
        </p>
      ) : loading ? (
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-7">
          {catalogo.map((trofeu) => (
            <div
              key={trofeu.tipo}
              className="aspect-square animate-pulse rounded-xl border border-border/60 bg-secondary/40"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-7">
          {catalogo.map((trofeu) => {
            const Icone = iconeDe(trofeu.icone);
            return (
              <button
                key={trofeu.tipo}
                type="button"
                onClick={() => setAberto(trofeu)}
                aria-label={`${trofeu.titulo}: ${
                  trofeu.conquistada ? "conquistado" : "ainda não conquistado"
                }`}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-xl border transition-colors active:scale-[0.97]",
                  trofeu.conquistada
                    ? "border-chart-5/40 bg-chart-5/10 text-chart-5 ring-1 ring-chart-5/20 hover:bg-chart-5/20"
                    : "border-border/60 bg-secondary/30 text-muted-foreground/30 hover:border-border hover:text-muted-foreground/60",
                  trofeu.conquistada && trofeu.tipo === novoTipo && "trofeu-novo",
                )}
              >
                <Icone className="size-5 sm:size-6" />
                {!trofeu.conquistada && (
                  <Lock className="absolute right-1.5 top-1.5 size-2.5 text-muted-foreground/40" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {!loading && !tabelaFaltando && ganhos === 0 && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Trophy className="size-3.5 text-muted-foreground/40" />
          Conclua uma meta para começar sua coleção.
        </p>
      )}

      <Dialog open={aberto !== null} onOpenChange={(open) => !open && setAberto(null)}>
        <DialogContent className="max-w-sm sm:max-w-md">
          {aberto && (
            <>
              <DialogHeader>
                <div
                  className={cn(
                    "mx-auto flex size-14 items-center justify-center rounded-2xl border",
                    aberto.conquistada
                      ? "border-chart-5/40 bg-chart-5/10 text-chart-5"
                      : "border-border/60 bg-secondary/40 text-muted-foreground/40",
                  )}
                >
                  {(() => {
                    const Icone = iconeDe(aberto.icone);
                    return <Icone className="size-7" />;
                  })()}
                </div>
                <DialogTitle className="text-center font-[family-name:var(--font-display)]">
                  {aberto.titulo}
                </DialogTitle>
                <DialogDescription className="text-center">{aberto.descricao}</DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border/60 bg-secondary/30 px-3 py-2.5 text-center text-xs text-muted-foreground">
                {aberto.conquistada ? (
                  <span className="text-chart-5">
                    Conquistado em {formatDate(aberto.data ?? "")}
                  </span>
                ) : (
                  aberto.explicacao
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
