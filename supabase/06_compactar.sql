-- 06_compactar.sql
-- Compactação de dados: cada mês antigo de cada lista vira NO MÁXIMO 2 linhas
-- (resumo de entradas + resumo de saídas) e os lançamentos brutos são apagados.
-- A tabela de lancamentos é a que mais cresce: toda carga do app lê as linhas
-- do usuário inteiras, então enxugá-la deixa tudo mais leve — menos linhas para
-- buscar, menos WAL e menos realtime por edição em massa.
--
-- Regras:
--   - só meses INTEIRAMENTE anteriores ao corte (p_dias);
--   - resumo marcado com detalhe = 'resumo mensal' e nunca é reprocessado;
--   - pernas de distribuição (transferência) continuam brutas, para os KPIs
--     continuarem separando movimentação interna de gasto de verdade;
--   - resultado (entradas, saídas, saldo) permanece idêntico.
--
-- Rode no SQL Editor do Supabase. Irreversível: o bruto não volta.

create or replace function public.compactar_lancamentos(p_dias integer default 180)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_corte date := (current_date - p_dias);
  v_lista uuid;
  v_mes date;
  v_entradas numeric := 0;
  v_saidas numeric := 0;
  v_total integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Nenhum usuário autenticado';
  end if;

  for v_lista, v_mes in
    select lista_id, date_trunc('month', data)::date
    from public.lancamentos
    where user_id = auth.uid()
      and lista_id is not null
      -- mês inteiro antes do corte: nunca compacta meio mês (daria soma duplicada)
      and date_trunc('month', data) + interval '1 month' <= v_corte
      and coalesce(detalhe, '') <> 'resumo mensal'
      and coalesce(detalhe, '') not like '%transferência%'
    group by 1, 2
    order by 1, 2
  loop
    -- já existe resumo deste mês nesta lista? (é idempotente)
    if exists (
      select 1
      from public.lancamentos
      where user_id = auth.uid()
        and lista_id = v_lista
        and detalhe = 'resumo mensal'
        and data between v_mes and (v_mes + interval '1 month - 1 day')::date
    ) then
      continue;
    end if;

    select coalesce(sum(case when tipo = 'entrada' then valor end), 0),
           coalesce(sum(case when tipo = 'saida' then valor end), 0)
    into v_entradas, v_saidas
    from public.lancamentos
    where user_id = auth.uid()
      and lista_id = v_lista
      and date_trunc('month', data)::date = v_mes
      and coalesce(detalhe, '') <> 'resumo mensal'
      and coalesce(detalhe, '') not like '%transferência%';

    if v_entradas > 0 then
      insert into public.lancamentos (user_id, lista_id, data, descricao, tipo, valor, detalhe)
      values (auth.uid(), v_lista,
              (v_mes + interval '1 month - 1 day')::date,
              'Arquivo ' || to_char(v_mes, 'YYYY-MM'),
              'entrada', v_entradas, 'resumo mensal');
    end if;

    if v_saidas > 0 then
      insert into public.lancamentos (user_id, lista_id, data, descricao, tipo, valor, detalhe)
      values (auth.uid(), v_lista,
              (v_mes + interval '1 month - 1 day')::date,
              'Arquivo ' || to_char(v_mes, 'YYYY-MM'),
              'saida', v_saidas, 'resumo mensal');
    end if;

    -- Só o que entrou na soma sai da tabela (bruto apagado de vez).
    delete from public.lancamentos
    where user_id = auth.uid()
      and lista_id = v_lista
      and date_trunc('month', data)::date = v_mes
      and coalesce(detalhe, '') <> 'resumo mensal'
      and coalesce(detalhe, '') not like '%transferência%';

    v_total := v_total + 1;
  end loop;

  return v_total;
end;
$$;

revoke execute on function public.compactar_lancamentos(integer) from anon, PUBLIC;
grant execute on function public.compactar_lancamentos(integer) to authenticated;