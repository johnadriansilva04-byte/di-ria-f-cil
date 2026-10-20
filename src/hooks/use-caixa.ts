import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  adoptLegacyEntries,
  clearLegacyLocalLists,
  compactarLancamentos,
  createList,
  deleteEntry,
  deleteList,
  distribuir as distribuirNoBanco,
  devolver as devolverNoBanco,
  deleteMyAccount,
  errorMessage,
  familyEntriesOf,
  fetchEntries,
  fetchLists,
  fetchPerfil,
  getActiveListId,
  insertEntry,
  LISTS_MIGRATION_HINT,
  readLegacyLocalLists,
  renameList,
  rootsOf,
  savePerfil,
  setActiveListId,
  totalsByRoot,
  updateEntry,
  type Entry,
  type EntryPatch,
  type Kind,
  type Totals,
  type WalletList,
} from "@/lib/caixa";

export type Perfil = { diaria: number; valorHora: number };

export type NewEntry = {
  label: string;
  kind: Kind;
  amount: number;
  detail?: string | undefined;
  date?: string | undefined;
  /** Lista que recebe o lançamento (padrão: lista ativa). */
  listaId?: string | undefined;
};

/** Listas antigas que só existiam no navegador entram no banco uma única vez. */
async function importLocalLists(userId: string): Promise<WalletList[]> {
  const legacy = readLegacyLocalLists();
  if (legacy.length === 0) return [];

  const created: WalletList[] = [];
  for (const item of legacy) {
    try {
      created.push(await createList(userId, item.name, item.id));
    } catch {
      try {
        created.push(await createList(userId, item.name));
      } catch {
        /* lista antiga inválida: ignora */
      }
    }
  }
  if (created.length > 0) clearLegacyLocalLists();
  return created;
}

/**
 * Estado do CAIXA: listas, lançamentos e perfil, todos vindos do Supabase.
 *
 * Cuidado importante com o tempo real: quando o banco avisa de uma alteração,
 * uma recarga pode voltar com dados de ANTES da alteração que o usuário acabou
 * de fazer. Por isso cada consulta carrega um número de ordem e a "época" das
 * alterações locais; resultado velho é descartado em vez de sobrescrever a tela.
 * Exclusão é aplicada direto na lista local (não recarrega), então um
 * lançamento apagado nunca reaparece.
 */
