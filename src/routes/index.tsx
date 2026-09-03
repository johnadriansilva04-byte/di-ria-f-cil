import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Download, X, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthTelefone } from "@/components/AuthTelefone";
import { WalletSidebar } from "@/components/WalletSidebar";
import { WalletDashboard } from "@/components/WalletDashboard";
import {
  fetchWalletLists,
  getActiveListId,
  setActiveListId,
  fetchPerfil,
  toNumber,
  savePerfil,
  maskPhone,
  createWalletList,
  type WalletList,
} from "@/lib/caixa";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Caixa do Dia | Controle financeiro" },
      {
        name: "description",
        content:
          "Dashboard financeiro modular. Controle seus gastos e recebimentos em listas independentes.",
      },
      { property: "og:title", content: "Caixa do Dia" },
      {
        property: "og:description",
        content: "Controle financeiro modular e profissional.",
      },
    ],
  }),
  component: Index,
});

// ── PWA Install Prompt ───────────────────────────────────────────────

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("PWA instalado com sucesso");
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80">
      <div className="rounded-xl border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Download className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Instalar App</p>
              <p className="text-xs text-muted-foreground">
                Acesso rápido na tela inicial
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>
        <button
          onClick={handleInstall}
          className="mt-3 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Instalar agora
        </button>
      </div>
    </div>
  );
}

// ── Auth gate ────────────────────────────────────────────────────────

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setChecking(false);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  if (!session) return <AuthTelefone />;

  return (
    <>
      <Dashboard session={session} />
      <InstallPrompt />
    </>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────

function Dashboard({ session }: { session: Session }) {
  const userId = session.user.id;
  const telefone = (session.user.user_metadata?.["telefone"] as string | undefined) ?? "";

  const [lists, setLists] = useState<WalletList[]>([]);
  const [activeListId, setActiveListIdState] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<{ diaria: number; valorHora: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Load wallet lists
  const loadLists = useCallback(() => {
    const loaded = fetchWalletLists();
    setLists(loaded);

    // If no lists exist, create a default one
    if (loaded.length === 0) {
      const defaultList = createWalletList("Meu Trabalho");
      setLists([defaultList]);
      setActiveListId(defaultList.id);
      setActiveListIdState(defaultList.id);
      return;
    }

    // Restore active list or select first
    const savedActive = getActiveListId();
    if (savedActive && loaded.some((l) => l.id === savedActive)) {
      setActiveListIdState(savedActive);
    } else {
      const first = loaded[0];
      if (first) {
        setActiveListIdState(first.id);
        setActiveListId(first.id);
      }
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  // Load perfil
  useEffect(() => {
    void (async () => {
      try {
        const p = await fetchPerfil(userId);
        if (p) setPerfil(p);
      } catch (e) {
        console.error("Erro ao carregar perfil:", e);
      }
    })();
  }, [userId]);

  // Save perfil when daily/hourRate changes (debounced handled in previous version)
  const handlePerfilSave = useCallback(
    (diaria: number, valorHora: number) => {
      setPerfil({ diaria, valorHora });
      void savePerfil(userId, diaria, valorHora).catch(() => undefined);
    },
    [userId]
  );

  // Handle list selection
  const handleSelectList = (id: string) => {
    setActiveListIdState(id);
    setActiveListId(id);
    setMobileSidebarOpen(false);
  };

  // Handle sign out
  const handleSignOut = () => {
    void supabase.auth.signOut();
  };

  const activeList = lists.find((l) => l.id === activeListId);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <WalletSidebar
          lists={lists}
          activeListId={activeListId}
          onSelectList={handleSelectList}
          onUpdate={loadLists}
          telefone={telefone}
          onSignOut={handleSignOut}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-50 h-full">
            <WalletSidebar
              lists={lists}
              activeListId={activeListId}
              onSelectList={handleSelectList}
              onUpdate={loadLists}
              telefone={telefone}
              onSignOut={handleSignOut}
              collapsed={false}
              onToggleCollapse={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <PanelLeftOpen className="size-5" />
          </button>
          {activeList && (
            <span className="font-[family-name:var(--font-display)] text-sm font-semibold">
              {activeList.name}
            </span>
          )}
        </div>

        {/* Desktop collapse toggle */}
        {sidebarCollapsed && (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            className="absolute left-2 top-3 z-30 hidden size-8 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-sm transition-colors hover:bg-secondary hover:text-foreground lg:flex"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}

        {/* Error message */}
        {erro && (
          <div className="border-b border-destructive/20 bg-destructive/5 px-6 py-2">
            <p className="text-sm font-medium text-destructive">{erro}</p>
          </div>
        )}

        {/* Wallet content */}
        <div className="flex-1 overflow-hidden">
          {activeList ? (
            <WalletDashboard
              key={activeList.id}
              list={activeList}
              userId={userId}
              perfil={perfil}
              onError={setErro}
              isFirstList={activeList.id === lists[0]?.id}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Selecione uma lista na barra lateral.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
