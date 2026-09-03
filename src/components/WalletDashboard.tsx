import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Pencil,
  Check,
  X,
  FileText,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
} from "lucide-react";
import type { WalletList, Entry } from "@/lib/caixa";
import {
  brl,
  fetchEntries,
  renameWalletList,
} from "@/lib/caixa";
import { TransactionForm } from "./TransactionForm";
import { StatementView } from "./StatementView";

interface WalletDashboardProps {
  list: WalletList;
  userId: string;
  perfil: { diaria: number; valorHora: number } | null;
  onError: (msg: string) => void;
  isFirstList?: boolean;
}

export function WalletDashboard({
  list,
  userId,
  perfil,
  onError,
  isFirstList,
}: WalletDashboardProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showStatement, setShowStatement] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(list.name);

  // Sync nameValue when list changes
  useEffect(() => {
    setNameValue(list.name);
    setEditingName(false);
  }, [list.id, list.name]);

  // Load entries for this list
  const loadEntries = useCallback(async () => {
    setLoaded(false);
    try {
      const data = await fetchEntries(list.id, isFirstList);
      setEntries(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      console.error("Erro ao carregar dados:", msg);
      onError("Erro ao carregar dados. Tente novamente.");
    } finally {
      setLoaded(true);
    }
  }, [list.id, onError]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  // Compute totals
  const totals = useMemo(() => {
    const inc = entries
      .filter((e) => e.kind === "entrada")
      .reduce((s, e) => s + e.amount, 0);
    const out = entries
      .filter((e) => e.kind === "saida")
      .reduce((s, e) => s + e.amount, 0);
    return { inc, out, saldo: inc - out };
  }, [entries]);

  // Handle new transaction
  const handleTransactionSuccess = (entry: Entry) => {
    setEntries((prev) => [entry, ...prev]);
  };

  // Handle delete
  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((x) => x.id !== id));
  };

  // Handle rename
  const handleRename = () => {
    if (!nameValue.trim() || nameValue.trim() === list.name) {
      setNameValue(list.name);
      setEditingName(false);
      return;
    }
    renameWalletList(list.id, nameValue);
    setEditingName(false);
  };

  // Daily / hourRate for the form
  const daily = perfil ? String(perfil.diaria) : "130";
  const hourRate = perfil ? String(perfil.valorHora) : "";

  // Statement view
  if (showStatement) {
    return (
      <StatementView
        entries={entries}
        loaded={loaded}
        onDelete={handleDeleteEntry}
        onDeleteError={onError}
        onBack={() => setShowStatement(false)}
        walletName={list.name}
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-6 py-6">
        {/* Wallet header */}
        <div className="mb-6 flex items-center gap-3">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") {
                    setNameValue(list.name);
                    setEditingName(false);
                  }
                }}
                className="rounded-lg border border-input bg-background px-3 py-1.5 text-lg font-bold outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
              />
              <button
                type="button"
                onClick={handleRename}
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
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
                {list.name}
              </h1>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="rounded-md p-2 text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
                title="Renomear caixa"
                aria-label="Renomear caixa"
              >
                <Pencil className="size-4" />
              </button>
            </>
          )}
        </div>

        {/* Summary cards */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          {/* Saldo */}
          <div className="col-span-3 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                <Wallet className="size-3.5 text-primary" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Saldo
              </p>
            </div>
            <p
              className={`mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums ${
                totals.saldo < 0 ? "text-expense" : "text-foreground"
              }`}
            >
              {brl(totals.saldo)}
            </p>
          </div>
        </div>

        {/* Secondary indicators */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-income" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Recebido
              </p>
            </div>
            <p className="mt-1.5 font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-income">
              {brl(totals.inc)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="size-3.5 text-expense" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Gastos
              </p>
            </div>
            <p className="mt-1.5 font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-expense">
              {brl(totals.out)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="size-3.5 text-primary" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Resultado
              </p>
            </div>
            <p
              className={`mt-1.5 font-[family-name:var(--font-display)] text-base font-bold tabular-nums ${
                totals.saldo < 0 ? "text-expense" : "text-foreground"
              }`}
            >
              {brl(totals.saldo)}
            </p>
          </div>
        </div>

        {/* Transaction form */}
        <TransactionForm
          userId={userId}
          daily={daily}
          hourRate={hourRate}
          onSuccess={handleTransactionSuccess}
          onError={onError}
        />

        {/* View statement button */}
        <button
          type="button"
          onClick={() => setShowStatement(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <FileText className="size-4" />
          Ver extrato
        </button>
      </div>
    </div>
  );
}
