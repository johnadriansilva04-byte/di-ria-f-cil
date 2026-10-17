import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { brl, semTransferencias, totalsOf, type Entry, type WalletList } from "@/lib/caixa";
import { streakOf } from "@/lib/streak";
import { playGain, playTrophy } from "@/lib/sfx";
import { useMetas } from "@/hooks/use-metas";
import { useConquistas } from "@/hooks/use-conquistas";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";
import { FinancialHealth } from "./FinancialHealth";
import { SmartInsights } from "./SmartInsights";
import { CashFlow } from "./CashFlow";
import { ExpenseCategories } from "./ExpenseCategories";
import { FinancialGoals } from "./FinancialGoals";
import { GoalCelebration } from "./GoalCelebration";
import { HomeDonutChart } from "./HomeDonutChart";
import { SalaDeTrofeus } from "./SalaDeTrofeus";

interface HomeOverviewProps {
  lists: WalletList[];
  entries: Entry[];
  loading: boolean;
  onOpenList: (id: string) => void;
  onOpenSidebar: () => void;
  userId: string;
}

/**
 * HOME / VISÃO GERAL do EASY ACCOUNT.
 *
 * Dashboard premium com foco nas informações essenciais:
 * - Saldo atual (prominente)
 * - Saúde financeira (score)
 * - Insights inteligentes
 * - Fluxo de caixa
 * - Distribuição de gastos
 * - Metas financeiras
 * - Acesso rápido aos caixas
 */
export function HomeOverview({
  lists,
  entries,
  loading,
  onOpenList,
  onOpenSidebar,
  userId,
}: HomeOverviewProps) {
  // Movimentação interna (distribuição caixa → envelope) não conta como
  // renda/gasto global: os pares se cancelam, então o saldo não muda.
  const reais = useMemo(() => semTransferencias(entries), [entries]);
  const totals = useMemo(() => totalsOf(reais), [reais]);
  const saldoAnimado = useCountUp(totals.balance);
  const sequencia = useMemo(() => streakOf(entries), [entries]);
  const { metas, loading: metasLoading, addMeta, deleteMeta, addToMeta } = useMetas(userId);
  const [novoTipo, setNovoTipo] = useState<string | null>(null);
  const [metaCelebrada, setMetaCelebrada] = useState<string | null>(null);
  const metasConcluidasRef = useRef<Set<string> | null>(null);
  const brilhoTimer = useRef<number | null>(null);

  // O troféu nasce do próprio hook: aqui só sobra avisar o usuário.
  const {
    catalogo,
    loading: trofeusLoading,
    tabelaFaltando,
  } = useConquistas(userId, metas, {
    onDesbloqueio: (conquista) => {
      toast.success(`Troféu conquistado: ${conquista.titulo}`, {
        description: conquista.descricao,
      });
      playTrophy();
      setNovoTipo(conquista.tipo);
    },
  });

  // Celebra só o que acabou de ser concluído DURANTE a sessão:
  // metas já batidas na chegada não disparam confete de novo.
  useEffect(() => {
    if (metasLoading) return;
    const concluidas = new Set(
      metas.filter((m) => m.concluida || m.valor_atual >= m.valor_alvo).map((m) => m.id),
    );
    const anteriores = metasConcluidasRef.current;
    if (anteriores) {
      for (const id of concluidas) {
        if (anteriores.has(id)) continue;
        const meta = metas.find((m) => m.id === id);
        if (!meta) continue;
        setMetaCelebrada(meta.nome);
        toast.success(`Meta concluída: ${meta.nome}`, { description: "Fechou a meta! 🎯" });
        playGain();
      }
    }
    metasConcluidasRef.current = concluidas;
  }, [metas, metasLoading]);

  // O brilho é só de estreia: some sozinho para o selo não ficar piscando.
  useEffect(() => {
    if (!novoTipo) return;
    if (brilhoTimer.current) window.clearTimeout(brilhoTimer.current);
    brilhoTimer.current = window.setTimeout(() => setNovoTipo(null), 1400);
    return () => {
      if (brilhoTimer.current) window.clearTimeout(brilhoTimer.current);
    };
  }, [novoTipo]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        {loading && lists.length === 0 ? (
          <div className="grid gap-4">
            <div className="h-40 animate-pulse rounded-3xl border border-border bg-card" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
              <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Saldo geral - HERO SECTION */}
            <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-lg sm:p-8">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(50% 120% at 100% 0%, oklch(0.65 0.12 255 / 0.16), transparent 70%)," +
                    "radial-gradient(45% 100% at 0% 100%, oklch(0.72 0.14 155 / 0.12), transparent 70%)",
                }}
              />
              <div className="relative">
                <p
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-widest",
                    totals.balance < 0 ? "text-expense" : "text-muted-foreground/70",
                  )}
                >
                  {totals.balance < 0 ? "Dívida global" : "Caixa global"}
                </p>
                <p
                  className={cn(
                    "mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums tracking-tight sm:text-5xl lg:text-6xl",
                    totals.balance < 0 ? "text-expense" : "text-foreground",
                  )}
                >
                  {brl(saldoAnimado)}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-3.5 sm:size-4 text-income" />
                    <div>
                      <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        Renda global
                      </p>
                      <p className="font-[family-name:var(--font-display)] text-xs sm:text-sm font-bold tabular-nums text-income">
                        {brl(totals.income)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="size-3.5 sm:size-4 text-expense" />
                    <div>
                      <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        Gastos global
                      </p>
                      <p className="font-[family-name:var(--font-display)] text-xs sm:text-sm font-bold tabular-nums text-expense">
                        {brl(totals.expense)}
                      </p>
                    </div>
                  </div>
                  {sequencia > 0 ? (
                    <div
                      title="Dias seguidos lançando no caixa"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1"
                    >
                      <Flame className="size-3.5 text-chart-5" />
                      <span className="text-[11px] font-semibold tabular-nums">
                        {sequencia} {sequencia === 1 ? "dia seguido" : "dias seguidos"}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            {/* Premium Insights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FinancialHealth entries={reais} lists={lists} />
              <CashFlow entries={reais} />
            </div>

            <ExpenseCategories entries={reais} />

            <SmartInsights entries={reais} lists={lists} />

            {/* Metas e troféus lado a lado: metade da rolagem, mesma informação. */}
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <FinancialGoals
                currentBalance={totals.balance}
                metas={metas}
                loading={metasLoading}
                addMeta={addMeta}
                deleteMeta={deleteMeta}
                addToMeta={addToMeta}
              />

              <SalaDeTrofeus
                catalogo={catalogo}
                loading={trofeusLoading}
                tabelaFaltando={tabelaFaltando}
                novoTipo={novoTipo}
              />
            </div>

            {/* Donut por caixa — a legenda já são os cards clicáveis: substitui
                a antiga seção “Meus Caixas” sem duplicar informação. */}
            <HomeDonutChart
              lists={lists}
              entries={entries}
              onOpenList={onOpenList}
              onOpenSidebar={onOpenSidebar}
            />
          </div>
        )}
      </div>

      {metaCelebrada ? (
        <GoalCelebration name={metaCelebrada} onDone={() => setMetaCelebrada(null)} />
      ) : null}
    </div>
  );
}
