import { useMemo, useState } from "react";
import { brl, brlCompact, alocacaoDoCaixa, type Totals, type WalletList } from "@/lib/caixa";
import { corDoIndice, COR_LIVRE } from "@/lib/palette";
import { cn } from "@/lib/utils";

interface AllocationBarProps {
  envelopes: WalletList[];
  summaries: Record<string, Totals>;
  /** Saldo do caixa SEM os envelopes (o que ainda está livre nele). */
  caixaLivre: number;
  onOpenEnvelope?: (id: string) => void;
}

/**
 * Barra de composição do caixa: mostra, de relance, para onde o dinheiro foi.
 *
 * Uma faixa só, proporcional ao módulo de cada parte (livre + envelopes). O
 * envelope focado acende e os outros apagam; a legenda embaixo repete o valor.
 * O todo é a soma dos módulos, então a barra sempre fecha 100% sem duplicar.
 */
export function AllocationBar({
  envelopes,
  summaries,
  caixaLivre,
  onOpenEnvelope,
}: AllocationBarProps) {
  const [foco, setFoco] = useState<string | null | undefined>(undefined);

  const partes = useMemo(
    () => alocacaoDoCaixa(envelopes, summaries, caixaLivre),
    [envelopes, summaries, caixaLivre],
  );

  if (partes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 px-4 py-5 text-center">
        <p className="text-sm text-muted-foreground">Nada distribuído ainda.</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Lance uma entrada no caixa e mande para os envelopes.
        </p>
      </div>
    );
  }

  const cor = (id: string | null, index: number) => (id === null ? COR_LIVRE : corDoIndice(index));

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
        {partes.map((p, index) => (
          <button
            key={p.id ?? "livre"}
            type="button"
            onMouseEnter={() => setFoco(p.id)}
            onMouseLeave={() => setFoco(undefined)}
            onFocus={() => setFoco(p.id)}
            onBlur={() => setFoco(undefined)}
            onClick={() => p.id && onOpenEnvelope?.(p.id)}
            aria-label={`${p.nome}: ${brl(p.valor)} (${Math.round(p.fracao * 100)}%)`}
            title={`${p.nome} — ${brl(p.valor)}`}
            className={cn(
              "h-full min-w-[6px] transition-opacity duration-200",
              p.id && onOpenEnvelope ? "cursor-pointer" : "cursor-default",
              foco !== undefined && foco !== p.id ? "opacity-30" : "opacity-100",
            )}
            style={{ width: `${p.fracao * 100}%`, background: cor(p.id, index) }}
          />
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {partes.map((p, index) => (
          <li
            key={p.id ?? "livre"}
            className={cn(
              "flex items-center gap-1.5 text-[11px] transition-opacity",
              foco !== undefined && foco !== p.id ? "opacity-40" : "opacity-100",
            )}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: cor(p.id, index) }}
            />
            <span className="text-muted-foreground">{p.nome}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {brlCompact(p.valor)}
            </span>
            <span className="tabular-nums text-muted-foreground/60">
              {Math.round(p.fracao * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
