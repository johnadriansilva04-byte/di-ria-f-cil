import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import {
  brl,
  dayLabel,
  friendlyDate,
  totalsOf,
  type Entry,
  type EntryPatch,
  type Kind,
  type WalletList,
} from "@/lib/caixa";
import { cn } from "@/lib/utils";
import { EntryRow } from "./EntryRow";

interface StatementViewProps {
  entries: Entry[];
  lists: WalletList[];
  loading: boolean;
  walletName: string;
  onSave: (id: string, patch: EntryPatch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onError: (msg: string | null) => void;
  onBack: () => void;
}

type Filter = "todos" | Kind;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "todos", label: "Tudo" },
  { id: "entrada", label: "Entradas" },
  { id: "saida", label: "Saídas" },
];

export function StatementView({
  entries,
  lists,
  loading,
  walletName,
  onSave,
  onDelete,
  onError,
  onBack,
}: StatementViewProps) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter !== "todos" && e.kind !== filter) return false;
      if (!term) return true;
      return e.label.toLowerCase().includes(term) || (e.detail ?? "").toLowerCase().includes(term);
    });
  }, [entries, filter, query]);

  const totals = useMemo(() => totalsOf(filtered), [filtered]);

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of filtered) {
      const bucket = map.get(entry.date);
      if (bucket) bucket.push(entry);
      else map.set(entry.date, [entry]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </button>
          <div className="h-5 w-px bg-border" />
          <h2 className="min-w-0 truncate font-[family-name:var(--font-display)] text-base font-semibold">
            Extrato — {walletName}
          </h2>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {filtered.length} de {entries.length}
          </span>
        </div>

        <div className="flex flex-col gap-2 px-4 pb-3 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30 sm:max-w-xs sm:flex-1">
            <Search className="size-4 shrink-0 text-muted-foreground/50" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar descrição…"
              className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  filter === f.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : groups.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {entries.length === 0
                ? "Nenhum lançamento ainda."
                : "Nada encontrado com esse filtro."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {entries.length === 0
                ? `Registre recebimentos ou gastos para ver o extrato de ${walletName}.`
                : "Tente outra busca ou volte para “Tudo”."}
            </p>
          </div>
        ) : (
          groups.map(([date, dayEntries]) => {
            const day = totalsOf(dayEntries);
            return (
              <section key={date}>
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:px-6">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {friendlyDate(date)} <span className="font-normal">· {dayLabel(date)}</span>
                  </p>
                  <p
                    className={cn(
                      "font-[family-name:var(--font-display)] text-xs font-bold tabular-nums",
                      day.balance < 0 ? "text-expense" : "text-income",
                    )}
                  >
                    {day.balance >= 0 ? "+" : "−"} {brl(Math.abs(day.balance))}
                  </p>
                </div>
                <ul className="divide-y divide-border">
                  {dayEntries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      lists={lists}
                      onSave={onSave}
                      onDelete={onDelete}
                      onError={onError}
                    />
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>

      <footer className="grid grid-cols-3 gap-3 border-t border-border bg-card px-4 py-3 sm:px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Recebido
          </p>
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-income">
            {brl(totals.income)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Gasto
          </p>
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-expense">
            {brl(totals.expense)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Saldo
          </p>
          <p
            className={cn(
              "font-[family-name:var(--font-display)] text-sm font-bold tabular-nums",
              totals.balance < 0 ? "text-expense" : "text-foreground",
            )}
          >
            {brl(totals.balance)}
          </p>
        </div>
      </footer>
    </div>
  );
}
