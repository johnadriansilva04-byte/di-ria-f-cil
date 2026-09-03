import { supabase } from "@/integrations/supabase/client";

export type Kind = "entrada" | "saida";

export type Entry = {
  id: string;
  date: string;
  label: string;
  kind: Kind;
  amount: number;
  detail?: string | undefined;
  listaId?: string | null;
};

export type WalletList = {
  id: string;
  name: string;
  createdAt: number;
};

const LISTS_KEY = "caixa_wallet_lists";
const ACTIVE_LIST_KEY = "caixa_active_list";

// ── Currency & date helpers (preserved) ──────────────────────────────

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

// ── Wallet Lists (localStorage) ──────────────────────────────────────

export function fetchWalletLists(): WalletList[] {
  try {
    const raw = localStorage.getItem(LISTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WalletList[];
  } catch {
    return [];
  }
}

export function saveWalletLists(lists: WalletList[]): void {
  localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
}

export function createWalletList(name: string): WalletList {
  const lists = fetchWalletLists();
  const newList: WalletList = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: Date.now(),
  };
  lists.push(newList);
  saveWalletLists(lists);
  return newList;
}

export function renameWalletList(id: string, name: string): void {
  const lists = fetchWalletLists();
  const list = lists.find((l) => l.id === id);
  if (list) {
    list.name = name.trim();
    saveWalletLists(lists);
  }
}

export function deleteWalletList(id: string): void {
  const lists = fetchWalletLists().filter((l) => l.id !== id);
  saveWalletLists(lists);
}

export function getActiveListId(): string | null {
  return localStorage.getItem(ACTIVE_LIST_KEY);
}

export function setActiveListId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_LIST_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_LIST_KEY);
  }
}

// ── Entry helpers ────────────────────────────────────────────────────

type Row = {
  id: string;
  data: string;
  descricao: string;
  tipo: string;
  valor: number | string;
  detalhe: string | null;
  lista_id: string | null;
};

const toEntry = (r: Row): Entry => ({
  id: r.id,
  date: r.data,
  label: r.descricao,
  kind: r.tipo === "saida" ? "saida" : "entrada",
  amount: Number(r.valor),
  detail: r.detalhe ?? undefined,
  listaId: r.lista_id ?? null,
});

export async function fetchEntries(listaId?: string | null, isFirstList?: boolean): Promise<Entry[]> {
  let query = supabase
    .from("lancamentos")
    .select("id, data, descricao, tipo, valor, detalhe, lista_id")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });

  if (listaId === null) {
    // Fetch entries with no lista_id (legacy/default)
    query = query.is("lista_id", null);
  } else if (listaId !== undefined) {
    // Fetch entries for a specific list, also include legacy entries (lista_id IS NULL)
    // when this is the first/default list
    if (isFirstList) {
      query = query.or(`lista_id.eq.${listaId},lista_id.is.null`);
    } else {
      query = query.eq("lista_id", listaId);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => toEntry(r as Row));
}

export async function insertEntry(input: {
  userId: string;
  label: string;
  kind: Kind;
  amount: number;
  detail?: string | undefined;
  listaId?: string | null;
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
      lista_id: input.listaId ?? null,
    })
    .select("id, data, descricao, tipo, valor, detalhe, lista_id")
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
