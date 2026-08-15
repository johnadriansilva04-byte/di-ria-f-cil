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
            emailConfirm: false
          },
        });
        if (error) throw error;
        // Login automático após criar conta (só se tiver sessão)
        if (data.session) {
          // Já está logado, não precisa fazer login novamente
        } else {
          const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
          if (loginError) throw loginError;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não deu para entrar.";
      // Traduzir erros do Supabase para português
      if (/already registered|already been registered/i.test(msg)) {
        setErro("Esse telefone já tem conta. Use “Entrar”.");
      } else if (/Invalid login credentials/i.test(msg)) {
        setErro("Telefone ou senha errados.");
      } else if (/pwned|weak/i.test(msg)) {
        setErro("Essa senha é muito fácil. Escolha outra.");
      } else if (/Email not confirmed/i.test(msg)) {
        setErro("Conta não confirmada. Entre em contato com o suporte.");
      } else if (/User already registered/i.test(msg)) {
        setErro("Esse telefone já tem conta. Use “Entrar”.");
      } else if (/signup_disabled|Signups not allowed/i.test(msg)) {
        setErro("Cadastro desabilitado no sistema. Entre em contato com o suporte.");
      } else if (/rate limit exceeded/i.test(msg)) {
        setErro("Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.");
      } else if (/email address/i.test(msg) && /invalid/i.test(msg)) {
        setErro("Telefone inválido. Verifique o número digitado.");
      } else if (/password/i.test(msg) && /too short/i.test(msg)) {
        setErro("A senha precisa de pelo menos 6 caracteres.");
      } else {
        // Se não reconhecer o erro, mostra mensagem genérica em português
        console.error("Erro de autenticação:", msg);
        setErro("Erro ao entrar. Tente novamente.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-7 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Wallet className="size-6" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            Caixa do Dia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre com seu telefone e senha para salvar seus lançamentos.
          </p>
        </header>

        <section
          className="rounded-3xl border border-border bg-card p-5 sm:p-6"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1.5">
            {(["entrar", "criar"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setErro(null);
                }}
                className={`rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
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
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Telefone
              </span>
              <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
                <Phone className="size-4 text-muted-foreground" />
                <input
                  value={maskPhone(phone)}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 90000-0000"
                  className="w-full bg-transparent py-3 text-base tabular-nums outline-none placeholder:text-muted-foreground/70"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Senha
              </span>
              <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
                <Lock className="size-4 text-muted-foreground" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete={mode === "criar" ? "new-password" : "current-password"}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground/70"
                />
              </div>
            </label>

            {erro ? <p className="text-sm font-medium text-expense">{erro}</p> : null}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-base font-bold text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "entrar" ? "Entrar" : "Criar minha conta"}
            </button>
          </form>
        </section>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Seus lançamentos ficam salvos na sua conta e aparecem em qualquer aparelho.
        </p>
      </div>
    </main>
  );
}