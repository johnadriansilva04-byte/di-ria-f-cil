import { supabase } from "@/integrations/supabase/client";

/**
 * Camada de dados do CAIXA (lançamento manual).
 *
 * Regra de ouro: TODO lançamento nasce com o `lista_id` da lista (caixa)
 * ativa e TODA leitura do app é filtrada por ele. A separação entre as
 * listas acontece no banco, não na interface.
 *
 * Fonte de verdade: Supabase.
 *   public.listas      -> cada caixa (Meu Trabalho, Pizzaria, ...)
 *   public.lancamentos -> entradas e saídas, cada uma presa a uma lista
 */

export type Kind = "entrada" | "saida";

export type Entry = {
  id: string;
  date: string;
  label: string;
  kind: Kind;
  amount: number;
  detail?: string | undefined;
  listaId: string | null;
};

export type WalletList = {
  id: string;
  name: string;
  createdAt: number;
};

export type Totals = {
  income: number;
  expense: number;
  balance: number;
  count: number;
};

export type Period = "mes" | "7d" | "30d" | "ano" | "tudo";

export type EntryPatch = {
  label?: string;
  kind?: Kind;
  amount?: number;
  date?: string;
  detail?: string | null;
  listaId?: string;
};

const ACTIVE_LIST_KEY = "caixa_active_list";
const LEGACY_LISTS_KEY = "caixa_wallet_lists";

// ── Formatação / utilidades (preservadas) ────────────────────────────

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export const brlCompact = (v: number) =>
  Math.abs(v) >= 1000
    ? v.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      })
    : brl(v);

/** Data local no formato YYYY-MM-DD (evita o bug de fuso do toISOString). */
export const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const today = () => toIsoDate(new Date());

export const addDays = (isoDate: string, days: number) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return toIsoDate(new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
};

export const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** Rótulo amigável: "Hoje", "Ontem" ou "12/09". */
export const friendlyDate = (iso: string) => {
  const t = today();
  if (iso === t) return "Hoje";
  if (iso === addDays(t, -1)) return "Ontem";
  return formatDate(iso);
};

export const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  const txt = dt.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
  return txt.replace(/\./g, "");
};

/** Aceita "130", "130,50" e "130.50" sem transformar centavos em milhar. */
export const toNumber = (v: string) => {
  const raw = String(v)
    .trim()
    .replace(/[R$\s]/g, "");
  if (!raw) return 0;
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  if (hasComma && hasDot) return parseFloat(raw.replace(/\./g, "").replace(",", ".")) || 0;
  if (hasComma) return parseFloat(raw.replace(",", ".")) || 0;
  if (hasDot) {
    const parts = raw.split(".");
    const last = parts[parts.length - 1] ?? "";
    if (parts.length > 2 || last.length === 3) return parseFloat(raw.replace(/\./g, "")) || 0;
    return parseFloat(raw) || 0;
  }
  return parseFloat(raw) || 0;
};

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

// ── Períodos ─────────────────────────────────────────────────────────

export const PERIODS: { id: Period; label: string }[] = [
  { id: "tudo", label: "Tudo" },
  { id: "mes", label: "Este mês" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "ano", label: "Este ano" },
];

export function periodStart(period: Period): string | null {
  if (period === "tudo") return null;
  const now = new Date();
  if (period === "mes") return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  if (period === "ano") return toIsoDate(new Date(now.getFullYear(), 0, 1));
  return addDays(today(), period === "7d" ? -6 : -29);
}

export function inPeriod(date: string, period: Period): boolean {
  const start = periodStart(period);
  if (!start) return true;
  return date >= start;
}

export function filterByPeriod(entries: Entry[], period: Period): Entry[] {
  const start = periodStart(period);
  if (!start) return entries;
  return entries.filter((e) => e.date >= start);
}

// ── Cálculos ─────────────────────────────────────────────────────────

export const emptyTotals = (): Totals => ({ income: 0, expense: 0, balance: 0, count: 0 });

export function totalsOf(entries: Entry[]): Totals {
  const t = emptyTotals();
  for (const e of entries) {
    if (e.kind === "entrada") t.income += e.amount;
    else t.expense += e.amount;
    t.count += 1;
  }
  t.balance = t.income - t.expense;
  return t;
}

