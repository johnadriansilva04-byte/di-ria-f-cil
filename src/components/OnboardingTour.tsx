import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Layers,
  Lightbulb,
  MousePointerClick,
  PartyPopper,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingTourProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Step = {
  title: string;
  description: string;
  Icon: typeof Lightbulb;
  accent: string;
  hint?: string;
  bullets?: string[];
};

const STEPS: Step[] = [
  {
    title: "Bem-vindo(a) ao Easy Account 🎉",
    description:
      "O app do seu caixa. Anote o que entra e o que sai de cada trabalho, veja o saldo na hora e não perca mais nenhum real.",
    Icon: PartyPopper,
    accent: "from-primary/25 to-transparent",
    bullets: ["Tudo fica salvo na sua conta", "Funciona no celular e no computador"],
  },
  {
    title: "Crie seus caixas (listas)",
    description:
      "Cada trabalho vira uma lista: 'Meu Trabalho', 'Pizzaria', 'Obras'… Use o botão '+ Nova lista' na barra lateral para criar quantas quiser.",
    Icon: Layers,
    accent: "from-chart-2/25 to-transparent",
    bullets: ["Cada lista tem saldo e extrato próprios", "A troca de lista é só um toque"],
  },
  {
    title: "Como lançar um ganho ou gasto",
    description:
      "Na tela do caixa tem o formulário de lançamento. Escolha Entrada ou Saída, escreva o valor e confirme. Pronto, o saldo atualiza na hora.",
    Icon: Wallet,
    accent: "from-income/25 to-transparent",
    hint: "entrada = dinheiro que chegou · saída = dinheiro que saiu",
  },
  {
    title: "Dicas rápidas para lançar",
    description: "Depois que você lança o primeiro valor, fica fácil repetir o processo:",
    Icon: MousePointerClick,
    accent: "from-chart-5/25 to-transparent",
    bullets: [
      "Use as sugestões de descrição (Diária, Serviço, Combustível…)",
      "A diária configurada já vem preenchida no campo de valor",
      "Você pode trocar a data se precisar lançar um dia atrasado",
    ],
  },
  {
    title: "Editar e excluir lançamentos",
    description:
      "Errou? Sem problema. No extrato, cada lançamento tem botões de editar (lápis) e excluir (lixeira).",
    Icon: Pencil,
    accent: "from-chart-4/25 to-transparent",
    hint: "os lápis aparecem ao passar o dedo/mouse sobre o lançamento",
  },
  {
    title: "Metas e recordes 🏆",
    description:
      "O Easy Account te incentiva: meta do dia, meta do mês, sequência de dias seguidos e recorde de receita mensal. Bateu uma meta? Comemoração com som de sucesso!",
    Icon: Sparkles,
    accent: "from-chart-3/25 to-transparent",
    bullets: ["Meta diária: ganhou hoje? ✓", "Meta mensal: dias úteis com receita", "Recorde: maior receita em um mês"],
  },
  {
    title: "Tudo pronto! 🚀",
    description: "Agora é com você. Comece criando seu primeiro caixa e fazendo o primeiro lançamento.",
    Icon: Check,
    accent: "from-primary/25 to-transparent",
    hint: "Você pode reabrir esse tour pelo botão '?' a qualquer momento",
  },
];

export function OnboardingTour({ open, onClose, onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      onComplete();
      onClose();
      return;
    }
    setStep((s) => s + 1);
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));
  const skip = () => {
    onComplete();
    onClose();
  };

  const { Icon, accent, title, description, hint, bullets } = current;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tour de boas-vindas"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      {/* fundo escuro */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={skip} />

      {/* card do tour */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={skip}
          aria-label="Fechar tour"
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div
          className={cn(
            "pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-gradient-to-br to-transparent",
            accent,
          )}
        />

        <div className="relative">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Icon className="size-6" />
          </div>

          <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold leading-tight tracking-tight">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>

          {hint ? (
            <p className="mt-3 rounded-xl border border-border/70 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              💡 {hint}
            </p>
          ) : null}

          {bullets ? (
            <ul className="mt-4 space-y-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-income" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {/* indicador de etapas */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-1.5 rounded-full transition-all",
                    i === step ? "w-5 bg-primary" : i < step ? "bg-income/60" : "bg-secondary",
                  )}
                />
              ))}
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground/60">
              {step + 1}/{STEPS.length}
            </span>
          </div>

          {/* navegação */}
          <div className="mt-4 flex items-center gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={prev}
                className="rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Voltar
              </button>
            ) : null}
            <button
              type="button"
              onClick={next}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:brightness-110 active:scale-[0.98]"
            >
              {isLast ? (
                <>
                  Começar! <ArrowUp className="size-4" />
                </>
              ) : (
                <>
                  Próximo <ArrowDown className="size-4" />
                </>
              )}
            </button>
          </div>

          {step === 0 ? (
            <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/60">
              <Plus className="size-3" /> 60 segundos para aprender o essencial
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}