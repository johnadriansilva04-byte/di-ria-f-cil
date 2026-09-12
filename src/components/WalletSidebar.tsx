import { useEffect, useRef, useState } from "react";
import { Check, LogOut, Menu, Pencil, Plus, Trash2, X } from "lucide-react";
import { brl, brlCompact, type Totals, type WalletList } from "@/lib/caixa";
import { BrandLockup } from "@/components/Brand";
import { cn } from "@/lib/utils";

interface WalletSidebarProps {
  lists: WalletList[];
  activeListId: string | null;
  summaries: Record<string, Totals>;
  onSelectList: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  telefone?: string;
  onSignOut: () => void;
  onDeleteAccount: () => Promise<void>;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const inlineInput =
  "min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/30";

export function WalletSidebar({
  lists,
  activeListId,
  summaries,
  onSelectList,
  onCreate,
  onRename,
  onDelete,
  telefone,
  onSignOut,
  onDeleteAccount,
  collapsed = false,
  onToggleCollapse,
}: WalletSidebarProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmAccount, setConfirmAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) newInputRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const totalGeral = lists.reduce((acc, list) => acc + (summaries[list.id]?.balance ?? 0), 0);

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
          {lists.map((list) => (
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
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Minhas listas
        </p>
        <ul className="space-y-0.5">
          {lists.map((list) => {
            const summary = summaries[list.id];
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
                      Excluir “{list.name}” e seus {summary?.count ?? 0} lançamento(s)?
                    </p>
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
                  <div className="group flex items-center">
                    <button
                      type="button"
                      onClick={() => onSelectList(list.id)}
                      className={cn(
                        "min-w-0 flex-1 rounded-lg px-3 py-2 text-left transition-colors",
                        activeListId === list.id
                          ? "bg-sidebar-primary/15 text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
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
                            "shrink-0 font-[family-name:var(--font-display)] text-[11px] font-bold tabular-nums",
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
                        {summary?.count ?? 0} lançamento(s)
                      </span>
                    </button>
                    <div className="ml-1 hidden shrink-0 items-center gap-0.5 group-hover:flex focus-visible:flex">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(list.id);
                          setEditName(list.name);
                        }}
                        aria-label={`Renomear ${list.name}`}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(list.id)}
                        aria-label={`Excluir ${list.name}`}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-destructive"
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
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Total geral
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
          soma de todas as {lists.length} lista(s)
        </p>
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
