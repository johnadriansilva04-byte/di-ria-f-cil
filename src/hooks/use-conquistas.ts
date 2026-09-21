import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Meta } from "./use-metas";
import {
  avaliarTrofeus,
  TROFEUS,
  trofeuPorTipo,
  type Conquista,
  type TrofeuDef,
} from "@/lib/trofeus";

export const CONQUISTAS_MIGRATION_HINT =
  "A Sala de Troféus ainda não está ligada: rode o SQL de conquistas no Supabase.";

export type TrofeuNaSala = TrofeuDef & {
  conquistada: boolean;
  /** Data da conquista; null enquanto o troféu não foi ganho. */
  data: string | null;
};

function tabelaAusente(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  if (!err) return false;
  const message = err.message ?? "";
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    message.includes("public.conquistas") ||
    message.includes('relation "conquistas"')
  );
}

/**
 * Sala de Troféus: observa as metas do usuário e grava o troféu no banco no
 * instante em que uma meta é batida.
 *
 * O usuário pode ter o app aberto em dois aparelhos, então a mesma conquista
 * pode ser avaliada nos dois ao mesmo tempo. A gravação é `upsert` na chave
 * (user_id, tipo), o que torna repetição inofensiva, e um conjunto de tipos
 * "em voo" evita disparar a mesma inserção duas vezes seguidas.
 */
export function useConquistas(
  userId: string,
  metas: Meta[],
  options?: { onDesbloqueio?: (conquista: Conquista) => void },
) {
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabelaFaltando, setTabelaFaltando] = useState(false);

  const emVoo = useRef<Set<string>>(new Set());
  const jaAvisados = useRef<Set<string>>(new Set());
  const carregado = useRef(false);
  const passadaInicial = useRef(false);
  const avisoRef = useRef(options?.onDesbloqueio);
  avisoRef.current = options?.onDesbloqueio;

  const avisar = useCallback((conquista: Conquista) => {
    if (jaAvisados.current.has(conquista.tipo)) return;
    jaAvisados.current.add(conquista.tipo);
    // Quem já tinha metas concluídas antes dos troféus existirem recebe os
    // selos de uma vez, mas sem uma fila de avisos na cara: só o próximo
    // troféu ganho de verdade é anunciado.
    if (!passadaInicial.current) return;
    avisoRef.current?.(conquista);
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { data, error: queryError } = await supabase
        .from("conquistas")
        .select("*")
        .eq("user_id", userId)
        .order("data_conquistada", { ascending: false });

      if (queryError) throw queryError;

      const rows = (data ?? []) as Conquista[];
      setConquistas(rows);
      setTabelaFaltando(false);
      // Troféu que já estava lá não deve reacender o aviso ao abrir o app.
      for (const row of rows) jaAvisados.current.add(row.tipo);
    } catch (e) {
      if (tabelaAusente(e)) {
        setTabelaFaltando(true);
        setError(CONQUISTAS_MIGRATION_HINT);
      } else {
        setError(e instanceof Error ? e.message : "Erro ao carregar os troféus");
      }
    } finally {
      carregado.current = true;
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Avalia a cada mudança nas metas: bater a meta é o que solta o troféu.
  useEffect(() => {
    if (!carregado.current || tabelaFaltando) return;

    const pendentes = avaliarTrofeus(
      metas,
      conquistas.map((c) => c.tipo),
    ).filter((p) => !emVoo.current.has(p.tipo));

    if (pendentes.length === 0) {
      // Sem nada para gravar, a passada inicial já terminou.
      passadaInicial.current = true;
      return;
    }

    let cancelado = false;
    // A primeira passada só preenche a sala (backfill). Anunciar dela sairia
    // uma fila de avisos para quem já tinha metas batidas antes dos troféus.
    const silencioso = !passadaInicial.current;

    const gravar = async () => {
      for (const pendente of pendentes) {
        const def = trofeuPorTipo(pendente.tipo);
        if (!def) continue;
        emVoo.current.add(pendente.tipo);

        const { data, error: upsertError } = await supabase
          .from("conquistas")
          .upsert(
            {
              user_id: userId,
              tipo: def.tipo,
              titulo: def.titulo,
              descricao: def.descricao,
              icone: def.icone,
              meta_id: pendente.metaId,
            },
            { onConflict: "user_id,tipo", ignoreDuplicates: true },
          )
          .select()
          .maybeSingle();

        emVoo.current.delete(pendente.tipo);
        if (cancelado) return;

        if (upsertError) {
          if (tabelaAusente(upsertError)) {
            setTabelaFaltando(true);
            setError(CONQUISTAS_MIGRATION_HINT);
          }
          continue;
        }

        if (!data) continue; // já existia: nada novo para anunciar

        const nova = data as Conquista;
        setConquistas((prev) =>
          prev.some((c) => c.tipo === nova.tipo) ? prev : [nova, ...prev],
        );
        if (!silencioso) avisar(nova);
        else jaAvisados.current.add(nova.tipo);
      }
    };

    void gravar().finally(() => {
      if (!cancelado) passadaInicial.current = true;
    });

    return () => {
      cancelado = true;
    };
  }, [metas, conquistas, userId, tabelaFaltando, avisar]);

  // Troféu ganho em outro aparelho entra na sala na hora.
  useEffect(() => {
    const channel = supabase
      .channel(`conquistas-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conquistas", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const removed = (payload.old as { id?: string } | null)?.id;
            if (removed) setConquistas((prev) => prev.filter((c) => c.id !== removed));
            return;
          }
          const chegou = payload.new as Conquista;
          setConquistas((prev) =>
            prev.some((c) => c.tipo === chegou.tipo) ? prev : [chegou, ...prev],
          );
          // Veio de outro aparelho: é conquista de agora, então avisa mesmo
          // durante a passada inicial (aqui não há risco de fila de avisos).
          if (!jaAvisados.current.has(chegou.tipo)) {
            jaAvisados.current.add(chegou.tipo);
            avisoRef.current?.(chegou);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const porTipo = new Map(conquistas.map((c) => [c.tipo, c]));
  const catalogo: TrofeuNaSala[] = TROFEUS.map((def) => {
    const ganho = porTipo.get(def.tipo);
    return {
      ...def,
      conquistada: Boolean(ganho),
      data: ganho?.data_conquistada ?? null,
    };
  });

  const ganhos = conquistas.length;

  return { conquistas, catalogo, ganhos, loading, error, tabelaFaltando, reload: load };
}
