import { Suspense, useMemo } from "react";
import { Scale, TrendingDown, TrendingUp } from "lucide-react";
import { brl, totalsOf, type Entry, type WalletList } from "@/lib/caixa";
import { cn } from "@/lib/utils";
import { HomeDonutChart } from "./HomeDonutChart";

interface HomeOverviewProps {
  lists: WalletList[];
  entries: Entry[];
  loading: boolean;
  onOpenList: (id: string) => void;
  onOpenSidebar: () => void;
}

/**
 * HOME / VISÃO GERAL do EASY ACCOUNT.
 *
 * É o nível acima dos caixas: mostra o dinheiro do usuário como um todo
 * (saldo, recebido, gasto, resultado e gráfico geral) e lista cada caixa
 * como um atalho. Clicar em um caixa abre a tela individual dele.
 */
export function HomeOverview({
  lists,
  entries,
  loading,
  onOpenList,
  onOpenSidebar,
}: HomeOverviewProps) {
  const totals = useMemo(() => totalsOf(entries), [entries]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        {loading && lists.length === 0 ? (
          <div className="grid gap-3">
            <div className="h-40 animate-pulse rounded-3xl border border-border bg-card" />
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="h-20 animate-pulse rounded-xl border border-border bg-card" />
              <div className="h-20 animate-pulse rounded-xl border border-border bg-card" />
              <div className="h-20 animate-pulse rounded-xl border border-border bg-card" />
            </div>
            <div className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Saldo geral */}
            <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
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
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Saldo geral
                  </p>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    todos os caixas
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums tracking-tight sm:text-6xl",
                    totals.balance < 0 ? "text-expense" : "text-foreground",
                  )}
                >
                  {brl(totals.balance)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {entries.length === 0
                    ? "Nenhum lançamento ainda — comece por um caixa abaixo."
                    : `${entries.length} ${entries.length === 1 ? "lançamento" : "lançamentos"} em ${lists.length} ${lists.length === 1 ? "caixa" : "caixas"}`}
                </p>
              </div>
            </section>

            {/* Gráfico geral (donut) + legenda = cards dos caixas */}
            <Suspense
              fallback={
                <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
              }
            >
              <HomeDonutChart
                lists={lists}
                entries={entries}
                onOpenList={onOpenList}
                onOpenSidebar={onOpenSidebar}
              />
            </Suspense>

            {/* Recebido / Gasto / Resultado */}
            <section className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-income" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Recebido
                  </p>
                </div>
                <p className="mt-1.5 truncate font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-income sm:text-xl">
                  {brl(totals.income)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="size-3.5 text-expense" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Gasto
                  </p>
                </div>
                <p className="mt-1.5 truncate font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-expense sm:text-xl">
                  {brl(totals.expense)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
                <div className="flex items-center gap-1.5">
                  <Scale className="size-3.5 text-primary" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Resultado
                  </p>
                </div>
                <p
                  className={cn(
                    "mt-1.5 truncate font-[family-name:var(--font-display)] text-base font-bold tabular-nums sm:text-xl",
                    totals.balance < 0 ? "text-expense" : "text-income",
                  )}
                >
                  {brl(totals.balance)}
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
