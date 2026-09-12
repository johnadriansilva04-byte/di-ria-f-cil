import { useState } from "react";
import { BarChart3, Layers, Loader2, Lock, Phone, Wallet, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { maskPhone, onlyDigits, phoneToEmail } from "@/lib/caixa";

const BENEFITS = [
  {
    Icon: Zap,
    title: "Lançamento em segundos",
    text: "Receber ou gastar: descrição, valor e pronto.",
  },
  {
    Icon: Layers,
    title: "Listas independentes",
    text: "Meu Trabalho e Pizzaria com saldos separados.",
  },
  {
    Icon: BarChart3,
    title: "Extrato e gráfico",
    text: "Cada lista com o próprio extrato e histórico.",
  },
];

export function AuthTelefone() {
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 size-80 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 right-0 size-96 rounded-full bg-income/10 blur-3xl"
      />

      <div className="relative grid w-full max-w-4xl items-center gap-10 lg:grid-cols-[1.05fr_minmax(0,380px)]">
        {/* Apresentação */}
        <section className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Wallet className="size-5" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Caixa do Dia
            </span>
          </div>

          <h1 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            O caixa de cada trabalho,
            <br className="hidden sm:block" /> separado e na mão.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground lg:mx-0">
            Você lança, o app organiza. Nada de banco, cartão ou extrato automático — só os valores
            que você digitou, com saldo, extrato e gráfico por lista.
          </p>

          <ul className="mx-auto mt-7 max-w-md space-y-3 text-left lg:mx-0">
            {BENEFITS.map(({ Icon, title, text }) => (
              <li
                key={title}
                className="flex items-start gap-3 rounded-xl border border-border bg-card/70 px-4 py-3 backdrop-blur"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-3.5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-xs text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Entrar / criar conta */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-lg sm:p-6">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
            {(["entrar", "criar"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setErro(null);
                }}
                aria-pressed={mode === m}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Telefone
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30">
                <Phone className="size-4 text-muted-foreground/50" />
                <input
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
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Senha
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30">
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

          <p className="mt-5 text-center text-xs text-muted-foreground/60">
            Seus lançamentos ficam salvos na sua conta e aparecem em qualquer aparelho.
          </p>
        </section>
      </div>
    </main>
  );
}