/** Saldo/contagem por lista, calculado a partir dos lançamentos reais. */
export function totalsByList(entries: Entry[]): Record<string, Totals> {
  const map: Record<string, Totals> = {};
  for (const e of entries) {
    const key = e.listaId ?? "";
    const current = map[key] ?? emptyTotals();
    if (e.kind === "entrada") current.income += e.amount;
    else current.expense += e.amount;
    current.count += 1;
    current.balance = current.income - current.expense;
    map[key] = current;
  }
  return map;
}

export type MonthPoint = { key: string; label: string; income: number; expense: number };

/** Série dos últimos meses da lista atual (para o gráfico). */
export function monthlySeries(entries: Entry[], months = 6): MonthPoint[] {
  const points: MonthPoint[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const raw = d.toLocaleDateString("pt-BR", { month: "short" }).replace(/\./g, "");
    points.push({ key, label: raw.charAt(0).toUpperCase() + raw.slice(1), income: 0, expense: 0 });
  }
  const index = new Map(points.map((p) => [p.key, p]));
  for (const e of entries) {
    const point = index.get(e.date.slice(0, 7));
    if (!point) continue;
    if (e.kind === "entrada") point.income += e.amount;
    else point.expense += e.amount;
  }
  return points;
}

// ── Erros ────────────────────────────────────────────────────────────

export const LISTS_MIGRATION_HINT =
  "O banco ainda não tem a tabela de listas. Rode o arquivo supabase/setup_completo.sql no SQL Editor do Supabase.";

export function isMissingListsTable(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  if (!err) return false;
  const message = err.message ?? "";
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    message.includes("public.listas") ||
    message.includes('relation "listas"')
  );
}

export function errorMessage(error: unknown, fallback: string): string {
  if (isMissingListsTable(error)) return LISTS_MIGRATION_HINT;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return "Sem conexão com o servidor. Confira sua internet e tente de novo.";
  }
  return fallback;
}

// ── Listas (Supabase = fonte de verdade) ─────────────────────────────

type ListRow = { id: string; nome: string; created_at: string };

const toList = (r: ListRow): WalletList => ({
  id: r.id,
  name: r.nome,
  createdAt: new Date(r.created_at).getTime(),
});

export async function fetchLists(userId: string): Promise<WalletList[]> {
  const { data, error } = await supabase
    .from("listas")
    .select("id, nome, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => toList(r as ListRow));
}

export async function createList(userId: string, name: string, id?: string): Promise<WalletList> {
  const { data, error } = await supabase
    .from("listas")
    .insert(
      id ? { id, user_id: userId, nome: name.trim() } : { user_id: userId, nome: name.trim() },
    )
    .select("id, nome, created_at")
    .single();
  if (error) throw error;
  return toList(data as ListRow);
}

/** Listas que ficaram só no navegador (versão antiga do app). */
export function readLegacyLocalLists(): WalletList[] {
  try {
    const raw = localStorage.getItem(LEGACY_LISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WalletList[];
    return Array.isArray(parsed)
      ? parsed.filter((l) => l && typeof l.id === "string" && typeof l.name === "string")
      : [];
  } catch {
    return [];
  }
}

export function clearLegacyLocalLists(): void {
  try {
    localStorage.removeItem(LEGACY_LISTS_KEY);
  } catch {
    /* storage bloqueado */
  }
}

const NOTHING_CHANGED =
  "O banco não alterou nada: o registro não existe mais ou não pertence à sua conta.";

export async function renameList(id: string, name: string): Promise<void> {
  const { data, error } = await supabase
    .from("listas")
    .update({ nome: name.trim() })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NOTHING_CHANGED);
}

/** Exclui a lista junto com todos os lançamentos que pertencem a ela. */
export async function deleteList(id: string): Promise<void> {
  const { error: entriesError } = await supabase
    .from("lancamentos")
    .delete()
    .eq("lista_id", id)
    .select("id");
  if (entriesError) throw entriesError;

  const { data, error } = await supabase.from("listas").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NOTHING_CHANGED);
}

