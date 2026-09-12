import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  adoptLegacyEntries,
  clearLegacyLocalLists,
  createList,
  deleteEntry,
  deleteList,
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
 * As mutações atualizam a tela na hora e o Supabase é a fonte de verdade.
 */
export function useCaixa(userId: string) {
  const [lists, setLists] = useState<WalletList[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [activeListId, setActiveListIdState] = useState<string | null>(() => getActiveListId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (!options?.silent) setLoading(true);
      try {
        const [loadedLists, loadedEntries, loadedPerfil] = await Promise.all([
          fetchLists(userId),
          fetchEntries(userId),
          fetchPerfil(userId).catch(() => null),
        ]);

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
        setError(errorMessage(e, "Não foi possível carregar seus dados. Tente novamente."));
      } finally {
        inFlight.current = false;
        setLoading(false);
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

  // Vivo entre aparelhos: qualquer lançamento novo recarrega a lista.
  useEffect(() => {
    const channel = supabase
      .channel(`caixa-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lancamentos", filter: `user_id=eq.${userId}` },
        () => {
          void load({ silent: true });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  // Ao voltar para o app, os números são revalidados.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const selectList = useCallback((id: string) => {
    setActiveListIdState(id);
  }, []);

  const addEntry = useCallback(
    async (input: NewEntry) => {
      if (!activeListId) throw new Error("Nenhuma lista selecionada.");
      const entry = await insertEntry({
        userId,
        listaId: activeListId,
        label: input.label,
        kind: input.kind,
        amount: input.amount,
        detail: input.detail,
        date: input.date,
      });
      setEntries((prev) => [entry, ...prev]);
      return entry;
    },
    [userId, activeListId],
  );

  const editEntry = useCallback(async (id: string, patch: EntryPatch) => {
    await updateEntry(id, patch);
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
  }, []);

  const removeEntry = useCallback(async (id: string) => {
    await deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addList = useCallback(
    async (name: string) => {
      const created = await createList(userId, name);
      setLists((prev) => [...prev, created]);
      setActiveListIdState(created.id);
      return created;
    },
    [userId],
  );

  const editList = useCallback(async (id: string, name: string) => {
    await renameList(id, name);
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)));
  }, []);

  const removeList = useCallback(
    async (id: string) => {
      const remaining = lists.filter((l) => l.id !== id);
      await deleteList(id);
      setLists(remaining);
      setEntries((prev) => prev.filter((e) => e.listaId !== id));
      setActiveListIdState((current) => {
        if (current && current !== id) return current;
        return remaining[0]?.id ?? null;
      });
    },
    [lists],
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
    refresh: () => load({ silent: true }),
    selectList,
    addEntry,
    editEntry,
    removeEntry,
    addList,
    editList,
    removeList,
    updatePerfil,
  };
}

export type Caixa = ReturnType<typeof useCaixa>;
