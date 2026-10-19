<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Project notes (Diária Fácil / Easy Account)

Stack: React 19 + TanStack Router/Start, Vite, Tailwind v4, Supabase (Postgres).

### Modelo de dados (hierarquia caixa → envelopes)

- `public.listas`: cada linha é um caixa OU um envelope.
  - `parent_id IS NULL` → **caixa principal** (unidade independente, criada por "Nova lista").
  - `parent_id IS NOT NULL` → **envelope** (categoria interna) do caixa apontado.
- `public.lancamentos`: movimentação presa a uma lista (`lista_id`). Nunca
  pertence a duas listas; o envelope é a lista onde o lançamento nasceu.
- A coluna `parent_id` vem do `supabase/05_envelopes.sql`. Se ela não existir no
  banco, `fetchLists` cai no `select *` e todas as listas viram raiz — foi
  exatamente o bug corrigido pelo `supabase/07_agrupar_caixas.sql`.

### Regras de agregação (src/lib/caixa.ts)

- `rootsOf` / `familyIds` / `familyEntriesOf`: navegação da hierarquia.
- `totalsByList`: saldo bruto por lista (o que nasceu na lista).
- `totalsByRoot`: saldo do caixa **consolidado** (caixa + envelopes), ignorando
  pernas de `transferência` para não contar o mesmo valor duas vezes.
- "Distribuir" gera 2 lançamentos (saída no caixa + entrada no envelope) marcados
  com `MARCA_TRANSFERENCIA`; `semTransferencias` os remove dos KPIs globais.

### Apresentação (src/components)

- `AllocationBar`: faixa proporcional do caixa = livre + envelopes. O todo é a
  soma dos módulos (`alocacaoDoCaixa`), então fecha 100% sem duplicar nada.
- `Sparkline`: SVG puro do saldo acumulado (`balanceTrend`) nos cartões de caixa
  e no hero da Home.
- `HomeDonutChart`: seletor de métrica (Resultado / Receitas / Gastos) — cada
  fatia usa **uma** régua só, nunca mistura métricas.
- `src/lib/palette.ts`: paleta única dos gráficos (`corDoIndice`, `COR_LIVRE`).

### Comandos

- `npm install` (o lock oficial é `bun.lock`; não commite mudanças em `package-lock.json`)
- `npx tsc --noEmit`, `npx eslint .`, `npm run build`
- Não há runner de testes configurado; a validação foi feita com um harness
  temporário que importa `src/lib/caixa.ts` diretamente (helpers puros) e
  renderiza os componentes com `react-dom/server` + um loader TS/TSX.

### Cuidados

- Projeto conectado ao Lovable: **não** reescrever histórico já publicado
  (force push / rebase / amend em commits enviados).

