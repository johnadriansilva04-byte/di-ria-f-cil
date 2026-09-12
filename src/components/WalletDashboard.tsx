import { useEffect, useMemo, useState } from "react";
import { Check, FileText, Lock, Pencil, X } from "lucide-react";
import {
  filterByPeriod,
  monthlySeries,
  totalsOf,
  type Entry,
  type EntryPatch,
  type Period,
  type WalletList,
} from "@/lib/caixa";
import type { NewEntry } from "@/hooks/use-caixa";
import { EntryRow } from "./EntryRow";
import { FlowChart } from "./FlowChart";
import { StatementView } from "./StatementView";
import { TransactionForm } from "./TransactionForm";
import { WalletSummary } from "./WalletSummary";

interface WalletDashboardProps {
  list: WalletList;
  lists: WalletList[];
  entries: Entry[];
  loading: boolean;
  daily: string;
  hourRate: string;
  onRename: (name: string) => void;
  onCreate: (input: NewEntry) => Promise<Entry>;
  onEditEntry: (id: string, patch: EntryPatch) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onSavePerfil: (diaria: number, valorHora: number) => void;
  onLaunched: (entry: Entry) => void;
  onError: (msg: string | null) => void;
}

const RECENT_LIMIT = 6;

export function WalletDashboard({
  list,
  lists,
  entries,
  loading,
  daily,
  hourRate,
  onRename,
  onCreate,
  onEditEntry,
  onDeleteEntry,
  onSavePerfil,
  onLaunched,
  onError,
}: WalletDashboardProps) {
  // "Tudo" é o saldo real do caixa; os outros períodos são lentes de análise.
  const [period, setPeriod] = useState<Period>("tudo");
  const [showStatement, setShowStatement] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(list.name);

  useEffect(() => {
    setNameValue(list.name);
    setEditingName(false);
    setShowStatement(false);
  }, [list.id, list.name]);

  const periodEntries = useMemo(() => filterByPeriod(entries, period), [entries, period]);
  const totals = useMemo(() => totalsOf(periodEntries), [periodEntries]);
  const series = useMemo(() => monthlySeries(entries, 6), [entries]);
  const recent = periodEntries.slice(0, RECENT_LIMIT);

  const commitRename = () => {
    const next = nameValue.trim();
    if (!next || next === list.name) {
      setNameValue(list.name);
      setEditingName(false);
      return;
    }
    onRename(next);
    setEditingName(false);
  };

  if (showStatement) {
    return (
      <StatementView
        entries={entries}
        lists={lists}
        loading={loading}
        walletName={list.name}
        onSave={onEditEntry}
        onDelete={onDeleteEntry}
        onError={onError}
        onBack={() => setShowStatement(false)}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        {/* Cabeçalho da lista ativa */}
        <header className="mb-4 flex flex-wrap items-center gap-2">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") {
                    setNameValue(list.name);
                    setEditingName(false);
                  }
                }}
                className="rounded-lg border border-input bg-background px-3 py-1.5 font-[family-name:var(--font-display)] text-lg font-bold outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
              />
              <button
                type="button"
                onClick={commitRename}
                aria-label="Confirmar novo nome"
                className="rounded-md p-1.5 text-income transition-colors hover:bg-secondary"
              >
                <Check className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setNameValue(list.name);
                  setEditingName(false);
                }}
                aria-label="Cancelar renomear"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight sm:text-2xl">
                {list.name}
              </h1>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                title="Renomear lista"
                aria-label="Renomear lista"
                className="rounded-md p-2 text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Pencil className="size-4" />
              </button>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Lock className="size-3" />
                lançamentos só desta lista
              </span>
            </>
          )}
        </header>

        {loading ? (
          <div className="grid gap-3">
            <div className="h-36 animate-pulse rounded-2xl border border-border bg-card" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-20 animate-pulse rounded-xl border border-border bg-card" />
              <div className="h-20 animate-pulse rounded-xl border border-border bg-card" />
              <div className="h-20 animate-pulse rounded-xl border border-border bg-card" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6">
            <div className="flex flex-col gap-4">
              <WalletSummary
                listName={list.name}
                totals={totals}
                period={period}
                onPeriodChange={setPeriod}
              />
              <FlowChart data={series} listName={list.name} />
            </div>

            <div className="flex flex-col gap-4 lg:sticky lg:top-4">
              <TransactionForm
                listName={list.name}
                daily={daily}
                hourRate={hourRate}
                onCreate={onCreate}
                onSavePerfil={onSavePerfil}
                onLaunched={onLaunched}
                onError={onError}
              />

              <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
                  <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
                    Últimos lançamentos
                  </h2>
                  <span className="text-[11px] text-muted-foreground">
                    {periodEntries.length} no período
                  </span>
                </header>

                {recent.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum lançamento ainda.</p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      Use o formulário acima para lançar o primeiro valor de {list.name}.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {recent.map((entry) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        lists={lists}
                        onSave={onEditEntry}
                        onDelete={onDeleteEntry}
                        onError={onError}
                      />
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={() => setShowStatement(true)}
                  className="flex w-full items-center justify-center gap-2 border-t border-border bg-secondary/40 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <FileText className="size-4" />
                  Ver extrato completo
                </button>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
