import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, PanelLeftOpen, RefreshCw, Wallet, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthTelefone } from "@/components/AuthTelefone";
import { WalletSidebar } from "@/components/WalletSidebar";
import { WalletDashboard } from "@/components/WalletDashboard";
import { useCaixa } from "@/hooks/use-caixa";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Caixa do Dia | Controle de entradas e gastos" },
      {
        name: "description",
        content:
          "Caixa manual: lance recebimentos e gastos em listas independentes. Cada lista tem o próprio saldo, extrato e gráfico.",
      },
      { property: "og:title", content: "Caixa do Dia" },
      {
        property: "og:description",
        content: "Lançamento manual, listas independentes e saldo na hora.",
      },
    ],
  }),
  component: Index,
});

// ── Aviso de instalação (PWA) ────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

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
              <p className="text-xs text-muted-foreground">Acesso rápido na tela inicial</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPrompt(false)}
            aria-label="Fechar aviso"
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            void deferredPrompt.prompt();
            setDeferredPrompt(null);
            setShowPrompt(false);
          }}
          className="mt-3 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Instalar agora
        </button>
      </div>
    </div>
  );
}

// ── Marca / estados iniciais ─────────────────────────────────────────

function BrandMark() {
  return (
    <div className="relative">
      <span aria-hidden className="absolute inset-0 animate-ping rounded-2xl bg-primary/20" />
      <div className="relative flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Wallet className="size-6" />
      </div>
    </div>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-4">
      <BrandMark />
      <div className="text-center">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.25em]">
          Caixa do Dia
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-primary/60"
            style={{ animationDelay: `${i * 140}ms` }}
          />
        ))}
      </div>
    </main>
  );
}

function SetupError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-4">
      <BrandMark />
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-center shadow-lg">
        <p className="font-[family-name:var(--font-display)] text-base font-bold">
          Não deu para iniciar o caixa
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.99]"
        >
          <RefreshCw className="size-4" /> Tentar de novo
        </button>
      </div>
    </main>
  );
}

// ── Porta de entrada (login por telefone) ────────────────────────────

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => {
    try {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s);
        setChecking(false);
      });
      void supabase.auth
        .getSession()
        .then(({ data }) => {
          setSession(data.session);
          setChecking(false);
        })
        .catch(() => {
          setChecking(false);
          setFatal(
            "Não conseguimos falar com o servidor de dados. Confira sua internet e tente novamente.",
          );
        });
      return () => sub.subscription.unsubscribe();
    } catch {
      // Falta a configuração do Supabase neste ambiente (URL/chave pública).
      setChecking(false);
      setFatal(
        "A conexão com o banco não está configurada aqui (VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY).",
      );
      return undefined;
    }
  }, []);

  if (checking) return <LoadingScreen label="Carregando seu caixa…" />;
  if (fatal) return <SetupError message={fatal} />;

  if (!session) return <AuthTelefone />;

  return (
    <>
      <Dashboard session={session} />
      <InstallPrompt />
    </>
  );
}

// ── Aplicativo ───────────────────────────────────────────────────────

function Dashboard({ session }: { session: Session }) {
  const userId = session.user.id;
  const telefone = (session.user.user_metadata?.["telefone"] as string | undefined) ?? "";
  const caixa = useCaixa(userId);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const error = actionError ?? caixa.error;
  const daily = caixa.perfil ? String(caixa.perfil.diaria) : "130";
  const hourRate = caixa.perfil ? String(caixa.perfil.valorHora) : "";

  const handleSelectList = (id: string) => {
    caixa.selectList(id);
    setMobileSidebarOpen(false);
    setActionError(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Barra lateral — desktop */}
      <div className="hidden lg:flex">
        <WalletSidebar
          lists={caixa.lists}
          activeListId={caixa.activeListId}
          summaries={caixa.summaries}
          onSelectList={handleSelectList}
          onCreate={async (name) => {
            await caixa.addList(name);
          }}
          onRename={caixa.editList}
          onDelete={caixa.removeList}
          telefone={telefone}
          onSignOut={() => void supabase.auth.signOut()}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Barra lateral — celular */}
      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-50 h-full w-72 max-w-[85vw]">
            <WalletSidebar
              lists={caixa.lists}
              activeListId={caixa.activeListId}
              summaries={caixa.summaries}
              onSelectList={handleSelectList}
              onCreate={async (name) => {
                await caixa.addList(name);
              }}
              onRename={caixa.editList}
              onDelete={caixa.removeList}
              telefone={telefone}
              onSignOut={() => void supabase.auth.signOut()}
              collapsed={false}
              onToggleCollapse={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Mostrar listas"
              className="hidden size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:flex"
            >
              <PanelLeftOpen className="size-5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Abrir listas"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
          >
            <PanelLeftOpen className="size-5" />
          </button>
          <span className="truncate font-[family-name:var(--font-display)] text-sm font-semibold">
            {caixa.activeList ? caixa.activeList.name : "Caixa"}
          </span>
        </div>

        {/* Erros */}
        {error ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-destructive/20 bg-destructive/5 px-4 py-2 sm:px-6">
            <p className="text-sm font-medium text-destructive">{error}</p>
            {caixa.migrationNeeded ? (
              <code className="rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] text-destructive">
                supabase/setup_completo.sql
              </code>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  caixa.refresh();
                }}
                className="text-xs font-semibold text-destructive underline underline-offset-2"
              >
                Tentar novamente
              </button>
            )}
          </div>
        ) : null}

        {/* Conteúdo */}
        <div className="min-h-0 flex-1">
          {caixa.activeList ? (
            <WalletDashboard
              key={caixa.activeList.id}
              list={caixa.activeList}
              lists={caixa.lists}
              entries={caixa.activeEntries}
              loading={caixa.loading}
              daily={daily}
              hourRate={hourRate}
              onRename={(name) => void caixa.editList(caixa.activeList!.id, name)}
              onCreate={async (input) => {
                setActionError(null);
                return caixa.addEntry(input);
              }}
              onEditEntry={caixa.editEntry}
              onDeleteEntry={caixa.removeEntry}
              onSavePerfil={(diaria, valorHora) => void caixa.updatePerfil(diaria, valorHora)}
              onError={setActionError}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-4">
              <p className="text-center text-sm text-muted-foreground">
                {caixa.loading
                  ? "Carregando suas listas…"
                  : "Crie uma lista na barra lateral para começar a lançar."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
