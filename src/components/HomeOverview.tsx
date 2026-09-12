import { Suspense, useMemo } from "react";
import { ArrowRight, LayoutDashboard, Scale, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { brl, brlCompact, totalsByList, totalsOf, type Entry, type WalletList } from "@/lib/caixa";
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
  const perList = useMemo(() => totalsByList(entries), [entries]);

  const caixaWord = lists.length === 1 ? "caixa" : "caixas";

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
                    : `${entries.length} ${entries.length === 1 ? "lançamento" : "lançamentos"} em ${lists.length} ${caixaWord}`}
                </p>
              </div>
            </section>

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

            {/* Caixas */}
            <section>
              <header className="mb-2.5 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <LayoutDashboard className="size-3.5" />
                  </span>
                  Seus caixas
                </h2>
                {lists.length > 0 ? (
                  <span className="text-[11px] text-muted-foreground">
                    {lists.length} {caixaWord} · toque para abrir
                  </span>
                ) : null}
              </header>

              {lists.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 px-5 py-10 text-center">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Wallet className="size-5" />
                  </span>
                  <p className="text-sm font-medium text-foreground">Você ainda não tem caixas..</p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Crie uma lista na barra lateral ao lado para começar a lançar..
                  </p>
                  <button
                    type="button"
                    onClick={onOpenSidebar}
                    className="mt-1 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] lg:hidden"
                  >
                    Criar primeiro caixa
                  </button>
                </div>
              ) : (
                <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {lists.map((list) => {
                    const summary = perList[list.id] ?? {
                      income: 0,
                      expense: 0,
                      balance: 0,
                      count: 0,
                    };
                    return (
                      <li key={list.id}>
                        <button
                          type="button"
                          onClick={() => onOpenList(list.id)}
                          aria-label={`Abrir caixa ${list.name}`}
                          className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-[family-name:var(--font-display)] text-sm font-bold text-primary">
                            {list.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="truncate text-sm font-semibold">{list.name}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/70">
                              <span className="inline-flex items-center gap-1">
                                <TrendingUp className="size-3 text-income" />
                                {brlCompact(summary.income)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <TrendingDown className="size-3 text-expense" />
                                {brlCompact(summary.expense)}
                              </span>
                            </span>
                          </span>
                          <span
                            className={cn(
                              "shrink-0 font-[family-name:var(--font-display)] text-sm font-bold tabular-nums",
                              summary.balance < 0
                                ? "text-expense"
                                : summary.balance > 0
                                  ? "text-income"
                                  : "text-muted-foreground/60",
                            )}
                          >
                            {summary.balance >= 0 ? "+" : "−"} {brl(Math.abs(summary.balance))}
                          </span>
                          <ArrowRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Gráfico geral (pizza por caixa) */}
            <Suspense
              fallback={
                <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
              }
            >
              <HomeDonutChart lists={lists} entries={entries} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
