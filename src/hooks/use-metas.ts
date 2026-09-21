import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Meta {
  id: string;
  user_id: string;
  nome: string;
  valor_alvo: number;
  valor_atual: number;
  data_limite: string | null;
  concluida: boolean;
  created_at: string;
  updated_at: string;
}

export function useMetas(userId: string) {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetas();

    // Realtime subscription
    const channel = supabase
      .channel("metas_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "metas",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMetas((prev) => [...prev, payload.new as Meta]);
          } else if (payload.eventType === "UPDATE") {
            setMetas((prev) =>
              prev.map((m) => (m.id === payload.new.id ? (payload.new as Meta) : m))
            );
          } else if (payload.eventType === "DELETE") {
            setMetas((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadMetas = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("metas")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMetas(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar metas");
    } finally {
      setLoading(false);
    }
  };

  const addMeta = async (meta: Omit<Meta, "id" | "user_id" | "created_at" | "updated_at">) => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from("metas")
        .insert({
          ...meta,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      setMetas((prev) => [data as Meta, ...prev]);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar meta");
      throw e;
    }
  };

  const updateMeta = async (id: string, updates: Partial<Meta>) => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from("metas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setMetas((prev) => prev.map((m) => (m.id === id ? (data as Meta) : m)));
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar meta");
      throw e;
    }
  };

  const deleteMeta = async (id: string) => {
    try {
      setError(null);
      const { error } = await supabase.from("metas").delete().eq("id", id);

      if (error) throw error;
      setMetas((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir meta");
      throw e;
    }
  };

  const addToMeta = async (id: string, amount: number) => {
    const meta = metas.find((m) => m.id === id);
    if (!meta) return;

    const newAmount = Math.min(meta.valor_atual + amount, meta.valor_alvo);
    const isCompleted = newAmount >= meta.valor_alvo;

    await updateMeta(id, {
      valor_atual: newAmount,
      concluida: isCompleted,
    });
  };

  return {
    metas,
    loading,
    error,
    addMeta,
    updateMeta,
    deleteMeta,
    addToMeta,
    reload: loadMetas,
  };
}
