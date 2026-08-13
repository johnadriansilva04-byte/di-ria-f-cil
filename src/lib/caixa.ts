import { supabase } from "@/integrations/supabase/client";

export type Kind = "entrada" | "saida";

export type Entry = {
  id: string;
  date: string;
  label: string;
  kind: Kind;
  amount: number;
  detail?: string | undefined;
};

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export const today = () => new Date().toISOString().slice(0, 10);

export const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const toNumber = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Só dígitos do telefone (ex: 11987654321) */
export const onlyDigits = (v: string) => v.replace(/\D/g, "");

/** Telefone virou identificador interno de login (sem SMS, sem e-mail). */
export const phoneToEmail = (phone: string) => `t${onlyDigits(phone)}@caixadodia.app`;

export const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

type Row = {
  id: string;
  data: string;
  descricao: string;
  tipo: string;
  valor: number | string;
  detalhe: string | null;
};

const toEntry = (r: Row): Entry => ({
  id: r.id,
  date: r.data,
  label: r.descricao,
  kind: r.tipo === "saida" ? "saida" : "entrada",
  amount: Number(r.valor),
  detail: r.detalhe ?? undefined,
});

export async function fetchEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from("lancamentos")
    .select("id, data, descricao, tipo, valor, detalhe")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => toEntry(r as Row));
}

export async function insertEntry(input: {
  userId: string;
  label: string;
  kind: Kind;
  amount: number;
  detail?: string | undefined;
}): Promise<Entry> {
  const { data, error } = await supabase
    .from("lancamentos")
    .insert({
      user_id: input.userId,
      descricao: input.label,
      tipo: input.kind,
      valor: input.amount,
      detalhe: input.detail ?? null,
      data: today(),
    })
    .select("id, data, descricao, tipo, valor, detalhe")
    .single();
  if (error) throw error;
  return toEntry(data as Row);
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from("lancamentos").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchPerfil(userId: string) {
  const { data, error } = await supabase
    .from("perfis")
    .select("diaria, valor_hora")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? { diaria: Number(data.diaria), valorHora: Number(data.valor_hora) } : null;
}

export async function savePerfil(userId: string, diaria: number, valorHora: number) {
  const { error } = await supabase
    .from("perfis")
    .upsert({ id: userId, diaria, valor_hora: valorHora });
  if (error) throw error;
}