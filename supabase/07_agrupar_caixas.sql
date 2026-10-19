-- 07_agrupar_caixas.sql
-- CORREÇÃO DE HIERARQUIA: caixa principal → envelopes.
--
-- Problema: o app tratava cada item de "Minhas listas" como um caixa principal
-- independente (Minha Dívida, Pizzaria SH, Gasolina e óleo, Bobagens, Dívida R).
-- Na verdade todos são UMA única contabilidade.
--
-- Correção: as listas soltas viram ENVELOPES (parent_id) de um único caixa
-- principal. Nenhum lançamento, saldo, data ou descrição é tocado — só o
-- relacionamento entre as listas muda.
--
-- Seguro por construção:
--   * só mexe em usuários que TÊM uma lista chamada "Minha Dívida" (a raiz
--     preferida); os demais usuários ficam intocados;
--   * envelopes que já existem (parent_id preenchido) não são movidos;
--   * idempotente: rodar de novo não muda nada;
--   * reversível: o parent_id anterior fica salvo em listas_parent_backup.
--
-- Rode no SQL Editor do Supabase.

-- 1) Coluna de hierarquia (idempotente; mesmo conteúdo do 05_envelopes.sql).
alter table public.listas
  add column if not exists parent_id uuid references public.listas(id) on delete cascade;

create index if not exists listas_parent_idx on public.listas (user_id, parent_id);

-- 2) Backup reversível: guarda o parent_id de hoje antes de qualquer mudança.
create table if not exists public.listas_parent_backup (
  lista_id uuid primary key,
  parent_id_anterior uuid,
  migrado_em timestamptz not null default now()
);

-- O backup não é dado de app: ninguém precisa lê-lo pela API. RLS ligado e
-- sem policies (nem grants para anon/authenticated) fecha a leitura pública.
alter table public.listas_parent_backup enable row level security;
revoke all on public.listas_parent_backup from anon, authenticated;

insert into public.listas_parent_backup (lista_id, parent_id_anterior)
select l.id, l.parent_id
  from public.listas l
 where l.parent_id is null
on conflict (lista_id) do nothing;

-- 3) Agrupamento: para cada usuário que tenha um caixa "Minha Dívida", esse
--    caixa é a raiz e os envelopes nomeados abaixo passam a pertencer a ele.
--    A comparação ignora acento/caixa ("Minha Divida" == "Minha Dívida").
--    Listas raiz que NÃO estão na lista (ex.: caixas criados pelo usuário)
--    ficam intocadas — continuam sendo caixas principais independentes.
do $$
declare
  v_afetadas integer;
begin
  update public.listas l
     set parent_id = raiz.id
    from (
      select user_id, id
        from public.listas
       where parent_id is null
         and translate(lower(nome), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = 'minha divida'
    ) as raiz
   where l.user_id = raiz.user_id
     and l.parent_id is null
     and l.id <> raiz.id
     and translate(lower(l.nome), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
         in ('pizzaria sh', 'gasolina e oleo', 'bobagens', 'divida r');

  get diagnostics v_afetadas = row_count;
  raise notice 'Listas agrupadas como envelopes: %', v_afetadas;
end $$;

-- 4) Conferência: como ficou a hierarquia de cada caixa principal.
--    Rode este select para validar (raiz = null em parent_id).
-- select p.nome as caixa_principal, f.nome as envelope
--   from public.listas f
--   join public.listas p on p.id = f.parent_id
--  order by p.nome, f.nome;

-- 5) Reversão (só se precisar desfazer):
-- update public.listas l
--    set parent_id = b.parent_id_anterior
--   from public.listas_parent_backup b
--  where l.id = b.lista_id;
