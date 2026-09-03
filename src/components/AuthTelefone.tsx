import { useState } from "react";
import { Loader2, Lock, Phone, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { maskPhone, onlyDigits, phoneToEmail } from "@/lib/caixa";

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
          options: {
            data: { telefone: digits },
          },
        });
        if (error) throw error;
        if (data.session) {
          // Already logged in
        } else {
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (loginError) throw loginError;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
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
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-7 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="size-5" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            Caixa do Dia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre com seu telefone e senha para salvar seus lançamentos.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
            {(["entrar", "criar"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setErro(null);
                }}
                className={`rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground"
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
                  autoComplete={
                    mode === "criar" ? "new-password" : "current-password"
                  }
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground/50"
                />
              </div>
            </label>

            {erro ? (
              <p className="text-sm font-medium text-expense">{erro}</p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "entrar" ? "Entrar" : "Criar minha conta"}
            </button>
          </form>
        </section>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          Seus lançamentos ficam salvos na sua conta e aparecem em qualquer
          aparelho.
        </p>
      </div>
    </main>
  );
}
