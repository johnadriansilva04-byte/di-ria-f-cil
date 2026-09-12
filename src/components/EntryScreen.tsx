import { useEffect, useRef, useState } from "react";
import { ArrowRight, BarChart3, Layers, Loader2, Lock, Phone, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl, maskPhone, onlyDigits, phoneToEmail, type MonthPoint } from "@/lib/caixa";
import { BrandLockup } from "@/components/Brand";
import { cn } from "@/lib/utils";

type Mode = "entrar" | "criar";

const PILLARS = [
  { Icon: Plus, title: "Registre", text: "O que entrou e o que saiu, em segundos." },
  { Icon: Layers, title: "Acompanhe", text: "Cada lista com saldo e extrato próprios." },
  { Icon: BarChart3, title: "Entenda", text: "Gráfico dos últimos meses, sem planilha." },
] as const;

/** Meses de exemplo usados só na maquete da abertura. */
const PREVIEW: MonthPoint[] = [
  { key: "m1", label: "Abr", income: 4200, expense: 2600 },
  { key: "m2", label: "Mai", income: 5100, expense: 3100 },
  { key: "m3", label: "Jun", income: 4800, expense: 2900 },
  { key: "m4", label: "Jul", income: 6200, expense: 3400 },
  { key: "m5", label: "Ago", income: 7000, expense: 3800 },
  { key: "m6", label: "Set", income: 8200, expense: 3160 },
];

/**
 * Contadores da maquete: um único requestAnimationFrame para os três números
 * (três loops separados custariam 3x mais quadros em celular fraco).
 */
function usePreviewNumbers(delay = 320, duration = 1100) {
  const [values, setValues] = useState({ balance: 0, income: 0, expense: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValues({ balance: 5040, income: 8200, expense: 3160 });
      return undefined;
    }

    let frame = 0;
    let startedAt = 0;
    const timer = window.setTimeout(() => {
      const step = (now: number) => {
        if (!startedAt) startedAt = now;
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValues({
          balance: 5040 * eased,
          income: 8200 * eased,
          expense: 3160 * eased,
        });
        if (progress < 1) frame = window.requestAnimationFrame(step);
      };
      frame = window.requestAnimationFrame(step);
    }, delay);

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [delay, duration]);

  return values;
}

