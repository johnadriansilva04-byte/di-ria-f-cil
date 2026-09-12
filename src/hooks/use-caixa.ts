import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  adoptLegacyEntries,
  clearLegacyLocalLists,
  createList,
  deleteEntry,
  deleteList,
  deleteMyAccount,
  errorMessage,
  fetchEntries,
  fetchLists,
  fetchPerfil,
  getActiveListId,
  insertEntry,
  LISTS_MIGRATION_HINT,
  readLegacyLocalLists,
  renameList,
  savePerfil,
  setActiveListId,
  totalsByList,
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
          listaId: activeListId,
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
    async (name: string) => {
      const created = await mutate(() => createList(userId, name));
      setLists((prev) => [...prev, created]);
      setActiveListIdState(created.id);
      return created;
    },
    [userId, mutate],
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
      const remaining = lists.filter((l) => l.id !== id);
      await mutate(() => deleteList(id));
      setLists(remaining);
      setEntries((prev) => prev.filter((e) => e.listaId !== id));
      setActiveListIdState((current) => {
        if (current && current !== id) return current;
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

  const activeList = lists.find((l) => l.id === activeListId) ?? null;
  const activeEntries = useMemo(
    () => entries.filter((e) => e.listaId === activeListId),
    [entries, activeListId],
  );
  const summaries: Record<string, Totals> = useMemo(() => totalsByList(entries), [entries]);

  return {
    lists,
    entries,
    activeList,
    activeEntries,
    activeListId,
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
    updatePerfil,
    deleteAccount,
  };
}

export type Caixa = ReturnType<typeof useCaixa>;
