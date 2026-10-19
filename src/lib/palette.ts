/**
 * Paleta única dos gráficos.
 *
 * Os tokens `--chart-*` já mudam junto com o tema (claro/escuro), então as
 * cores aqui acompanham o resto do app sem precisar de JS para trocar.
 */
export const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
  "var(--income)",
  "var(--expense)",
] as const;

/** Cor estável para o item `index` (dá a volta na paleta). */
export const corDoIndice = (index: number): string =>
  CHART_PALETTE[index % CHART_PALETTE.length] ?? CHART_PALETTE[0];

/** Cor reservada para o que não é um envelope: o dinheiro livre no caixa. */
export const COR_LIVRE = "var(--muted-foreground)";
