import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Wallet,
  LogOut,
  Menu,
} from "lucide-react";
import type { WalletList } from "@/lib/caixa";
import {
  createWalletList,
  renameWalletList,
  deleteWalletList,
} from "@/lib/caixa";
import { cn } from "@/lib/utils";

interface WalletSidebarProps {
  lists: WalletList[];
  activeListId: string | null;
  onSelectList: (id: string) => void;
  onUpdate: () => void;
  telefone?: string;
  onSignOut: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function WalletSidebar({
  lists,
  activeListId,
  onSelectList,
  onUpdate,
  telefone,
  onSignOut,
  collapsed = false,
  onToggleCollapse,
}: WalletSidebarProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) newInputRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const list = createWalletList(newName);
    setNewName("");
    setCreating(false);
    onUpdate();
    onSelectList(list.id);
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    renameWalletList(id, editName);
    setEditingId(null);
    setEditName("");
    onUpdate();
  };

  const handleDelete = (id: string) => {
    deleteWalletList(id);
    setConfirmDeleteId(null);
    if (activeListId === id) {
      const remaining = lists.filter((l) => l.id !== id);
      const first = remaining[0];
      if (first) onSelectList(first.id);
    }
    onUpdate();
  };

  if (collapsed) {
    return (
      <div className="flex h-full w-14 flex-col items-center border-r border-border bg-sidebar py-4">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="mb-4 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex flex-1 flex-col items-center gap-2">
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => onSelectList(list.id)}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg text-xs font-semibold transition-colors",
                activeListId === list.id
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
              title={list.name}
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
          className="mt-2 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-primary"
          title="Nova lista"
        >
          <Plus className="size-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary/15 text-sidebar-primary">
            <Wallet className="size-4" />
          </div>
          <span className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight text-sidebar-foreground">
            CAIXA
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground lg:hidden"
        >
          <Menu className="size-4" />
        </button>
      </div>

      {/* Lists section */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Minhas listas
        </p>
        <ul className="space-y-0.5">
          {lists.map((list) => (
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
                    className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(list.id)}
                    className="shrink-0 rounded p-1 text-income transition-colors hover:bg-sidebar-accent"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : confirmDeleteId === list.id ? (
                <div className="flex items-center justify-between rounded-lg bg-destructive/10 px-3 py-2">
                  <span className="truncate text-xs text-destructive">
                    Excluir "{list.name}"?
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(list.id)}
                      className="rounded p-1 text-destructive transition-colors hover:bg-destructive/20"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group flex items-center">
                  <button
                    type="button"
                    onClick={() => onSelectList(list.id)}
                    className={cn(
                      "min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      activeListId === list.id
                        ? "bg-sidebar-primary/15 font-semibold text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <span className="mr-2 inline-block size-1.5 rounded-full bg-sidebar-primary/40" />
                    {list.name}
                  </button>
                  <div className="ml-1 hidden shrink-0 items-center gap-0.5 group-hover:flex">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(list.id);
                        setEditName(list.name);
                      }}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                      title="Renomear"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(list.id)}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* Create new list */}
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
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring/30"
            />
            <button
              type="button"
              onClick={handleCreate}
              className="shrink-0 rounded p-1 text-sidebar-primary transition-colors hover:bg-sidebar-accent"
            >
              <Check className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setNewName("");
              }}
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
      </div>

      {/* Footer */}
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
      </div>
    </div>
  );
}
