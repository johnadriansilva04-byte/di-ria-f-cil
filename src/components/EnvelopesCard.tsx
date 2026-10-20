import { useEffect, useRef, useState } from "react";
import { Check, Layers, Loader2, Plus, Trash2, X } from "lucide-react";
import { brl, brlCompact, errorMessage, toNumber, type Totals, type WalletList } from "@/lib/caixa";
import { cn } from "@/lib/utils";
import { AllocationBar } from "./AllocationBar";

interface EnvelopesCardProps {
  /** Caixa aberto (lista raiz). O card só existe para raízes. */
  caixa: WalletList;
  caixaSaldo: number;
  envelopes: WalletList[];
  summaries: Record<string, Totals>;
  onCreate: (name: string) => Promise<void>;
  /** Envia valor do caixa para o envelope. */
  onDistribute: (input: MovimentoEnvelope) => Promise<void>;
  /** Traz o valor de um envelope de volta para o caixa (inverso de distribuir). */
  onReturn: (input: MovimentoEnvelope) => Promise<void>;
  /** Exclui o envelope e os lançamentos dele. */
  onDelete: (id: string) => Promise<void>;
  onOpen: (id: string) => void;
}

/**
 * Movimentação entre o caixa e um envelope. Só descreve o envelope; quem
 * decide quem é origem e destino é a ação (`onDistribute` / `onReturn`).
 */
export type MovimentoEnvelope = {
  envelopeId: string;
  envelopeNome: string;
  amount: number;
};

const inputClass =
  "min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 py-2 text-sm tabular-nums outline-none focus:border-ring focus:ring-1 focus:ring-ring/30";

/**
 * Envelopes (mini caixas) do caixa aberto: onde o dinheiro foi separado e
 * o botão de distribuir — o caixa desconta na hora e o envelope recebe.
 */
