import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Sparkles, Trash2, Wallet, X } from "lucide-react";
import type { Entry, WalletList } from "@/lib/caixa";
import type { NewEntry } from "@/hooks/use-caixa";
import { cn } from "@/lib/utils";

interface OnboardingTourProps {
  open: boolean;
  activeListId: string | null;
  lists: WalletList[];
  onClose: () => void;
  onComplete: () => void;
  onCreateList: (name: string) => Promise<WalletList>;
  onOpenList: (id: string) => void;
  onCreateEntry: (input: NewEntry) => Promise<Entry>;
  onDeleteEntry: (id: string) => Promise<void>;
  onDeleteList: (id: string) => Promise<void>;
}

/** Nome do caixa e do lançamento criados SÓ para demonstrar; somem no fim. */
const DEMO_LIST_NAME = "Caixa de exemplo";
const DEMO_ENTRY_LABEL = "Lançamento de exemplo";
const DEMO_ENTRY_AMOUNT = 100;

type Step =
  | "intro"
  | "creating-list"
  | "list-created"
  | "opening-list"
  | "entry-intro"
  | "creating-entry"
  | "entry-created"
  | "delete-entry-intro"
  | "deleting-entry"
  | "entry-deleted"
  | "delete-list-intro"
  | "deleting-list"
  | "done";

const STEP_ORDER: Step[] = [
  "intro",
  "creating-list",
  "list-created",
  "opening-list",
  "entry-intro",
  "creating-entry",
  "entry-created",
  "delete-entry-intro",
  "deleting-entry",
  "entry-deleted",
  "delete-list-intro",
  "deleting-list",
  "done",
];

/** Máxima espera por uma operação do banco antes de seguir (12s). */
const MAX_WAIT_MS = 12_000;

