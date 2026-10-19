import { brlCompact, type TrendPoint } from "@/lib/caixa";

interface SparklineProps {
  data: TrendPoint[];
  /** A série está no positivo no fim? Muda a cor do traço. */
  positive?: boolean;
}

/**
 * Mini gráfico de tendência (saldo acumulado mês a mês) para os cartões de
 * caixa. SVG puro — leve, sem dependência de gráfico e sem eixo/rótulo, só a
 * forma da linha e um ponto no fim.
 */
export function Sparkline({ data, positive = true }: SparklineProps) {
  const W = 96;
  const H = 28;
  const PAD = 3;

  if (data.length < 2) return <div className="h-7 w-24" aria-hidden />;

  const valores = data.map((d) => d.value);
  const min = Math.min(0, ...valores);
  const max = Math.max(0, ...valores);
  const span = max - min || 1;

  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (data.length - 1);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);

  const pontos = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`);
  const linha = `M${pontos.join(" L")}`;
  const area = `${linha} L${x(data.length - 1).toFixed(1)},${(H - PAD).toFixed(1)} L${x(0).toFixed(1)},${(H - PAD).toFixed(1)} Z`;
  const ultimo = data[data.length - 1] ?? { value: 0, key: "" };

  const cor = positive ? "var(--income)" : "var(--expense)";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-7 w-24 shrink-0"
      role="img"
      aria-label={`Tendência: ${brlCompact(ultimo.value)}`}
    >
      <path d={area} fill={cor} opacity={0.12} />
      <path
        d={linha}
        fill="none"
        stroke={cor}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={x(data.length - 1)} cy={y(ultimo.value)} r={2.25} fill={cor} />
    </svg>
  );
}
