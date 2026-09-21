import { today } from "./caixa";
import type { Meta } from "@/hooks/use-metas";

/**
 * Troféus do EASY ACCOUNT.
 *
 * Regra: só sai troféu de meta que o próprio usuário criou e concluiu.
 * Nada é sorteado nem contado por lançamento solto — meta concluída é a
 * única porta de entrada da Sala de Troféus.
 */

export type TrofeuDef = {
  tipo: string;
  titulo: string;
  descricao: string;
  icone: string;
  /** Como conquistar, mostrado na ficha do troféu. */
  explicacao: string;
};

export type Conquista = {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  icone: string;
  meta_id: string | null;
  data_conquistada: string;
};

export const TROFEUS: TrofeuDef[] = [
  {
    tipo: "primeira_meta",
    titulo: "Primeira Conquista",
    descricao: "Você concluiu sua primeira meta.",
    icone: "trophy",
    explicacao: "Conclua qualquer meta criada por você.",
  },
  {
    tipo: "meta_mil",
    titulo: "Sonho de Mil",
    descricao: "Concluiu uma meta de R$ 1.000 ou mais.",
    icone: "star",
    explicacao: "Crie uma meta de R$ 1.000 ou mais e bata o valor alvo.",
  },
  {
    tipo: "meta_cinco_mil",
    titulo: "Grande Objetivo",
    descricao: "Concluiu uma meta de R$ 5.000 ou mais.",
    icone: "award",
    explicacao: "Crie uma meta de R$ 5.000 ou mais e bata o valor alvo.",
  },
  {
    tipo: "meta_dez_mil",
    titulo: "Meta de Gigante",
    descricao: "Concluiu uma meta de R$ 10.000 ou mais.",
    icone: "crown",
    explicacao: "Crie uma meta de R$ 10.000 ou mais e bata o valor alvo.",
  },
  {
    tipo: "tres_metas",
    titulo: "Sequência de Três",
    descricao: "Três metas concluídas.",
    icone: "medal",
    explicacao: "Conclua três metas.",
  },
  {
    tipo: "cinco_metas",
    titulo: "Colecionador",
    descricao: "Cinco metas concluídas.",
    icone: "sparkles",
    explicacao: "Conclua cinco metas.",
  },
  {
    tipo: "antes_do_prazo",
    titulo: "No Prazo Certo",
    descricao: "Bateu uma meta antes da data limite.",
    icone: "calendar-check",
    explicacao: "Conclua uma meta com data limite ainda no futuro.",
  },
];

/** Só meta batida de verdade conta: a flag do banco ou o valor chegando no alvo. */
export function metaBatida(meta: Meta): boolean {
  return meta.concluida || meta.valor_atual >= meta.valor_alvo;
}

export function trofeuPorTipo(tipo: string): TrofeuDef | undefined {
  return TROFEUS.find((t) => t.tipo === tipo);
}

export type TrofeuPendente = { tipo: string; metaId: string | null };

/** A meta mais antiga entre as batidas — vira o registro da primeira conquista. */
function primeiraConcluida(metas: Meta[]): Meta | undefined {
  return [...metas].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
}

/** A meta de maior valor alvo, usada nos troféus de valor. */
function maiorValor(metas: Meta[]): Meta | undefined {
  return [...metas].sort((a, b) => b.valor_alvo - a.valor_alvo)[0];
}

/**
 * Compara as metas batidas com os troféus já guardados e devolve só o que
 * ainda falta. Função pura: quem grava é o hook.
 */
export function avaliarTrofeus(metas: Meta[], jaConquistados: string[]): TrofeuPendente[] {
  const batidas = metas.filter(metaBatida);
  if (batidas.length === 0) return [];

  const posses = new Set(jaConquistados);
  const pendentes: TrofeuPendente[] = [];
  const guardar = (tipo: string, meta?: Meta) => {
    if (posses.has(tipo)) return;
    pendentes.push({ tipo, metaId: meta?.id ?? null });
  };

  guardar("primeira_meta", primeiraConcluida(batidas));

  const deMaiorValor = maiorValor(batidas);
  if (deMaiorValor && deMaiorValor.valor_alvo >= 1000) guardar("meta_mil", deMaiorValor);
  if (deMaiorValor && deMaiorValor.valor_alvo >= 5000) guardar("meta_cinco_mil", deMaiorValor);
  if (deMaiorValor && deMaiorValor.valor_alvo >= 10000) guardar("meta_dez_mil", deMaiorValor);

  if (batidas.length >= 3) guardar("tres_metas", primeiraConcluida(batidas));
  if (batidas.length >= 5) guardar("cinco_metas", primeiraConcluida(batidas));

  // Concluída dentro do prazo: a data limite ainda não passou no dia da conquista.
  const noPrazo = batidas
    .filter((m) => m.data_limite && m.data_limite >= today())
    .sort((a, b) => (a.data_limite ?? "").localeCompare(b.data_limite ?? ""));
  if (noPrazo.length > 0) guardar("antes_do_prazo", noPrazo[0]);

  return pendentes;
}