/** Barras leves (CSS puro): a entrada não carrega biblioteca de gráfico. */
function MiniBars({ data }: { data: MonthPoint[] }) {
  const max = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);

  return (
    <div className="flex h-24 items-end justify-between gap-1.5 sm:h-28">
      {data.map((point, index) => (
        <div key={point.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <div className="flex h-full w-full items-end justify-center gap-[3px]">
            <span
              className="ea-bar w-1/3 rounded-t-[3px] bg-income"
              style={{
                height: `${(point.income / max) * 100}%`,
                animationDelay: `${620 + index * 60}ms`,
              }}
            />
            <span
              className="ea-bar w-1/3 rounded-t-[3px] bg-expense"
              style={{
                height: `${(point.expense / max) * 100}%`,
                animationDelay: `${660 + index * 60}ms`,
              }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground/60">{point.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Maquete viva do app: mostra o saldo subindo, os números e o gráfico desenhando. */
function ProductPreview() {
  const { balance, income, expense } = usePreviewNumbers();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-xl sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Meu Trabalho
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          exemplo
        </span>
      </div>

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        Saldo
      </p>
      <p className="font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums sm:text-4xl">
        {brl(balance)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/70 bg-background/40 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Recebido
          </p>
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-income sm:text-base">
            {brl(income)}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/40 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Gastos
          </p>
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-expense sm:text-base">
            {brl(expense)}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-border/70 bg-background/40 p-2">
        <MiniBars data={PREVIEW} />
      </div>

      {/* lançamento chegando: mostra que é tudo digitado por você */}
      <span
        className="ea-pop absolute right-3 top-[42%] inline-flex items-center gap-1.5 rounded-full border border-income/40 bg-income/15 px-2.5 py-1 text-[11px] font-bold tabular-nums text-income shadow-lg"
        style={{ animationDelay: "900ms" }}
      >
        + R$ 130,00
        <span className="font-medium text-income/80">diária na obra</span>
      </span>
    </div>
  );
}

export function EntryScreen() {
  const [mode, setMode] = useState<Mode>("entrar");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const focusForm = (next: Mode) => {
    setMode(next);
    setErro(null);
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => phoneRef.current?.focus(), 280);
  };

  const submit = async () => {
    setErro(null);
    const digits = onlyDigits(phone);
    if (digits.length < 10) {
      setErro("Digite o telefone com DDD.");
      return;
    }
    if (password.length < 6) {
      setErro("A senha precisa de pelo menos 6 caracteres.");
      return;
    }
    setBusy(true);
    try {
      const email = phoneToEmail(digits);
      if (mode === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { telefone: digits } },
        });
        if (error) throw error;
        if (!data.session) {
          const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
          if (loginError) throw loginError;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não deu para entrar.";
      console.error("Erro original do Supabase:", msg);
      setErro(msg);
    } finally {
      setBusy(false);
    }
  };

  const fieldClass =
    "flex items-center gap-2 rounded-xl border border-input bg-background px-3 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30";
  const labelClass =
    "mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60";

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* fundo em camadas (gradiente estático: sem blur animado, que pesa no GPU) */}
      <div
        aria-hidden
        className="ea-fade pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60% 45% at 8% 0%, oklch(0.65 0.12 255 / 0.16), transparent 70%)," +
            "radial-gradient(55% 40% at 100% 100%, oklch(0.72 0.14 155 / 0.12), transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-5 py-10 lg:grid-cols-[1.05fr_minmax(0,400px)] lg:items-start lg:gap-x-14 lg:gap-y-8 lg:py-16">
        {/* Abertura */}
        <section className="lg:col-start-1 lg:row-start-1">
          <div className="ea-pop">
            <BrandLockup markClassName="size-12 rounded-2xl" />
          </div>

          <h1
            className="ea-up mt-7 font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl"
            style={{ animationDelay: "80ms" }}
          >
            Seu dinheiro.
            <br />
            Seu controle.
          </h1>

          <p
            className="ea-up mt-4 max-w-sm text-sm text-muted-foreground sm:text-base"
            style={{ animationDelay: "150ms" }}
          >
            Registre, acompanhe e entenda o caixa de cada trabalho.
          </p>

          <div
            className="ea-up mt-7 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "220ms" }}
          >
            <button
              type="button"
              onClick={() => focusForm("entrar")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg transition-transform hover:brightness-110 active:scale-[0.98]"
            >
              Entrar
              <ArrowRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => focusForm("criar")}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold transition-colors hover:border-primary/40 hover:text-primary active:scale-[0.98]"
            >
              Começar agora
            </button>
          </div>
        </section>

        {/* Entrar / criar conta */}
        <section className="lg:sticky lg:top-10 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div
            ref={cardRef}
            className="ea-up rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-6"
            style={{ animationDelay: "120ms" }}
          >
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
              {mode === "entrar" ? "Acesse seu caixa" : "Crie sua conta"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Telefone e senha. Sem e-mail, sem burocracia.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
              {(["entrar", "criar"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setErro(null);
                  }}
                  aria-pressed={mode === m}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                    mode === m
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "entrar" ? "Entrar" : "Criar conta"}
                </button>
              ))}
            </div>

            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <label className="block">
                <span className={labelClass}>Telefone</span>
                <div className={fieldClass}>
                  <Phone className="size-4 text-muted-foreground/50" />
                  <input
                    ref={phoneRef}
                    value={maskPhone(phone)}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 90000-0000"
                    className="w-full bg-transparent py-2.5 text-sm tabular-nums outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              </label>

              <label className="block">
                <span className={labelClass}>Senha</span>
                <div className={fieldClass}>
                  <Lock className="size-4 text-muted-foreground/50" />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete={mode === "criar" ? "new-password" : "current-password"}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              </label>

              {erro ? <p className="text-sm font-medium text-expense">{erro}</p> : null}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === "entrar" ? "Entrar" : "Criar minha conta"}
              </button>
            </form>

            <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
              Seus lançamentos ficam salvos na sua conta e abrem em qualquer aparelho.
            </p>
          </div>
        </section>

        {/* Pilares + maquete do app */}
        <section className="lg:col-start-1 lg:row-start-2">
          <ul className="grid gap-3 sm:grid-cols-3">
            {PILLARS.map(({ Icon, title, text }, index) => (
              <li
                key={title}
                className="ea-up rounded-2xl border border-border bg-card p-4"
                style={{ animationDelay: `${300 + index * 70}ms` }}
              >
                <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <p className="mt-3 font-[family-name:var(--font-display)] text-sm font-bold">
                  {title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>

          <div className="ea-up mt-4" style={{ animationDelay: "540ms" }}>
            <ProductPreview />
          </div>
        </section>
      </div>
    </main>
  );
}
