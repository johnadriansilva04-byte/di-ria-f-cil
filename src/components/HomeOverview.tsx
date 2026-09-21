import { Suspense, useMemo } from "react";
import { TrendingDown, TrendingUp, ArrowRight } from "lucide-react";
import { brl, totalsOf, type Entry, type WalletList } from "@/lib/caixa";
import { cn } from "@/lib/utils";
import { FinancialHealth } from "./FinancialHealth";
import { SmartInsights } from "./SmartInsights";
import { CashFlow } from "./CashFlow";
import { FinancialGoals } from "./FinancialGoals";

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
}: HomeOverviewProps) {
  const totals = useMemo(() => totalsOf(entries), [entries]);

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
            <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-lg sm:p-8">
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
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  Saldo total
                </p>
                <p
                  className={cn(
                    "mt-3 font-[family-name:var(--font-display)] text-5xl font-bold tabular-nums tracking-tight sm:text-7xl",
                    totals.balance < 0 ? "text-expense" : "text-foreground",
                  )}
                >
                  {brl(totals.balance)}
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-income" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        Receitas
                      </p>
                      <p className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-income">
                        {brl(totals.income)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="size-4 text-expense" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        Despesas
                      </p>
                      <p className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-expense">
                        {brl(totals.expense)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Premium Insights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FinancialHealth entries={entries} lists={lists} />
              <CashFlow entries={entries} />
            </div>

            <SmartInsights entries={entries} lists={lists} />

            <FinancialGoals currentBalance={totals.balance} />

            {/* Quick access to wallets */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
                  Meus Caixas
                </h2>
                <span className="text-[11px] text-muted-foreground">{lists.length} {lists.length === 1 ? "caixa" : "caixas"}</span>
              </div>

              {lists.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 px-5 py-8 text-center">
                  <p className="text-sm text-muted-foreground">Você ainda não tem caixas.</p>
                  <button
                    type="button"
                    onClick={onOpenSidebar}
                    className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] lg:hidden"
                  >
                    Criar primeiro caixa
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lists.map((list) => {
                    const listEntries = entries.filter((e) => e.listaId === list.id);
                    const listTotals = totalsOf(listEntries);

                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => onOpenList(list.id)}
                        className="group flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-secondary/30 hover:border-primary/40 hover:bg-secondary/50 transition-all active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-semibold truncate">{list.name}</span>
                          <ArrowRight className="size-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] text-muted-foreground">{listTotals.count} lançamentos</span>
                          <span
                            className={cn(
                              "font-[family-name:var(--font-display)] text-sm font-bold tabular-nums",
                              listTotals.balance < 0 ? "text-expense" : listTotals.balance > 0 ? "text-income" : "text-muted-foreground",
                            )}
                          >
                            {brl(listTotals.balance)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
