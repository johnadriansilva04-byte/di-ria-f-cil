import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { brl, brlCompact, errorMessage, type Totals, type WalletList } from "@/lib/caixa";
import { BrandLockup } from "@/components/Brand";
import { cn } from "@/lib/utils";

interface WalletSidebarProps {
  lists: WalletList[];
  activeListId: string | null;
  homeActive?: boolean;
  summaries: Record<string, Totals>;
  onGoHome?: () => void;
  onSelectList: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  telefone?: string;
  onSignOut: () => void;
  onDeleteAccount: () => Promise<void>;
  /** Compacta meses antigos no servidor; devolve quantos meses foram arquivados. */
  onOtimizar: (dias: number) => Promise<number>;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const inlineInput =
  "min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/30";

/** "1 lançamento" / "3 lançamentos" — texto amontoado com (s) quebra a leitura. */
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function WalletSidebar({
  lists,
  activeListId,
  homeActive = false,
  summaries,
  onGoHome,
  onSelectList,
  onCreate,
  onRename,
  onDelete,
  telefone,
  onSignOut,
  onDeleteAccount,
  onOtimizar,
  collapsed = false,
  onToggleCollapse,
}: WalletSidebarProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmAccount, setConfirmAccount] = useState(false);
  const [confirmOtimizar, setConfirmOtimizar] = useState(false);
  const [otimizando, setOtimizando] = useState(false);
  const [erroOtimizar, setErroOtimizar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Expansao explicita do usuario; sem toggle, o padrao e derivado (abre o
  // caixa que contem a lista ativa) — assim nao depende de efeito/re-render.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) newInputRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  // Caixas raiz; os envelopes ficam aninhados embaixo do caixa pai.
  const raizes = lists.filter((l) => !l.parentId);
  const filhasDe = (id: string) => lists.filter((l) => l.parentId === id);
  // O saldo do caixa raiz já é o CONSOLIDADO (caixa + envelopes), então o
  // total geral soma só as raízes — somar os envelopes aqui contaria duas vezes.
  const totalGeral = raizes.reduce((acc, list) => acc + (summaries[list.id]?.balance ?? 0), 0);

  const abertoDe = (id: string, contemAtiva: boolean) => toggled[id] ?? contemAtiva;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError("Não foi possível concluir. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    void run(async () => {
      await onCreate(name);
      setNewName("");
      setCreating(false);
    });
  };

  const handleRename = (id: string) => {
    const name = editName.trim();
    if (!name) return;
    void run(async () => {
      await onRename(id, name);
      setEditingId(null);
      setEditName("");
    });
  };

  const handleDelete = (id: string) => {
    void run(async () => {
      await onDelete(id);
      setConfirmDeleteId(null);
    });
  };

  /** Limpeza: soma os meses antigos em resumo e apaga o bruto (irreversível). */
  const otimizar = (dias: number) => {
    setErroOtimizar(null);
    setOtimizando(true);
    void onOtimizar(dias)
      .then((meses) => {
        setConfirmOtimizar(false);
        toast.success(
          meses > 0
            ? `${meses} ${meses === 1 ? "mês arquivado" : "meses arquivados"}`
            : "Nada antigo para arquivar ainda",
          { description: "O resultado ficou salvo; os lançamentos brutos saíram da tabela." },
        );
      })
      .catch((e: unknown) => setErroOtimizar(errorMessage(e, "Não foi possível otimizar agora.")))
      .finally(() => setOtimizando(false));
  };

