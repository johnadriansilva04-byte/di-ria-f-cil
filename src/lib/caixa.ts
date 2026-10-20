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
  /** null = caixa raiz; id de outra lista = envelope (mini caixa) dela. */
  parentId: string | null;
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

/** Memoização simples de totais para evitar recálculos desnecessários */
export function memoizedTotalsOf(entries: Entry[], memoKey: string): Totals {
  return totalsOf(entries);
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

// ── Hierarquia caixa → envelopes ─────────────────────────────────────

/** Caixas principais: listas sem pai. Só elas são unidades independentes. */
export function rootsOf(lists: WalletList[]): WalletList[] {
  return lists.filter((l) => !l.parentId);
}

/**
 * Ids do caixa e de todos os envelopes abaixo dele (recursivo, sem repetir).
 * Serve para somar a contabilidade inteira do caixa principal.
 */
export function familyIds(lists: WalletList[], rootId: string): string[] {
  const byParent = new Map<string, string[]>();
  for (const l of lists) {
    if (!l.parentId) continue;
    const siblings = byParent.get(l.parentId);
    if (siblings) siblings.push(l.id);
    else byParent.set(l.parentId, [l.id]);
  }

  const ids: string[] = [];
  const seen = new Set<string>();
  const walk = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    ids.push(id);
    for (const child of byParent.get(id) ?? []) walk(child);
  };
  walk(rootId);
  return ids;
}

/**
 * Lançamentos da contabilidade inteira de um caixa (ele + envelopes), já sem
 * as pernas de distribuição — movimentação interna não é receita nem gasto.
 */
export function familyEntriesOf(lists: WalletList[], entries: Entry[], rootId: string): Entry[] {
  const ids = new Set(familyIds(lists, rootId));
  return entries.filter((e) => e.listaId && ids.has(e.listaId) && !isTransferencia(e));
}

/**
 * Totais por lista para a interface: o caixa principal mostra o CONSOLIDADO
 * (ele + envelopes) e cada envelope mostra o próprio saldo.
 *
 * Uma distribuição (saída no caixa + entrada no envelope) se anula, então o
 * mesmo valor nunca é contado duas vezes; por isso as receitas/despesas do
 * caixa ignoram as pernas de `transferência`.
 *
 * Percorre os lançamentos uma única vez: cada um entra no caixa principal dono
 * da lista (mapa `dono`), em vez de varrer tudo de novo a cada caixa.
 */
