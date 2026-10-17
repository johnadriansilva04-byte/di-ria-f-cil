import { addDays, today, type Entry } from "./caixa";

/**
 * Sequência de dias (streak): dias consecutivos com ao menos um lançamento.
 *
 * Regras:
 * - sem lançamentos = 0;
 * - lançar hoje mantém a sequência viva; ainda sem lançamento hoje não zera
 *   nada — a sequência vale contando de ontem (o dia ainda não acabou).
 */
export function streakOf(entries: Entry[]): number {
  if (entries.length === 0) return 0;

  const dias = new Set(entries.map((e) => e.date));
  let cursor = today();
  if (!dias.has(cursor)) cursor = addDays(cursor, -1);

  let sequencia = 0;
  while (dias.has(cursor)) {
    sequencia += 1;
    cursor = addDays(cursor, -1);
  }
  return sequencia;
}
