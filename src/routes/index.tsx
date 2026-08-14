import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, LogOut, Trash2, Wallet } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthTelefone } from "@/components/AuthTelefone";
import {
  brl,
  deleteEntry,
  fetchEntries,
  fetchPerfil,
  formatDate,
  insertEntry,
  maskPhone,
  savePerfil,
  toNumber,
  type Entry,
  type Kind,
} from "@/lib/caixa";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Caixa do Dia | Diária, horas extras e gastos" },
      {
        name: "description",
        content:
          "Anote quanto recebeu no dia, horas extras e gastos. A data entra automática e o total soma sozinho.",
      },
      { property: "og:title", content: "Caixa do Dia" },
      {
        property: "og:description",
        content: "Controle de diária, horas extras e gastos em uma tela só.",
      },
    ],
  }),
  component: Index,
});

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
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  if (!session) return <AuthTelefone />;

  return <Caixa session={session} />;
}

function Caixa({ session }: { session: Session }) {
  const userId = session.user.id;
  const telefone = (session.user.user_metadata?.["telefone"] as string | undefined) ?? "";

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [kind, setKind] = useState<Kind>("entrada");
  const [label, setLabel] = useState("");
  const [daily, setDaily] = useState("130");
  const [hours, setHours] = useState("");
  const [hourRate, setHourRate] = useState("");
  const [expense, setExpense] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [list, perfil] = await Promise.all([fetchEntries(), fetchPerfil(userId)]);
        if (!alive) return;
        setEntries(list);
        if (perfil) {
          setDaily(String(perfil.diaria));
          if (perfil.valorHora > 0) setHourRate(String(perfil.valorHora));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        console.error("Erro ao carregar dados:", msg);
        if (alive) setErro("Erro ao carregar dados. Tente novamente.");
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      void savePerfil(userId, toNumber(daily), toNumber(hourRate)).catch(() => undefined);
    }, 700);
    return () => clearTimeout(t);
  }, [daily, hourRate, loaded, userId]);

  const extras = toNumber(hours) * toNumber(hourRate);
  const entradaTotal = toNumber(daily) + extras;

  const totals = useMemo(() => {
    const inc = entries.filter((e) => e.kind === "entrada").reduce((s, e) => s + e.amount, 0);
    const out = entries.filter((e) => e.kind === "saida").reduce((s, e) => s + e.amount, 0);
    return { inc, out, saldo: inc - out };
  }, [entries]);

  const add = async () => {
    const amount = kind === "entrada" ? entradaTotal : toNumber(expense);
    if (amount <= 0) return;
    const detail =
      kind === "entrada" && extras > 0
        ? `Diária ${brl(toNumber(daily))} + ${hours}h x ${brl(toNumber(hourRate))}`
        : undefined;
    try {
      setErro(null);
      const entry = await insertEntry({
        userId,
        label: label.trim() || (kind === "entrada" ? "Diária" : "Gasto"),
        kind,
        amount,
        detail,
      });
      setEntries((prev) => [entry, ...prev]);
      setLabel("");
      setHours("");
      setExpense("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      console.error("Erro ao salvar lançamento:", msg);
      setErro("Erro ao salvar lançamento. Tente novamente.");
    }
  };

  const remove = async (id: string) => {
    const before = entries;
    setEntries((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteEntry(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      console.error("Erro ao apagar lançamento:", msg);
      setEntries(before);
      setErro("Erro ao apagar lançamento. Tente novamente.");
    }
  };

  return (
    <main className="flex min-h-screen justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-xl">
        <header className="mb-7 text-center">
          <div className="mb-4 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {telefone ? maskPhone(telefone) : "Minha conta"}
            </span>
            <button
              type="button"
              onClick={() => void supabase.auth.signOut()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="size-3.5" /> Sair
            </button>
          </div>
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Wallet className="size-6" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
            Caixa do Dia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Anote o que entrou e o que saiu. A data é automática.
          </p>
          {erro ? <p className="mt-2 text-sm font-medium text-expense">{erro}</p> : null}
        </header>

        {/* Saldo */}
        <section
          className="rounded-3xl border border-border p-6 text-center"
          style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-elegant)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Saldo em caixa
          </p>
          <p
            className={`mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums sm:text-5xl ${
              totals.saldo < 0 ? "text-expense" : "text-primary"
            }`}
          >
            {brl(totals.saldo)}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-background/40 px-3 py-3">
              <p className="text-xs text-muted-foreground">Recebido</p>
              <p className="font-semibold tabular-nums text-income">{brl(totals.inc)}</p>
            </div>
            <div className="rounded-2xl bg-background/40 px-3 py-3">
              <p className="text-xs text-muted-foreground">Gasto</p>
              <p className="font-semibold tabular-nums text-expense">{brl(totals.out)}</p>
            </div>
          </div>
        </section>

        {/* Lançamento */}
        <section
          className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-6"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1.5">
            <button
              type="button"
              onClick={() => setKind("entrada")}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                kind === "entrada"
                  ? "bg-income text-income-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowUpCircle className="size-4" /> Recebi
            </button>
            <button
              type="button"
              onClick={() => setKind("saida")}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                kind === "saida"
                  ? "bg-expense text-expense-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowDownCircle className="size-4" /> Gastei
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <Field label={kind === "entrada" ? "Do que é (serviço, obra...)" : "Do que foi o gasto"}>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={kind === "entrada" ? "Ex: Diária na obra" : "Ex: Material, almoço"}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </Field>

            {kind === "entrada" ? (
              <>
                <Field label="Valor da diária (R$)">
                  <input
                    value={daily}
                    onChange={(e) => setDaily(e.target.value)}
                    inputMode="decimal"
                    className="w-full rounded-xl border border-input bg-background px-4 py-4 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Horas extras">
                    <input
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                  </Field>
                  <Field label="Valor da hora (R$)">
                    <input
                      value={hourRate}
                      onChange={(e) => setHourRate(e.target.value)}
                      inputMode="decimal"
                      placeholder="0,00"
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                  </Field>
                </div>
                <p className="text-sm text-muted-foreground">
                  Total do dia:{" "}
                  <span className="font-semibold text-income tabular-nums">
                    {brl(entradaTotal)}
                  </span>
                  {extras > 0 ? ` (extras ${brl(extras)})` : ""}
                </p>
              </>
            ) : (
              <Field label="Valor gasto (R$)">
                <input
                  value={expense}
                  onChange={(e) => setExpense(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full rounded-xl border border-input bg-background px-4 py-4 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </Field>
            )}

            <button
              type="button"
              onClick={() => void add()}
              className={`w-full rounded-xl px-4 py-4 text-base font-bold transition-transform active:scale-[0.99] ${
                kind === "entrada"
                  ? "bg-income text-income-foreground"
                  : "bg-expense text-expense-foreground"
              }`}
            >
              {kind === "entrada" ? "Lançar recebimento" : "Lançar gasto"}
            </button>
          </div>
        </section>

        {/* Tabela */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
              Lançamentos
            </h2>
            <span className="text-xs text-muted-foreground">{entries.length} registro(s)</span>
          </div>

          {!loaded ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : entries.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Nenhum lançamento ainda. Comece registrando sua diária.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(e.date)}
                      {e.detail ? ` • ${e.detail}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-semibold tabular-nums ${
                      e.kind === "entrada" ? "text-income" : "text-expense"
                    }`}
                  >
                    {e.kind === "entrada" ? "+" : "-"} {brl(e.amount)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Apagar ${e.label}`}
                    onClick={() => void remove(e.id)}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-expense"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-border bg-secondary/40 px-5 py-4">
            <span className="text-sm font-semibold">Total a receber / saldo</span>
            <span
              className={`font-[family-name:var(--font-display)] text-lg font-bold tabular-nums ${
                totals.saldo < 0 ? "text-expense" : "text-income"
              }`}
            >
              {brl(totals.saldo)}
            </span>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Seus dados ficam salvos na sua conta.
        </p>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