export function totalsByRoot(lists: WalletList[], entries: Entry[]): Record<string, Totals> {
  const map = totalsByList(entries);
  const roots = rootsOf(lists);
  if (roots.length === 0) return map;

  // lista → caixa principal dono dela (o envelope aponta para a raiz).
  const dono = new Map<string, string>();
  for (const root of roots) {
    for (const id of familyIds(lists, root.id)) dono.set(id, root.id);
  }

  const consolidado = new Map<string, Totals>();
  for (const root of roots) consolidado.set(root.id, emptyTotals());

  for (const e of entries) {
    if (!e.listaId || isTransferencia(e)) continue;
    const acc = consolidado.get(dono.get(e.listaId) ?? "");
    if (!acc) continue;
    if (e.kind === "entrada") acc.income += e.amount;
    else acc.expense += e.amount;
    acc.count += 1;
  }

  for (const root of roots) {
    const acc = consolidado.get(root.id);
    if (!acc) continue;
    acc.balance = acc.income - acc.expense;
    map[root.id] = acc;
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

// ── Composição (apresentação) ────────────────────────────────────────

/** Quanto cada envelope (ou o livre do caixa) pesa no total do caixa. */
export type Alocacao = {
  /** id da lista; `null` é a fatia “livre no caixa”. */
  id: string | null;
  nome: string;
  valor: number;
  /** Fração 0..1 do total (o total é a soma dos módulos). */
  fracao: number;
};

/**
 * Reparte o caixa (e seus envelopes) em fatias de apresentação.
 *
 * O todo é a soma dos módulos das partes: o livre do caixa + o saldo de cada
 * envelope. Assim a barra sempre fecha 100% e mostra para onde o dinheiro
 * foi, sem contar nada duas vezes (cada lançamento vive numa única lista).
 *
 * - `caixaLivre` é o saldo do caixa SEM os envelopes (só o que ainda está nele);
 * - valores zerados ficam de fora para a legenda não encher de ruído.
 */
export function alocacaoDoCaixa(
  envelopes: WalletList[],
  summaries: Record<string, Totals>,
  caixaLivre: number,
): Alocacao[] {
  const partes: Omit<Alocacao, "fracao">[] = [];
  if (caixaLivre !== 0) partes.push({ id: null, nome: "Livre no caixa", valor: caixaLivre });
  for (const env of envelopes) {
    const saldo = summaries[env.id]?.balance ?? 0;
    if (saldo !== 0) partes.push({ id: env.id, nome: env.name, valor: saldo });
  }
  const total = partes.reduce((sum, p) => sum + Math.abs(p.valor), 0);
  if (total === 0) return [];
  return partes.map((p) => ({ ...p, fracao: Math.abs(p.valor) / total }));
}

/** Ponto de série (sem rótulo) para o mini gráfico de tendência. */
export type TrendPoint = { key: string; value: number };

/**
 * Série de saldo acumulado mês a mês, para o sparkline dos cartões de caixa.
 * Parte de zero e vai somando o resultado (receitas − despesas) de cada mês.
 */
export function balanceTrend(entries: Entry[], months = 6): TrendPoint[] {
  const serie = monthlySeries(entries, months);
  let acumulado = 0;
  return serie.map((p) => {
    acumulado += p.income - p.expense;
    return { key: p.key, value: acumulado };
  });
}

// ── Erros ────────────────────────────────────────────────────────────

export const LISTS_MIGRATION_HINT =
  "O banco ainda não tem a tabela de listas. Rode o arquivo supabase/01_tables.sql no SQL Editor do Supabase.";

export const ENVELOPES_MIGRATION_HINT =
  "O banco ainda não tem os envelopes (parent_id). Rode o arquivo supabase/05_envelopes.sql no SQL Editor do Supabase.";

export const COMPACTAR_MIGRATION_HINT =
  "O banco ainda não tem a função de compactação. Rode o arquivo supabase/06_compactar.sql no SQL Editor do Supabase.";

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

/** A coluna parent_id ainda não existe no banco (05_envelopes.sql não rodou). */
export function isMissingParentColumn(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  if (!err) return false;
  const message = err.message ?? "";
  return (
    err.code === "42703" ||
    (message.includes("parent_id") &&
      (message.includes("does not exist") || message.includes("column")))
  );
}

export function errorMessage(error: unknown, fallback: string): string {
  if (isMissingListsTable(error)) return LISTS_MIGRATION_HINT;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("parent_id")) return ENVELOPES_MIGRATION_HINT;
  if (message.includes("compactar_lancamentos") || message.includes("function public.compactar"))
    return COMPACTAR_MIGRATION_HINT;
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return "Sem conexão com o servidor. Confira sua internet e tente de novo.";
  }
  return fallback;
}

// ── Listas (Supabase = fonte de verdade) ─────────────────────────────

type ListRow = { id: string; nome: string; created_at: string; parent_id?: string | null };

const toList = (r: ListRow): WalletList => ({
  id: r.id,
  name: r.nome,
  createdAt: new Date(r.created_at).getTime(),
  parentId: r.parent_id ?? null,
});

