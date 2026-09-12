import { brlCompact, type Entry } from "./caixa";

/**
 * Gamificação do EASY ACCOUNT.
 *
 * Metas e recordes são calculados só com os dados que já existem no banco
 * (lançamentos). Nada de tabela extra: a meta é definida por heurísticas
 * simples que o usuário entende e pode conferir.
 *
 * - Meta do dia: 1 lançamento de ganho por dia.
 * - Meta do mês: somar um ganho por dia útil útil (dia 1..5).
 * - Recorde do mês: maior receita mensal já registrada (com data em que aconteceu).
 * - Recorde de sequência: dias seguidos com pelo menos 1 lançamento.
 */

export type MonthKey = string; // "YYYY-MM"

export function monthKeyOf(isoDate: string): MonthKey {
  return isoDate.slice(0, 7);
}

export function currentMonthKey(): MonthKey {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Dias do mês em que deveria haver lançamento (dias úteis, 1..5 = útil). */
export function workdayInMonth(month: MonthKey): number[] {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(y ?? 2000, (m ?? 1), 0).getDate();
  const days: number[] = [];
  for (let day = 1; day <= count; day += 1) {
    const dow = new Date(y ?? 2000, (m ?? 1) - 1, day).getDay();
    if (dow >= 1 && dow <= 5) days.push(day);
  }
  return days;
}

export function friendlyMonthLabel(month: MonthKey): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y ?? 2000, (m ?? 1) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

/** Meta do dia: ganhou hoje? (pelo menos 1 entrada no dia) */
export function dayGoal(entries: Entry[], todayIso: string): boolean {
  return entries.some((e) => e.kind === "entrada" && e.date === todayIso);
}

/** Série de receitas mensais, usada para achar o recorde. */
export function monthlyIncomeSeries(entries: Entry[]): { month: MonthKey; income: number }[] {
  const map = new Map<MonthKey, number>();
  for (const e of entries) {
    if (e.kind !== "entrada") continue;
    const key = monthKeyOf(e.date);
    map.set(key, (map.get(key) ?? 0) + e.amount);
  }
  return Array.from(map.entries())
    .map(([month, income]) => ({ month, income }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
}

export type BestMonth = { month: MonthKey; income: number } | null;

/** Maior receita mensal já registrada (recorde). */
export function bestMonthEver(entries: Entry[]): BestMonth {
  const series = monthlyIncomeSeries(entries);
  let best: BestMonth = null;
  for (const point of series) {
    if (!best || point.income > best.income) best = point;
  }
  return best;
}

/** Dias seguidos (até hoje) com pelo menos um lançamento. */
export function currentStreak(entries: Entry[]): number {
  const days = new Set(entries.map((e) => e.date));
  let streak = 0;
  const day = new Date();
  // hoje: se ainda não lançou hoje, a sequência conta de ontem (não quebra à meia-noite).
  while (true) {
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(
      day.getDate(),
    ).padStart(2, "0")}`;
    if (days.has(iso)) {
      streak += 1;
      day.setDate(day.getDate() - 1);
    } else if (streak === 0) {
      // nenhum lançamento hoje: considera a partir de ontem
      day.setDate(day.getDate() - 1);
      const isoYest = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(
        day.getDate(),
      ).padStart(2, "0")}`;
      if (!days.has(isoYest)) break;
    } else {
      break;
    }
  }
  return streak;
}

/** Maior sequência já alcançada. */
export function bestStreakEver(entries: Entry[]): number {
  const dates = Array.from(new Set(entries.map((e) => e.date))).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  const addDay = (iso: string) => {
    const diff = (() => {
      if (!prev) return 1;
      const [py, pm, pd] = prev.split("-").map(Number);
      const t1 = new Date(py ?? 2000, (pm ?? 1) - 1, pd ?? 1).getTime();
      const [y, m, d] = iso.split("-").map(Number);
      const t2 = new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1).getTime();
      return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
    })();
    if (diff === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = iso;
  };
  for (const iso of dates) addDay(iso);
  return best;
}

/** % de progresso (0..1) de uma meta mensal baseada em dias úteis trabalhados. */
export function monthGoalProgress(entries: Entry[], month: MonthKey): number {
  const workdays = workdayInMonth(month);
  if (workdays.length === 0) return 0;
  const daysDone = new Set(
    entries.filter((e) => e.kind === "entrada" && monthKeyOf(e.date) === month).map((e) => e.date),
  ).size;
  const target = workdays.length;
  return Math.min(1, daysDone / target);
}

/** Número de dias (no mês) com receita registrada — usado no resumo. */
export function incomeDaysInMonth(entries: Entry[], month: MonthKey): number {
  return new Set(
    entries.filter((e) => e.kind === "entrada" && monthKeyOf(e.date) === month).map((e) => e.date),
  ).size;
}

export type GoalState = {
  dayDone: boolean;
  monthKey: MonthKey;
  monthProgress: number; // 0..1
  monthDaysDone: number;
  monthDaysTarget: number;
  incomeMonth: number;
  bestMonth: BestMonth;
  isNewRecordMonth: boolean;
  streak: number;
  bestStreak: number;
};

/** Calcula o estado completo da gamificação para a Home. */
export function gamificationState(entries: Entry[]): GoalState {
  const todayIso = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  })();
  const mk = currentMonthKey();
  const monthDays = workdayInMonth(mk);
  const monthDaysDone = incomeDaysInMonth(entries, mk);
  const bestMonth = bestMonthEver(entries);
  const incomeMonth = monthlyIncomeSeries(entries).find((m) => m.month === mk)?.income ?? 0;
  const isNewRecordMonth =
    !!bestMonth && bestMonth.month === mk && incomeMonth > 0 && incomeMonth >= bestMonth.income;

  return {
    dayDone: dayGoal(entries, todayIso),
    monthKey: mk,
    monthProgress: monthGoalProgress(entries, mk),
    monthDaysDone,
    monthDaysTarget: monthDays.length,
    incomeMonth,
    bestMonth,
    isNewRecordMonth,
    streak: currentStreak(entries),
    bestStreak: bestStreakEver(entries),
  };
}

/** Texto curto para exibir um valor compacto. */
export const money = brlCompact;