export function useCaixa(userId: string) {
  const [lists, setLists] = useState<WalletList[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [activeListId, setActiveListIdState] = useState<string | null>(() => getActiveListId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestSeq = useRef(0);
  const mutationEpoch = useRef(0);
  const refreshTimer = useRef<number | null>(null);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      const seq = (requestSeq.current += 1);
      const epoch = mutationEpoch.current;
      if (!options?.silent) setLoading(true);

      try {
        const [loadedLists, loadedEntries, loadedPerfil] = await Promise.all([
          fetchLists(userId),
          fetchEntries(userId),
          fetchPerfil(userId).catch(() => null),
        ]);

        // Já saiu uma consulta mais nova, ou o usuário alterou algo enquanto
        // esta consulta estava no ar: não pode sobrescrever a tela.
        if (seq !== requestSeq.current) return;
        if (epoch !== mutationEpoch.current) return;

        let nextLists = loadedLists;
        if (nextLists.length === 0) {
          const imported = await importLocalLists(userId);
          const first = imported[0] ?? (await createList(userId, "Meu Trabalho"));
          nextLists = imported.length > 0 ? imported : [first];
          // Lançamentos antigos (criados antes das listas no banco) passam a
          // pertencer à primeira lista em vez de ficarem soltos.
          await adoptLegacyEntries(userId, first.id);
        }

        setLists(nextLists);
        setEntries(loadedEntries);
        if (loadedPerfil) setPerfil(loadedPerfil);
        setError(null);
        setActiveListIdState((current) => {
          if (current && nextLists.some((l) => l.id === current)) return current;
          return nextLists[0]?.id ?? null;
        });
      } catch (e) {
        if (seq === requestSeq.current) {
          setError(errorMessage(e, "Não foi possível carregar seus dados. Tente novamente."));
        }
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Guarda a lista ativa como preferência de navegação (não é dado financeiro).
  useEffect(() => {
    if (activeListId) setActiveListId(activeListId);
  }, [activeListId]);

  const scheduleRefresh = useCallback(
    (delay = 350) => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        refreshTimer.current = null;
        void load({ silent: true });
      }, delay);
    },
    [load],
  );

  useEffect(() => {
    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, []);

  /**
   * Envolve toda alteração no banco: qualquer consulta que tenha começado
   * antes dela é descartada.
   */
  const mutate = useCallback(async <T>(action: () => Promise<T>): Promise<T> => {
    mutationEpoch.current += 1;
    try {
      return await action();
    } finally {
      mutationEpoch.current += 1;
    }
  }, []);

  // Tempo real entre aparelhos. Exclusão é aplicada direto; o resto recarrega.
  useEffect(() => {
    const channel = supabase
      .channel(`caixa-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lancamentos", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const removed = (payload.old as { id?: string } | null)?.id;
            if (removed) setEntries((prev) => prev.filter((e) => e.id !== removed));
            return;
          }
          scheduleRefresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, scheduleRefresh]);

  // Ao voltar para o app, os números são revalidados.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh(0);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [scheduleRefresh]);

  const selectList = useCallback((id: string) => {
    setActiveListIdState(id);
  }, []);

  const addEntry = useCallback(
    async (input: NewEntry) => {
      if (!activeListId) throw new Error("Nenhuma lista selecionada.");
      const entry = await mutate(() =>
        insertEntry({
          userId,
          listaId: input.listaId ?? activeListId,
          label: input.label,
          kind: input.kind,
          amount: input.amount,
          detail: input.detail,
          date: input.date,
        }),
      );
      setEntries((prev) => [entry, ...prev]);
      return entry;
    },
    [userId, activeListId, mutate],
  );

  const editEntry = useCallback(
    async (id: string, patch: EntryPatch) => {
      await mutate(() => updateEntry(id, patch));
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                ...patch,
                detail: patch.detail === undefined ? e.detail : (patch.detail ?? undefined),
              }
            : e,
        ),
      );
    },
    [mutate],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      // Se o banco não apagar de verdade, lança erro em vez de fingir sucesso.
      await mutate(() => deleteEntry(id));
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [mutate],
  );

  const addList = useCallback(
    async (name: string, parentId?: string) => {
      const created = await mutate(() => createList(userId, name, undefined, parentId ?? null));
      setLists((prev) => [...prev, created]);
      // Criar um envelope não tira você da tela do caixa que está vendo.
      if (!parentId) setActiveListIdState(created.id);
      return created;
    },
    [userId, mutate],
  );

  /**
   * Transfere do caixa para um envelope: saída no caixa + entrada no envelope
   * (o par se cancela no total geral, sem inflar renda nem gastos globais).
   */
  const distribuir = useCallback(
    async (input: {
      deId: string;
      deNome: string;
      paraId: string;
      paraNome: string;
      amount: number;
    }) => {
      const par = await mutate(() => distribuirNoBanco({ userId, ...input }));
      setEntries((prev) => [par.entrada, par.saida, ...prev]);
      return par;
    },
    [userId, mutate],
  );

  /**
   * Traz o valor de um envelope de volta para o caixa (o inverso de distribuir).
   * Também é movimentação interna: não mexe no total geral.
   */
  const devolver = useCallback(
    async (input: {
      deId: string;
      deNome: string;
      paraId: string;
      paraNome: string;
      amount: number;
    }) => {
      const par = await mutate(() => devolverNoBanco({ userId, ...input }));
      setEntries((prev) => [par.entrada, par.saida, ...prev]);
      return par;
    },
    [userId, mutate],
  );

  /**
   * Limpeza pesada: um único request no servidor compacta vários meses e
   * depois a tela é carregada de novo com a tabela enxuta.
   */
  const otimizar = useCallback(
    async (dias: number) => {
      const meses = await mutate(() => compactarLancamentos(dias));
      scheduleRefresh(0);
      return meses;
    },
    [mutate, scheduleRefresh],
  );

  const editList = useCallback(
    async (id: string, name: string) => {
      await mutate(() => renameList(id, name));
      setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)));
    },
    [mutate],
  );

  const removeList = useCallback(
    async (id: string) => {
      // Excluir um caixa leva os envelopes junto (com os lançamentos deles).
      const filhas = lists.filter((l) => l.parentId === id);
      const removidas = [id, ...filhas.map((l) => l.id)];
      await mutate(async () => {
        for (const filha of filhas) await deleteList(filha.id);
        await deleteList(id);
      });
      const remaining = lists.filter((l) => !removidas.includes(l.id));
      setLists(remaining);
      setEntries((prev) => prev.filter((e) => !e.listaId || !removidas.includes(e.listaId)));
      setActiveListIdState((current) => {
        if (current && !removidas.includes(current)) return current;
        return remaining[0]?.id ?? null;
      });
    },
    [lists, mutate],
  );

  const updatePerfil = useCallback(
    async (diaria: number, valorHora: number) => {
      setPerfil({ diaria, valorHora });
      try {
        await savePerfil(userId, diaria, valorHora);
      } catch {
        /* preferência não bloqueia o lançamento */
      }
    },
    [userId],
  );

  /** Apaga tudo do usuário no banco (listas, lançamentos, perfil e login). */
  const deleteAccount = useCallback(async () => {
    await deleteMyAccount();
    setActiveListId(null);
    setEntries([]);
    setLists([]);
    setActiveListIdState(null);
    await supabase.auth.signOut();
  }, []);

  const activeList = useMemo(
    () => lists.find((l) => l.id === activeListId) ?? null,
    [lists, activeListId],
  );
  /** Só os caixas principais são unidades independentes. */
  const roots = useMemo(() => rootsOf(lists), [lists]);
  const activeEntries = useMemo(
    () => entries.filter((e) => e.listaId === activeListId),
    [entries, activeListId],
  );
  /**
   * Contabilidade inteira do caixa aberto: no caixa principal entram ele e os
   * envelopes; num envelope entra só ele. As pernas de distribuição saem
   * porque são movimentação interna (já aparecem no extrato de cada lista).
   * Serve para o total do caixa, que soma o caixa + os envelopes sem duplicar.
   */
  const familyEntries = useMemo(() => {
    if (!activeListId) return [];
    if (activeList?.parentId) return activeEntries;
    return familyEntriesOf(lists, entries, activeListId);
  }, [activeList, activeListId, activeEntries, entries, lists]);
  /** Mini caixas (envelopes) do caixa aberto agora. */
  const envelopes = useMemo(
    () => (activeListId ? lists.filter((l) => l.parentId === activeListId) : []),
    [lists, activeListId],
  );
  /**
   * Totais da interface: o caixa principal aparece CONSOLIDADO (ele + os
   * envelopes) e cada envelope mostra o próprio saldo. Como os totais do
   * caixa ignoram as pernas de distribuição, o mesmo valor nunca é contado
   * duas vezes.
   */
  const summaries: Record<string, Totals> = useMemo(
    () => totalsByRoot(lists, entries),
    [lists, entries],
  );

  return {
    lists,
    roots,
    entries,
    activeList,
    activeEntries,
    familyEntries,
    activeListId,
    envelopes,
    summaries,
    perfil,
    loading,
    error,
    migrationNeeded: error === LISTS_MIGRATION_HINT,
    refresh: () => scheduleRefresh(0),
    selectList,
    addEntry,
    editEntry,
    removeEntry,
    addList,
    editList,
    removeList,
    distribuir,
    devolver,
    otimizar,
    updatePerfil,
    deleteAccount,
  };
}

export type Caixa = ReturnType<typeof useCaixa>;
