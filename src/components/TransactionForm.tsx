import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  ChevronDown,
  Loader2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { brl, errorMessage, today, toNumber, type Entry, type Kind } from "@/lib/caixa";
import type { NewEntry } from "@/hooks/use-caixa";
import { primeAudio } from "@/lib/sfx";
import { cn } from "@/lib/utils";

interface TransactionFormProps {
  listName: string;
  daily: string;
  hourRate: string;
  onCreate: (input: NewEntry) => Promise<Entry>;
  onSavePerfil: (diaria: number, valorHora: number) => void;
  onLaunched: (entry: Entry) => void;
  onError: (msg: string | null) => void;
}

const SUGGESTIONS: Record<Kind, string[]> = {
  entrada: ["Diária", "Serviço", "Venda", "Extra"],
  saida: ["Alimentação", "Transporte", "Lazer", "Contas"],
};

const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60";
const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring/30";

export function TransactionForm({
  listName,
  daily,
  hourRate,
  onCreate,
  onSavePerfil,
  onLaunched,
  onError,
}: TransactionFormProps) {
  const [kind, setKind] = useState<Kind>("entrada");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [dailyLocal, setDailyLocal] = useState(daily);
  const [hourRateLocal, setHourRateLocal] = useState(hourRate);
  const [hours, setHours] = useState("");
  const [detail, setDetail] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!touched && kind === "entrada" && daily) setAmount(daily);
  }, [daily, kind, touched]);

  const extras = useMemo(() => toNumber(hours) * toNumber(hourRateLocal), [hours, hourRateLocal]);
  const extrasTotal = toNumber(dailyLocal) + extras;

  const switchKind = (next: Kind) => {
    setKind(next);
    setShowExtras(false);
    if (!touched) setAmount(next === "entrada" ? daily : "");
  };

  const applyExtras = () => {
    if (extrasTotal <= 0) return;
    setAmount(String(extrasTotal.toFixed(2)).replace(".", ","));
    setTouched(true);
    setDetail(
      extras > 0
        ? `Diária ${brl(toNumber(dailyLocal))} + ${hours}h × ${brl(toNumber(hourRateLocal))}`
        : undefined,
    );
    onSavePerfil(toNumber(dailyLocal), toNumber(hourRateLocal));
    toast.success(`${brl(extrasTotal)} aplicado no valor`);
  };

  const submit = async () => {
    const value = toNumber(amount);
    if (value <= 0) {
      onError("Informe um valor maior que zero para lançar.");
      return;
    }
    primeAudio();
    setBusy(true);
    onError(null);
    try {
      const entry = await onCreate({
        label: label.trim() || (kind === "entrada" ? "Recebimento" : "Gasto"),
        kind,
        amount: value,
        detail: kind === "entrada" ? detail : undefined,
        date: date || today(),
      });
      onLaunched(entry);
      setLabel("");
      setHours("");
      setTouched(false);
      setDetail(undefined);
      setAmount(kind === "entrada" ? daily : "");
    } catch (e) {
      onError(errorMessage(e, "Erro ao salvar lançamento. Tente novamente."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <header className="mb-4 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Wallet className="size-3.5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
            Novo lançamento
          </h2>
          <p className="truncate text-[11px] text-muted-foreground">{listName}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1 mb-4">
        {(
          [
            { id: "entrada" as Kind, text: "Receber", Icon: ArrowUpCircle },
            { id: "saida" as Kind, text: "Gastar", Icon: ArrowDownCircle },
          ] satisfies { id: Kind; text: string; Icon: typeof ArrowUpCircle }[]
        ).map(({ id, text, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchKind(id)}
            aria-pressed={kind === id}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all",
              kind === id
                ? id === "entrada"
                  ? "bg-income text-income-foreground shadow-sm"
                  : "bg-expense text-expense-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {text}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <label className="block">
          <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-4 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30">
            <span className="font-[family-name:var(--font-display)] text-xl font-bold text-muted-foreground/50">
              R$
            </span>
            <input
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setTouched(true);
                setDetail(undefined);
              }}
              onFocus={(e) => e.currentTarget.select()}
              inputMode="decimal"
              placeholder="0,00"
              aria-label="Valor"
              className={cn(
                "w-full bg-transparent py-4 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums outline-none placeholder:text-muted-foreground/30",
                kind === "entrada" ? "text-income" : "text-expense",
              )}
            />
          </div>
        </label>

        <label className="block">
          <span className={labelClass}>Descrição</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            placeholder={kind === "entrada" ? "Ex: Diária" : "Ex: Alimentação"}
            className={inputClass}
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS[kind].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setLabel(s)}
              className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowDate(!showDate)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Calendar className="size-4" />
            {showDate ? "Ocultar data" : "Alterar data"}
          </button>
          <span className="text-xs text-muted-foreground">{formatDate(date)}</span>
        </div>

        {showDate && (
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.value)}
            className={inputClass}
          />
        )}

        {kind === "entrada" ? (
          <div className="rounded-xl border border-border/70 bg-secondary/30">
            <button
              type="button"
              onClick={() => setShowExtras((p) => !p)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Diária + horas extras
              <ChevronDown
                className={cn("size-3.5 transition-transform", showExtras && "rotate-180")}
              />
            </button>
            {showExtras ? (
              <div className="space-y-3 border-t border-border/70 px-3 py-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className={labelClass}>Diária (R$)</span>
                    <input
                      value={dailyLocal}
                      onChange={(e) => setDailyLocal(e.target.value)}
                      inputMode="decimal"
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Valor/hora (R$)</span>
                    <input
                      value={hourRateLocal}
                      onChange={(e) => setHourRateLocal(e.target.value)}
                      inputMode="decimal"
                      placeholder="0,00"
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className={labelClass}>Horas extras</span>
                  <input
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    className={inputClass}
                  />
                </label>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Total:{" "}
                    <span className="font-semibold tabular-nums text-income">
                      {brl(extrasTotal)}
                    </span>
                    {extras > 0 ? ` (extras ${brl(extras)})` : ""}
                  </p>
                  <button
                    type="button"
                    onClick={applyExtras}
                    className="shrink-0 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                  >
                    Usar valor
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-transform active:scale-[0.99] disabled:opacity-60",
            kind === "entrada"
              ? "bg-income text-income-foreground hover:brightness-110"
              : "bg-expense text-expense-foreground hover:brightness-110",
          )}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {kind === "entrada" ? "+ Lançar receita" : "+ Lançar despesa"}
        </button>
      </div>
    </section>
  );
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