export function OnboardingTour({
  open,
  activeListId,
  lists,
  onClose,
  onComplete,
  onCreateList,
  onOpenList,
  onCreateEntry,
  onDeleteEntry,
  onDeleteList,
}: OnboardingTourProps) {
  const [step, setStep] = useState<Step>("intro");
  const demoListId = useRef<string | null>(null);
  const demoEntryId = useRef<string | null>(null);
  const finishedRef = useRef(false);

  // Ao reabrir, recomeça do zero.
  useEffect(() => {
    if (open) {
      setStep("intro");
      demoListId.current = null;
      demoEntryId.current = null;
      finishedRef.current = false;
    }
  }, [open]);

  const listExists = demoListId.current
    ? lists.some((l) => l.id === demoListId.current)
    : false;
  const listActive = demoListId.current !== null && activeListId === demoListId.current;

  /* ── Script vivo: cada ação dispara sozinha ── */

  // 1. Cria o caixa de exemplo ao entrar na etapa "creating-list".
  useEffect(() => {
    if (!open || step !== "creating-list") return;
    if (demoListId.current) return;
    let cancelled = false;
    void onCreateList(DEMO_LIST_NAME)
      .then((list) => {
        if (cancelled) return;
        demoListId.current = list.id;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, step, onCreateList]);

  // 2. Quando o caixa de exemplo aparecer na lista (prop), avança.
  useEffect(() => {
    if (!open || step !== "creating-list") return;
    if (demoListId.current && listExists) setStep("list-created");
  }, [open, step, lists, listExists]);

  // 3. "Abrir o caixa" já chama onOpenList: aqui apenas confirma (e avança
  //    se por algum motivo o usuário já estava no caixa quando chegou).
  useEffect(() => {
    if (!open || step !== "opening-list") return;
    if (listActive) setStep("entry-intro");
  }, [open, step, listActive]);

  // 4. Cria o lançamento de exemplo (só depois de o caixa estar aberto).
  useEffect(() => {
    if (!open || step !== "creating-entry" || demoEntryId.current) return;
    if (!demoListId.current || !listActive || !listExists) {
      setStep("entry-intro");
      return;
    }
    let cancelled = false;
    void onCreateEntry({
      label: DEMO_ENTRY_LABEL,
      kind: "entrada" as const,
      amount: DEMO_ENTRY_AMOUNT,
    })
      .then((entry) => {
        if (cancelled) return;
        demoEntryId.current = entry.id;
        setStep("entry-created");
      })
      .catch(() => {
        if (!cancelled) setStep("entry-deleted");
      });
    const timer = window.setTimeout(() => {
      if (!cancelled && step === "creating-entry") setStep("entry-created");
    }, MAX_WAIT_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, step, listActive, listExists, onCreateEntry]);

  // 5. Apaga o lançamento de exemplo.
  useEffect(() => {
    if (!open || step !== "deleting-entry" || !demoEntryId.current) return;
    const id = demoEntryId.current;
    let cancelled = false;
    void onDeleteEntry(id).catch(() => undefined);
    const timer = window.setTimeout(() => {
      if (!cancelled) setStep("entry-deleted");
    }, 650);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, step, onDeleteEntry]);

  // 6. Apaga o caixa de exemplo.
  useEffect(() => {
    if (!open || step !== "deleting-list" || !demoListId.current) return;
    const id = demoListId.current;
    let cancelled = false;
    void onDeleteList(id).catch(() => undefined);
    const timer = window.setTimeout(() => {
      if (!cancelled) setStep("done");
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, step, onDeleteList]);

  /* ── Sair no meio: apaga o que sobrou e marca como visto ── */
  const cleanup = () => {
    const entryId = demoEntryId.current;
    const listId = demoListId.current;
    if (entryId) void onDeleteEntry(entryId).catch(() => undefined);
    if (listId) void onDeleteList(listId).catch(() => undefined);
    demoEntryId.current = null;
    demoListId.current = null;
  };

  const handleClose = () => {
    if (!finishedRef.current) cleanup();
    // Fechou (mesmo no meio): nunca mais mostra sozinho. O "?" reabre.
    onComplete();
    onClose();
  };

  const handleFinish = () => {
    finishedRef.current = true;
    onComplete();
  };

  if (!open) return null;

  const progress = STEP_ORDER.indexOf(step) + 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial guiado"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      {/* fundo escuro: clicar fora fecha (limpando os exemplos) */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar tutorial"
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        {/* barra de progresso */}
        <div className="absolute inset-x-0 top-0 h-1 bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(progress / STEP_ORDER.length) * 100}%` }}
          />
        </div>

        <div className="mt-3">
          {step === "intro" ? (
            <>
              <Header icon={<Sparkles className="size-6" />} title="Vou te mostrar na prática!" />
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Em vez de só explicar, eu vou{" "}
                <b className="text-foreground">criar um caixa, lançar R$ 100,00 e depois apagar tudo</b>{" "}
                — com você vendo cada passo na tela. Leva menos de 30 segundos. 👍
              </p>
              <p className="mt-3 rounded-xl border border-border/70 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                💡 Pode testar à vontade: tudo que eu criar aqui é fake e não vai poluir seu app.
              </p>
              <Button onClick={() => setStep("creating-list")}>Vamos lá!</Button>
            </>
          ) : step === "creating-list" ? (
            <>
              <Header icon={<Loader2 className="size-6 animate-spin text-primary" />} title="Criando caixa de exemplo…" />
              <p className="mt-2 text-sm text-muted-foreground">
                Estou criando um caixa chamado <b className="text-foreground">“{DEMO_LIST_NAME}”</b> na
                barra lateral, igual você vai fazer com os seus trabalhos.
              </p>
            </>
          ) : step === "list-created" ? (
            <>
              <Header icon={<Check className="size-6 text-income" />} title="Caixa criado! ✅" />
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Repare na <b className="text-foreground">barra lateral à esquerda</b>: “{DEMO_LIST_NAME}”
                já apareceu lá. Cada trabalho que você tiver vira um caixa desses.
              </p>
              <Button onClick={() => onOpenList(demoListId.current!)}>Abrir o caixa</Button>
            </>
          ) : step === "opening-list" ? (
            <>
              <Header icon={<Loader2 className="size-6 animate-spin text-primary" />} title="Abrindo o caixa…" />
              <p className="mt-2 text-sm text-muted-foreground">
                Estou abrindo a tela do caixa, onde ficam o saldo, o formulário e o extrato.
              </p>
            </>
          ) : step === "entry-intro" ? (
            <>
              <Header icon={<Wallet className="size-6 text-income" />} title="Agora vou lançar um valor" />
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Esse é o formulário de lançamento. Vou registrar uma{" "}
                <b className="text-income">Entrada de R$ 100,00</b> chamada “{DEMO_ENTRY_LABEL}”,
                como se você tivesse recebido uma diária. O saldo sobe na hora.
              </p>
              <Button onClick={() => setStep("creating-entry")}>Lançar o valor</Button>
            </>
          ) : step === "creating-entry" ? (
            <>
              <Header icon={<Loader2 className="size-6 animate-spin text-primary" />} title="Lançando…" />
              <p className="mt-2 text-sm text-muted-foreground">
                Guarde o som e a animação verde: é assim que o app confirma quando o dinheiro entra.
              </p>
            </>
          ) : step === "entry-created" ? (
            <>
              <Header icon={<Check className="size-6 text-income" />} title="Lançado! 💰" />
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                O <b className="text-foreground">saldo do caixa subiu</b> e o lançamento apareceu em{" "}
                <b className="text-foreground">“Últimos lançamentos”</b> à direita, com o lápis e a
                lixeira para editar e apagar.
              </p>
              <Button onClick={() => setStep("delete-entry-intro")}>Continuar</Button>
            </>
          ) : step === "delete-entry-intro" ? (
            <>
              <Header icon={<Trash2 className="size-6 text-expense" />} title="Agora vou ensinar a apagar" />
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Errou um lançamento? É só usar a <b className="text-expense">lixeira</b> ao lado dele.
                Vou apagar esse lançamento de exemplo para você ver como fica limpo.
              </p>
              <Button onClick={() => setStep("deleting-entry")} variant="danger">
                Apagar o lançamento
              </Button>
            </>
          ) : step === "deleting-entry" ? (
            <>
              <Header icon={<Loader2 className="size-6 animate-spin text-primary" />} title="Apagando lançamento…" />
              <p className="mt-2 text-sm text-muted-foreground">
                Pronto, ele some da lista e o saldo volta para o valor anterior.
              </p>
            </>
          ) : step === "entry-deleted" ? (
            <>
              <Header icon={<Check className="size-6 text-income" />} title="Apagado! 🧹" />
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                E se quiser apagar um caixa inteiro? É o mesmo caminho, pela barra lateral à esquerda
                (ícone de lixeira ao passar o mouse). Vou remover o caixa de exemplo.
              </p>
              <Button onClick={() => setStep("delete-list-intro")} variant="danger">
                Apagar o caixa de exemplo
              </Button>
            </>
          ) : step === "delete-list-intro" ? (
            <>
              <Header icon={<Trash2 className="size-6 text-expense" />} title="Apagando o caixa de exemplo…" />
              <p className="mt-2 text-sm text-muted-foreground">
                Assim você fica com o app do mesmo jeito que estava antes do tutorial. Nada de lixo.
              </p>
            </>
          ) : step === "deleting-list" ? (
            <>
              <Header icon={<Loader2 className="size-6 animate-spin text-primary" />} title="Removendo…" />
              <p className="mt-2 text-sm text-muted-foreground">
                O caixa de exemplo está sendo removido do seu app.
              </p>
            </>
          ) : (
            <>
              <Header icon={<Sparkles className="size-6 text-primary" />} title="Tudo pronto! 🎉" />
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Você viu na prática como <b className="text-foreground">criar um caixa</b>,{" "}
                <b className="text-income">lançar um valor</b> e{" "}
                <b className="text-expense">apagar</b>. Agora é com você: crie seu caixa de verdade
                na barra lateral e comece a registrar seu dia a dia.
              </p>
              <p className="mt-3 rounded-xl border border-border/70 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                💡 Este tutorial não aparece de novo — mas você pode reabrir pelo botão{" "}
                <b>?</b> no topo, quando quiser.
              </p>
              <Button onClick={handleFinish}>Começar a usar!</Button>
            </>
          )}

          <p className="mt-4 text-center text-[11px] tabular-nums text-muted-foreground/50">
            Passo {progress} de {STEP_ORDER.length}
          </p>
        </div>
      </div>
    </div>
  );
}

function Header({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        {icon}
      </div>
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold leading-tight tracking-tight">
        {title}
      </h2>
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-transform hover:brightness-110 active:scale-[0.98]",
        variant === "danger"
          ? "bg-destructive text-destructive-foreground"
          : "bg-primary text-primary-foreground",
      )}
    >
      {children}
    </button>
  );
}