  if (collapsed) {
    return (
      <div className="flex h-full w-14 flex-col items-center border-r border-border bg-sidebar py-4">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expandir menu"
          className="mb-4 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex flex-1 flex-col items-center gap-1.5 overflow-y-auto">
          <button
            type="button"
            onClick={onGoHome}
            title="Visão geral"
            aria-label="Visão geral"
            aria-pressed={homeActive}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
              homeActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            )}
          >
            <Home className="size-5" />
          </button>
          {raizes.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => onSelectList(list.id)}
              title={list.name}
              aria-label={list.name}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                activeListId === list.id
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              {list.name.charAt(0).toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            onToggleCollapse?.();
          }}
          aria-label="Nova lista"
          className="mt-2 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-primary"
        >
          <Plus className="size-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-72 flex-col border-r border-border bg-sidebar lg:w-64">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
        <BrandLockup
          size="sm"
          markClassName="size-8 rounded-xl"
          subtitle="controle manual"
          className="text-sidebar-foreground"
        />
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Fechar menu"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground lg:hidden"
        >
          <Menu className="size-4" />
        </button>
      </div>

      {/* Listas */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <button
          type="button"
          onClick={onGoHome}
          aria-pressed={homeActive}
          className={cn(
            "mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors",
            homeActive
              ? "bg-sidebar-primary/15 text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
          )}
        >
          <Home className="size-4 shrink-0" />
          <span className={cn("truncate text-sm", homeActive ? "font-semibold" : "font-medium")}>
            Visão geral
          </span>
        </button>
        <p className="mb-2 mt-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Minhas listas
        </p>
        <ul className="space-y-1">
          {raizes.map((list) => {
            const summary = summaries[list.id];
            const filhas = filhasDe(list.id);
            const ativoNaFamilia =
              activeListId === list.id || filhas.some((f) => f.id === activeListId);
            const aberto = abertoDe(list.id, ativoNaFamilia);
            return (
              <li key={list.id}>
                {editingId === list.id ? (
                  <div className="flex items-center gap-1 px-1">
                    <input
                      ref={editInputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(list.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className={inlineInput}
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(list.id)}
                      aria-label="Confirmar nome"
                      className="shrink-0 rounded p-1 text-income transition-colors hover:bg-sidebar-accent"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancelar renomear"
                      className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : confirmDeleteId === list.id ? (
                  <div className="rounded-lg bg-destructive/10 px-3 py-2">
                    <p className="text-xs text-destructive">
                      Excluir “{list.name}” e{" "}
                      {plural(summary?.count ?? 0, "lançamento", "lançamentos")}?
                    </p>
                    {filhas.length > 0 ? (
                      <p className="mt-1 text-[11px] font-semibold text-destructive">
                        Apaga também {plural(filhas.length, "sublista", "sublistas")}:{" "}
                        {filhas.map((f) => f.name).join(", ")}
                      </p>
                    ) : null}
                    <div className="mt-1.5 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(list.id)}
                        disabled={busy}
                        className="rounded bg-destructive px-2 py-1 text-[11px] font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
                      >
                        Excluir
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "group flex items-center rounded-lg transition-colors",
                      ativoNaFamilia ? "bg-sidebar-primary/15" : "hover:bg-sidebar-accent",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectList(list.id)}
                      className={cn(
                        "min-w-0 flex-1 rounded-lg px-3 py-2 text-left transition-colors",
                        activeListId === list.id
                          ? "text-sidebar-primary"
                          : "text-sidebar-foreground/75 hover:text-sidebar-foreground",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
                            activeListId === list.id ? "font-semibold" : "font-medium",
                          )}
                        >
                          {list.name}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 font-[family-name:var(--font-display)] text-xs font-bold tabular-nums",
                            !summary || summary.count === 0
                              ? "text-muted-foreground/40"
                              : summary.balance < 0
                                ? "text-expense"
                                : "text-income",
                          )}
                        >
                          {brlCompact(summary?.balance ?? 0)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground/50">
                        {plural(summary?.count ?? 0, "lançamento", "lançamentos")}
                      </span>
                    </button>
                    <div className="ml-0.5 flex shrink-0 items-center gap-0.5 pr-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(list.id);
                          setEditName(list.name);
                        }}
                        aria-label={`Renomear ${list.name}`}
                        className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-foreground lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(list.id)}
                        aria-label={`Excluir ${list.name}`}
                        className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Sublistas (envelopes) do caixa */}
                {filhas.length > 0 ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setToggled((prev) => ({ ...prev, [list.id]: !aberto }))}
                      aria-expanded={aberto}
                      aria-label={aberto ? `Recolher ${list.name}` : `Expandir ${list.name}`}
                      className="ml-1 mt-0.5 flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    >
                      {aberto ? (
                        <ChevronDown className="size-3" />
                      ) : (
                        <ChevronRight className="size-3" />
                      )}
                      {plural(filhas.length, "sublista", "sublistas")}
                    </button>
                    {aberto ? (
                      <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
                        {filhas.map((filha) => {
                          const fsummary = summaries[filha.id];
                          return (
                            <li key={filha.id}>
                              {editingId === filha.id ? (
                                <div className="flex items-center gap-1 px-1">
                                  <input
                                    ref={editInputRef}
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleRename(filha.id);
                                      if (e.key === "Escape") setEditingId(null);
                                    }}
                                    className={inlineInput}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRename(filha.id)}
                                    aria-label="Confirmar nome"
                                    className="shrink-0 rounded p-1 text-income transition-colors hover:bg-sidebar-accent"
                                  >
                                    <Check className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    aria-label="Cancelar renomear"
                                    className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                              ) : confirmDeleteId === filha.id ? (
                                <div className="rounded-lg bg-destructive/10 px-3 py-2">
                                  <p className="text-xs text-destructive">
                                    Excluir “{filha.name}” e{" "}
                                    {plural(fsummary?.count ?? 0, "lançamento", "lançamentos")}?
                                  </p>
                                  <div className="mt-1.5 flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(filha.id)}
                                      disabled={busy}
                                      className="rounded bg-destructive px-2 py-1 text-[11px] font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
                                    >
                                      Excluir
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="rounded px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className={cn(
                                    "group flex items-center rounded-md transition-colors",
                                    activeListId === filha.id
                                      ? "bg-sidebar-primary/15"
                                      : "hover:bg-sidebar-accent",
                                  )}
                                >
                                  <button
                                    type="button"
                                    onClick={() => onSelectList(filha.id)}
                                    aria-label={`Abrir ${filha.name}`}
                                    className={cn(
                                      "min-w-0 flex-1 rounded-md px-2 py-1.5 text-left transition-colors",
                                      activeListId === filha.id
                                        ? "text-sidebar-primary"
                                        : "text-sidebar-foreground/65 hover:text-sidebar-foreground",
                                    )}
                                  >
                                    <span className="flex items-center justify-between gap-2">
                                      <span
                                        className={cn(
                                          "truncate text-[13px]",
                                          activeListId === filha.id
                                            ? "font-semibold"
                                            : "font-medium",
                                        )}
                                      >
                                        {filha.name}
                                      </span>
                                      <span
                                        className={cn(
                                          "shrink-0 font-[family-name:var(--font-display)] text-[11px] font-bold tabular-nums",
                                          !fsummary || fsummary.count === 0
                                            ? "text-muted-foreground/40"
                                            : fsummary.balance < 0
                                              ? "text-expense"
                                              : "text-income",
                                        )}
                                      >
                                        {brlCompact(fsummary?.balance ?? 0)}
                                      </span>
                                    </span>
                                    <span className="mt-0.5 block text-[10px] text-muted-foreground/50">
                                      {plural(fsummary?.count ?? 0, "lançamento", "lançamentos")}
                                    </span>
                                  </button>
                                  <div className="ml-0.5 flex shrink-0 items-center gap-0.5 pr-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingId(filha.id);
                                        setEditName(filha.name);
                                      }}
                                      aria-label={`Renomear ${filha.name}`}
                                      className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-foreground lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                                    >
                                      <Pencil className="size-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(filha.id)}
                                      aria-label={`Excluir ${filha.name}`}
                                      className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                                    >
                                      <Trash2 className="size-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        {creating ? (
          <div className="mt-2 flex items-center gap-1 px-1">
            <input
              ref={newInputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewName("");
                }
              }}
              placeholder="Nome da lista"
              className={inlineInput}
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={busy}
              aria-label="Criar lista"
              className="shrink-0 rounded p-1 text-sidebar-primary transition-colors hover:bg-sidebar-accent disabled:opacity-60"
            >
              <Check className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setNewName("");
              }}
              aria-label="Cancelar nova lista"
              className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-primary"
          >
            <Plus className="size-4" />
            Nova lista
          </button>
        )}

        {error ? <p className="mt-2 px-2 text-[11px] text-destructive">{error}</p> : null}
      </div>

      {/* Total geral */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-widest",
            totalGeral < 0 ? "text-expense" : "text-muted-foreground/60",
          )}
        >
          {totalGeral < 0 ? "Dívida total" : "Total geral"}
        </p>
        <p
          className={cn(
            "mt-0.5 font-[family-name:var(--font-display)] text-sm font-bold tabular-nums",
            totalGeral < 0 ? "text-expense" : "text-foreground",
          )}
        >
          {brl(totalGeral)}
        </p>
        <p className="text-[10px] text-muted-foreground/50">
          soma de {plural(raizes.length, "caixa", "caixas")} +{" "}
          {plural(lists.length - raizes.length, "envelope", "envelopes")}
        </p>
      </div>

      {/* Limpeza de dados antigos */}
      <div className="border-t border-sidebar-border px-3 py-2.5">
        {confirmOtimizar ? (
          <div className="rounded-lg bg-sidebar-accent/70 px-2.5 py-2">
            <p className="text-[11px] leading-snug text-sidebar-foreground/80">
              Arquiva os meses antes do período em <strong>2 linhas por mês</strong> e apaga os
              lançamentos brutos. Saldo e totais continuam iguais — mas não dá pra desfazer.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {[90, 180, 365].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => otimizar(d)}
                  disabled={otimizando}
                  className="rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {d === 90 ? "3 meses" : d === 180 ? "6 meses" : "12 meses"}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setConfirmOtimizar(false);
                  setErroOtimizar(null);
                }}
                disabled={otimizando}
                className="rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setConfirmOtimizar(true);
              setErroOtimizar(null);
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <Archive className="size-3.5" />
            Otimizar dados antigos
          </button>
        )}
        {erroOtimizar ? (
          <p className="mt-1.5 text-[11px] font-medium text-destructive">{erroOtimizar}</p>
        ) : null}
      </div>

      {/* Conta */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="truncate text-xs text-muted-foreground/60">
            {telefone ? `•••${telefone.slice(-4)}` : "Conta"}
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <LogOut className="size-3" />
            Sair
          </button>
        </div>

        {confirmAccount ? (
          <div className="mt-2 rounded-lg bg-destructive/10 px-3 py-2">
            <p className="text-[11px] text-destructive">
              Apagar sua conta? Todas as listas e lançamentos saem do banco e isso não volta.
            </p>
            <div className="mt-1.5 flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => void run(onDeleteAccount)}
                disabled={busy}
                className="rounded bg-destructive px-2 py-1 text-[11px] font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
              >
                Apagar tudo
              </button>
              <button
                type="button"
                onClick={() => setConfirmAccount(false)}
                className="rounded px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmAccount(true)}
            className="mt-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-destructive"
          >
            <Trash2 className="size-3" />
            Excluir minha conta
          </button>
        )}
      </div>
    </div>
  );
}