/** Lançamentos antigos (sem lista) passam a pertencer à lista informada. */
export async function adoptLegacyEntries(userId: string, listaId: string): Promise<void> {
  const { error } = await supabase
    .from("lancamentos")
    .update({ lista_id: listaId })
    .eq("user_id", userId)
    .is("lista_id", null);
  if (error) throw error;
}

// ── Lançamentos ──────────────────────────────────────────────────────

type EntryRow = {
  id: string;
  data: string;
  descricao: string;
  tipo: string;
  valor: number | string;
  detalhe: string | null;
  lista_id: string | null;
};

const ENTRY_COLUMNS = "id, data, descricao, tipo, valor, detalhe, lista_id";

const toEntry = (r: EntryRow): Entry => ({
  id: r.id,
  date: r.data,
  label: r.descricao,
  kind: r.tipo === "saida" ? "saida" : "entrada",
  amount: Number(r.valor),
  detail: r.detalhe ?? undefined,
  listaId: r.lista_id ?? null,
});

/** Todos os lançamentos do usuário (a separação por lista é feita pelo lista_id). */
export async function fetchEntries(userId: string): Promise<Entry[]> {
  const { data, error } = await supabase
    .from("lancamentos")
    .select(ENTRY_COLUMNS)
    .eq("user_id", userId)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => toEntry(r as EntryRow));
}

export async function insertEntry(input: {
  userId: string;
  listaId: string;
  label: string;
  kind: Kind;
  amount: number;
  detail?: string | undefined;
  date?: string | undefined;
}): Promise<Entry> {
  const { data, error } = await supabase
    .from("lancamentos")
    .insert({
      user_id: input.userId,
      lista_id: input.listaId,
      descricao: input.label,
      tipo: input.kind,
      valor: input.amount,
      detalhe: input.detail ?? null,
      data: input.date ?? today(),
    })
    .select(ENTRY_COLUMNS)
    .single();
  if (error) throw error;
  return toEntry(data as EntryRow);
}

export async function updateEntry(id: string, patch: EntryPatch): Promise<void> {
  const payload: {
    descricao?: string;
    tipo?: Kind;
    valor?: number;
    data?: string;
    detalhe?: string | null;
    lista_id?: string;
  } = {};
  if (patch.label !== undefined) payload.descricao = patch.label;
  if (patch.kind !== undefined) payload.tipo = patch.kind;
  if (patch.amount !== undefined) payload.valor = patch.amount;
  if (patch.date !== undefined) payload.data = patch.date;
  if (patch.detail !== undefined) payload.detalhe = patch.detail;
  if (patch.listaId !== undefined) payload.lista_id = patch.listaId;

  const { data, error } = await supabase
    .from("lancamentos")
    .update(payload)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NOTHING_CHANGED);
}

/**
 * Apaga do banco e confirma que a linha saiu de verdade.
 * Sem o `.select()`, o Supabase não avisa quando o delete não pegou nada.
 */
export async function deleteEntry(id: string): Promise<void> {
  const { data, error } = await supabase.from("lancamentos").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NOTHING_CHANGED);
}

// ── Conta do usuário ─────────────────────────────────────────────────

/**
 * Exclui a conta do usuário no banco (listas, lançamentos, perfil e login).
 * A exclusão roda numa função do Supabase que só apaga o usuário autenticado.
 */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc("excluir_minha_conta");
  if (error) {
    if (
      error.code === "PGRST202" ||
      error.code === "404" ||
      error.message.includes("excluir_minha_conta")
    ) {
      throw new Error(
        "O banco ainda não tem a função de exclusão de conta. Rode supabase/setup_completo.sql no SQL Editor do Supabase.",
      );
    }
    throw error;
  }
}

// ── Perfil (diária / valor da hora) ──────────────────────────────────

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

// ── Preferência de navegação (não é dado financeiro) ─────────────────

export function getActiveListId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_LIST_KEY);
  } catch {
    return null;
  }
}

export function setActiveListId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_LIST_KEY, id);
    else localStorage.removeItem(ACTIVE_LIST_KEY);
  } catch {
    /* modo privado / storage bloqueado */
  }
}