export async function fetchLists(userId: string): Promise<WalletList[]> {
  const query = () =>
    supabase
      .from("listas")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

  const { data, error } = await query();
  if (!error) return (data ?? []).map((r) => toList(r as ListRow));

  // A coluna parent_id pode não existir ainda (05_envelopes.sql não rodou).
  // Nesse caso a leitura continua: sem hierarquia, toda lista é caixa raiz.
  if (!isMissingParentColumn(error)) throw error;

  const { data: fallback, error: fallbackError } = await supabase
    .from("listas")
    .select("id, nome, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (fallbackError) throw fallbackError;
  return (fallback ?? []).map((r) => toList(r as ListRow));
}

export async function createList(
  userId: string,
  name: string,
  id?: string,
  parentId?: string | null,
): Promise<WalletList> {
  const payload: {
    user_id: string;
    nome: string;
    id?: string;
    parent_id?: string | null;
  } = { user_id: userId, nome: name.trim() };
  if (id) payload.id = id;
  if (parentId) payload.parent_id = parentId;
  const { data, error } = await supabase.from("listas").insert(payload).select("*").single();
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

// ── Transferências internas (caixa ↔ envelope) ───────────────────

/** Marca nas pernas de uma transferência, para separá-la de gasto de verdade. */
export const MARCA_TRANSFERENCIA = "transferência";

/** Transferência é movimentação interna: não conta como receita/gasto global. */
export const isTransferencia = (e: Entry) => (e.detail ?? "").includes(MARCA_TRANSFERENCIA);

export const semTransferencias = (entries: Entry[]) => entries.filter((e) => !isTransferencia(e));

export type DistribuicaoInput = {
  userId: string;
  deId: string;
  deNome: string;
  paraId: string;
  paraNome: string;
  amount: number;
};

/** Textos das duas pernas (rótulo + detalhe) e do estorno de emergência. */
type TextoTransferencia = {
  rotuloSaida: string;
  rotuloEntrada: string;
  detalheSaida: string;
  detalheEntrada: string;
  rotuloEstorno: string;
};

/**
 * As duas pernas de uma transferência interna: saída na origem e entrada no
 * destino. O Supabase não dá transação daqui, então se a perna de entrada
 * falhar uma devolução é lançada na origem para o dinheiro não sumir — e o
 * erro original é propagado para a tela avisar.
 */
async function duasPernas(
  input: DistribuicaoInput,
  texto: TextoTransferencia,
): Promise<{ saida: Entry; entrada: Entry }> {
  const saida = await insertEntry({
    userId: input.userId,
    listaId: input.deId,
    label: texto.rotuloSaida,
    kind: "saida",
    amount: input.amount,
    detail: texto.detalheSaida,
  });
  try {
    const entrada = await insertEntry({
      userId: input.userId,
      listaId: input.paraId,
      label: texto.rotuloEntrada,
      kind: "entrada",
      amount: input.amount,
      detail: texto.detalheEntrada,
    });
    return { saida, entrada };
  } catch (e) {
    try {
      await insertEntry({
        userId: input.userId,
        listaId: input.deId,
        label: texto.rotuloEstorno,
        kind: "entrada",
        amount: input.amount,
        detail: `${MARCA_TRANSFERENCIA} (cancelada)`,
      });
    } catch {
      /* segue e repara o erro original */
    }
    throw e;
  }
}

/** Manda valor do caixa para um envelope: sai do caixa e entra no envelope. */
export function distribuir(input: DistribuicaoInput): Promise<{ saida: Entry; entrada: Entry }> {
  return duasPernas(input, {
    rotuloSaida: `Distribuído para ${input.paraNome}`,
    rotuloEntrada: "Recebido do caixa",
    detalheSaida: `${MARCA_TRANSFERENCIA} de ${input.deNome}`,
    detalheEntrada: `${MARCA_TRANSFERENCIA} do caixa ${input.deNome}`,
    rotuloEstorno: `Devolução de ${input.paraNome}`,
  });
}

/**
 * Caminho inverso de `distribuir`: traz o valor de um envelope de volta para o
 * caixa. Sai do envelope e entra no caixa, com o mesmo cuidado de não perder
 * dinheiro se a segunda perna falhar.
 */
export function devolver(input: DistribuicaoInput): Promise<{ saida: Entry; entrada: Entry }> {
  return duasPernas(input, {
    rotuloSaida: `Devolvido para ${input.paraNome}`,
    rotuloEntrada: `Devolvido do envelope ${input.deNome}`,
    detalheSaida: `${MARCA_TRANSFERENCIA} para ${input.paraNome}`,
    detalheEntrada: `${MARCA_TRANSFERENCIA} do envelope ${input.deNome}`,
    rotuloEstorno: `Estorno de ${input.paraNome}`,
  });
}

// ── Compactação (enxugar lancamentos) ───────────────────────

/**
 * Compacta meses antigos no servidor: o mês inteiro vira no máximo 2 linhas
 * de resumo e o bruto é apagado (RPC `compactar_lancamentos`, um único request).
 * Devolve a quantidade de meses arquivados.
 */
export async function compactarLancamentos(dias: number): Promise<number> {
  const { data, error } = await supabase.rpc("compactar_lancamentos", { p_dias: dias });
  if (error) throw error;
  return Number(data ?? 0);
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
        "O banco ainda não tem a função de exclusão de conta. Rode supabase/04_functions.sql no SQL Editor do Supabase.",
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