export function EnvelopesCard({
  caixa,
  caixaSaldo,
  envelopes,
  summaries,
  onCreate,
  onDistribute,
  onReturn,
  onDelete,
  onOpen,
}: EnvelopesCardProps) {
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState("");
  const [movendoPara, setMovendoPara] = useState<string | null>(null);
  const [direcao, setDirecao] = useState<"enviar" | "trazer">("enviar");
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const nomeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) nomeRef.current?.focus();
  }, [creating]);

  const fecharMovimentacao = () => {
    setMovendoPara(null);
    setValor("");
    setErro(null);
  };

  const abrirMovimentacao = (envId: string, dir: "enviar" | "trazer") => {
    if (movendoPara === envId && direcao === dir) {
      fecharMovimentacao();
      return;
    }
    setMovendoPara(envId);
    setDirecao(dir);
    setValor("");
    setErro(null);
  };

  const criar = () => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;
    setErro(null);
    setBusy(true);
    void onCreate(nomeLimpo)
      .then(() => {
        setNome("");
        setCreating(false);
      })
      .catch((e: unknown) => setErro(errorMessage(e, "Não deu para criar o envelope.")))
      .finally(() => setBusy(false));
  };

  const excluir = (envId: string) => {
    setErro(null);
    setBusy(true);
    void onDelete(envId)
      .then(() => setConfirmandoId(null))
      .catch((e: unknown) => setErro(errorMessage(e, "Não foi possível excluir o envelope.")))
      .finally(() => setBusy(false));
  };

  const mover = (envId: string, envNome: string, envSaldo: number) => {
    const amount = toNumber(valor);
    if (amount <= 0) {
      setErro("Informe um valor maior que zero.");
      return;
    }
    // Enviar: o teto é o que ainda está livre no caixa. Trazer: o teto é o que
    // o envelope tem de fato — não dá para devolver reserva que não existe.
    const disponivel = direcao === "enviar" ? caixaSaldo : envSaldo;
    if (amount > disponivel) {
      setErro(
        direcao === "enviar"
          ? `O caixa tem ${brl(caixaSaldo)} livre — ajuste o valor.`
          : `O envelope tem ${brl(envSaldo)} — ajuste o valor.`,
      );
      return;
    }
    setErro(null);
    setBusy(true);
    const acao =
      direcao === "enviar"
        ? onDistribute({ envelopeId: envId, envelopeNome: envNome, amount })
        : onReturn({ envelopeId: envId, envelopeNome: envNome, amount });
    void acao
      .then(() => fecharMovimentacao())
      .catch((e: unknown) =>
        setErro(
          errorMessage(
            e,
            direcao === "enviar" ? "Não foi possível distribuir." : "Não foi possível devolver.",
          ),
        ),
      )
      .finally(() => setBusy(false));
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="size-3.5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
              Envelopes
            </h2>
            <p className="truncate text-[11px] text-muted-foreground">
              separe o {"\u201C"}
              {caixa.name}
              {"\u201D"} por destino
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            livre {brlCompact(caixaSaldo)}
          </span>
          <button
            type="button"
            onClick={() => {
              setCreating((p) => !p);
              setErro(null);
            }}
            aria-label={creating ? "Cancelar novo envelope" : "Novo envelope"}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {creating ? <X className="size-4" /> : <Plus className="size-4" />}
          </button>
        </div>
      </header>

      {creating ? (
        <div className="mb-3 flex items-center gap-1.5">
          <input
            ref={nomeRef}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") criar();
              if (e.key === "Escape") {
                setCreating(false);
                setNome("");
              }
            }}
            placeholder="Nome (ex: Aluguel, Moto, Gasolina)"
            className={inputClass}
          />
          <button
            type="button"
            onClick={criar}
            disabled={busy}
            aria-label="Criar envelope"
            className="shrink-0 rounded-lg p-2 text-primary transition-colors hover:bg-secondary disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </button>
        </div>
      ) : null}

      {envelopes.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border/70 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhum envelope ainda.</p>
          <p className="text-xs text-muted-foreground/60">
            Crie “Aluguel”, “Moto”, “Gasolina”… e mande dinheiro do caixa pra cada um. Depois use
            “Trazer” pra devolver o que sobrou.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <AllocationBar
              envelopes={envelopes}
              summaries={summaries}
              caixaLivre={caixaSaldo}
              onOpenEnvelope={onOpen}
            />
          </div>
          <ul className="space-y-2">
            {envelopes.map((env) => {
              const totais = summaries[env.id];
              const saldo = totais?.balance ?? 0;
              const aberto = movendoPara === env.id;
              const trazendo = aberto && direcao === "trazer";

              return (
                <li key={env.id} className="rounded-xl border border-border/60 bg-secondary/30 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                    <button
                      type="button"
                      onClick={() => onOpen(env.id)}
                      className="min-w-0 flex-1 basis-40 text-left"
                      aria-label={`Abrir envelope ${env.name}`}
                    >
                      <span className="block truncate text-sm font-semibold hover:text-primary">
                        {env.name}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground/70">
                        {totais?.count ?? 0} {totais?.count === 1 ? "lançamento" : "lançamentos"}
                      </span>
                    </button>
                    <span
                      className={cn(
                        "shrink-0 font-[family-name:var(--font-display)] text-sm font-bold tabular-nums",
                        saldo < 0
                          ? "text-expense"
                          : saldo > 0
                            ? "text-income"
                            : "text-muted-foreground",
                      )}
                    >
                      {brl(saldo)}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => abrirMovimentacao(env.id, "enviar")}
                        className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
                      >
                        Enviar
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirMovimentacao(env.id, "trazer")}
                        disabled={saldo <= 0}
                        title={saldo <= 0 ? "O envelope não tem saldo para trazer" : undefined}
                        className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Trazer
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmandoId(confirmandoId === env.id ? null : env.id)}
                        disabled={busy}
                        aria-label={`Excluir envelope ${env.name}`}
                        title={`Excluir ${env.name}`}
                        className="rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-destructive/15 hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {confirmandoId === env.id ? (
                    <div className="mt-2 rounded-lg bg-destructive/10 px-3 py-2">
                      <p className="text-xs text-destructive">
                        Excluir “{env.name}” e {totais?.count ?? 0}{" "}
                        {(totais?.count ?? 0) === 1 ? "lançamento" : "lançamentos"}?
                      </p>
                      <div className="mt-1.5 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => excluir(env.id)}
                          disabled={busy}
                          className="rounded bg-destructive px-2 py-1 text-[11px] font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
                        >
                          {busy ? <Loader2 className="size-3 animate-spin" /> : "Excluir"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmandoId(null)}
                          className="rounded px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {saldo < 0 ? (
                    <p className="mt-1.5 text-[10px] font-medium text-expense">
                      Reserva estourada — faltou {brl(Math.abs(saldo))}
                    </p>
                  ) : null}

                  {aberto ? (
                    <div className="mt-2.5 flex items-center gap-1.5 border-t border-border/60 pt-2.5">
                      <span className="text-xs text-muted-foreground">R$</span>
                      <input
                        autoFocus
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") mover(env.id, env.name, saldo);
                          if (e.key === "Escape") fecharMovimentacao();
                        }}
                        inputMode="decimal"
                        placeholder="0,00"
                        aria-label={
                          trazendo
                            ? `Valor a trazer de ${env.name}`
                            : `Valor a enviar para ${env.name}`
                        }
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => mover(env.id, env.name, saldo)}
                        disabled={busy}
                        aria-label={trazendo ? "Confirmar trazer" : "Confirmar envio"}
                        className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : trazendo ? (
                          "Trazer"
                        ) : (
                          "Mandar"
                        )}
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {erro ? <p className="mt-2 text-[11px] font-medium text-destructive">{erro}</p> : null}
    </section>
  );
}
