import { useMemo } from "react";
import { CalendarCheck2, CalendarX2, Flame, Sparkles, Target, Trophy } from "lucide-react";
import { gamificationState, friendlyMonthLabel, money } from "@/lib/goals";
import type { Entry } from "@/lib/caixa";
import { cn } from "@/lib/utils";

interface GamificationPanelProps {
  entries: Entry[];
  className?: string;
}

/**
 * Painel de METAS E RECORDES da Home.
 *
 * Mostra o "estado do jogo" do usuário:
 * - meta do dia (ganhou hoje?)
 * - meta do mês (dias úteis com receita)
 * - sequência de dias seguidos
 * - recorde de receita mensal
 * Tudo calculado direto dos lançamentos, sem config extra.
 */
export function GamificationPanel({ entries, className }: GamificationPanelProps) {
  const g = useMemo(() => gamificationState(entries), [entries]);

  const monthTarget = g.monthDaysTarget;
  const monthLabel = friendlyMonthLabel(g.monthKey);
  const monthPct = Math.round(g.monthProgress * 100);

  const recordLabel = g.bestMonth
    ? `${friendlyMonthLabel(g.bestMonth.month)} · ${money(g.bestMonth.income)}`
    : "Nenhuma receita ainda";

  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5", className)}>
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
          <Sparkles className="size-4 text-primary" />
          Metas e recordes
        </h2>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Gamificação
        </span>
      </header>

      {/* Meta do dia */}
      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/30 px-3 py-2.5">
        {g.dayDone ? (
          <CalendarCheck2 className="size-5 shrink-0 text-income" />
        ) : (
          <CalendarX2 className="size-5 shrink-0 text-muted-foreground/50" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">Meta do dia</p>
          <p className="text-[11px] text-muted-foreground">
            {g.dayDone ? "Você ganhou hoje. Meta cumprida! ✓" : "Registre uma entrada hoje para cumprir a meta."}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-bold",
            g.dayDone ? "bg-income/15 text-income" : "bg-secondary text-muted-foreground",
          )}
        >
          {g.dayDone ? "feito" : "hoje"}
        </span>
      </div>

      {/* Meta do mês */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <Target className="size-4 text-primary" />
            Meta do mês
            <span className="font-normal text-muted-foreground">· {monthLabel}</span>
          </p>
          <span className="text-[11px] tabular-nums font-semibold text-muted-foreground">
            {g.monthDaysDone}/{monthTarget} dias
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              monthPct >= 100 ? "bg-income" : "bg-primary",
            )}
            style={{ width: `${monthPct}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {g.monthDaysDone === 0
            ? "Registre receitas nos dias úteis para encher a barra."
            : monthPct >= 100
              ? "Meta mensal batida! 🎉"
              : `Você registrou receita em ${g.monthDaysDone} ${g.monthDaysDone === 1 ? "dia" : "dias"} úteis deste mês.`}
        </p>
      </div>

      {/* Sequência + Recorde */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/70 bg-secondary/30 px-3 py-2.5">
          <div className="flex items-center justify-between gap-1">
            <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Flame className={cn("size-3.5", g.streak > 0 ? "text-chart-5" : "text-muted-foreground/40")} />
              Sequência
            </p>
            <span
              className={cn(
                "font-[family-name:var(--font-display)] text-base font-bold tabular-nums",
                g.streak > 0 ? "text-foreground" : "text-muted-foreground/40",
              )}
            >
              {g.streak}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground/60">
            {g.streak > 0
              ? `${g.streak} ${g.streak === 1 ? "dia" : "dias"} seguidos`
              : "nenhum lançamento hoje"}
            {g.bestStreak > 0 ? ` · melhor: ${g.bestStreak}` : ""}
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-secondary/30 px-3 py-2.5">
          <div className="flex items-center justify-between gap-1">
            <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Trophy className={cn("size-3.5", g.bestMonth ? "text-chart-5" : "text-muted-foreground/40")} />
              Recorde
            </p>
            <span
              className={cn(
                "font-[family-name:var(--font-display)] text-base font-bold tabular-nums",
                g.isNewRecordMonth ? "text-chart-5" : "text-foreground",
              )}
            >
              {g.bestMonth ? money(g.bestMonth.income) : "—"}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground/60" title={recordLabel}>
            {g.bestMonth ? recordLabel : "sem receita mensal ainda"}
          </p>
        </div>
      </div>

      {g.isNewRecordMonth ? (
        <p className="mt-3 rounded-lg border border-chart-5/30 bg-chart-5/10 px-3 py-2 text-center text-[11px] font-semibold text-chart-5">
          🏆 RECORDE MENSAL! Seu melhor mês com receita até agora.
        </p>
      ) : null}
    </section>
  );
}