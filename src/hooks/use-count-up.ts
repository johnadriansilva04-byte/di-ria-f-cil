import { useEffect, useRef, useState } from "react";

const semAnimacao = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Contagem animada de valores monetários: parte do valor exibido anterior e
 * vai até o novo em `duration` ms (cubic-out, um único rAF para todo o número).
 *
 * - No primeiro render já mostra o valor final (SSR não fica com R$ 0,00);
 * - quando o valor muda depois de montado (ex: entrou um lançamento), anima;
 * - `prefers-reduced-motion` pula direto pro resultado.
 */
export function useCountUp(target: number, duration = 650): number {
  const [display, setDisplay] = useState(target);
  const atualRef = useRef(target);
  const frameRef = useRef(0);

  useEffect(() => {
    const from = atualRef.current;

    if (from === target || semAnimacao()) {
      atualRef.current = target;
      setDisplay(target);
      return undefined;
    }

    let startedAt = 0;
    const step = (now: number) => {
      if (!startedAt) startedAt = now;
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (target - from) * eased;
      setDisplay(current);
      atualRef.current = progress < 1 ? current : target;
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return display;
}
