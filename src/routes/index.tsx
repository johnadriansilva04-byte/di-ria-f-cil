import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Trash2, Wallet } from "lucide-react";

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

type Kind = "entrada" | "saida";

type Entry = {
  id: string;
  date: string;
  label: string;
  kind: Kind;
  amount: number;
  detail?: string;
};

const STORAGE_KEY = "caixa-do-dia-v1";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const today = () => new Date().toISOString().slice(0, 10);

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const toNumber = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function Index() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [kind, setKind] = useState<Kind>("entrada");
  const [label, setLabel] = useState("");
  const [daily, setDaily] = useState("130");
  const [hours, setHours] = useState("");
  const [hourRate, setHourRate] = useState("");
  const [expense, setExpense] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { entries?: Entry[]; daily?: string; hourRate?: string };
        if (parsed.entries) setEntries(parsed.entries);
        if (parsed.daily) setDaily(parsed.daily);
        if (parsed.hourRate) setHourRate(parsed.hourRate);
      }
    } catch {
      /* ignora dados inválidos */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, daily, hourRate }));
  }, [entries, daily, hourRate, loaded]);

  const extras = toNumber(hours) * toNumber(hourRate);
  const entradaTotal = toNumber(daily) + extras;

  const totals = useMemo(() => {
    const inc = entries.filter((e) => e.kind === "entrada").reduce((s, e) => s + e.amount, 0);
    const out = entries.filter((e) => e.kind === "saida").reduce((s, e) => s + e.amount, 0);
    return { inc, out, saldo: inc - out };
  }, [entries]);

  const add = () => {
    const amount = kind === "entrada" ? entradaTotal : toNumber(expense);
    if (amount <= 0) return;
    const detail =
      kind === "entrada" && extras > 0
        ? `Diária ${brl(toNumber(daily))} + ${hours}h x ${brl(toNumber(hourRate))}`
        : undefined;
    setEntries((prev) => [
      {
        id: crypto.randomUUID(),
        date: today(),
        label: label.trim() || (kind === "entrada" ? "Diária" : "Gasto"),
        kind,
        amount,
        detail,
      },
      ...prev,
    ]);
    setLabel("");
    setHours("");
    setExpense("");
  };

  return (
    <main className="flex min-h-screen justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-xl">
        <header className="mb-7 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Wallet className="size-6" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
            Caixa do Dia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Anote o que entrou e o que saiu. A data é automática.
          </p>
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
              onClick={add}
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

          {entries.length === 0 ? (
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
                    onClick={() => setEntries((prev) => prev.filter((x) => x.id !== e.id))}
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
          Seus dados ficam salvos neste aparelho.
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
