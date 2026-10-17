-- 05_envelopes.sql
-- Hierarquia caixa → mini caixas (envelopes):
--   parent_id null  = caixa raiz (entra todo o dinheiro)
--   parent_id = id  = envelope daquele caixa (Aluguel, Moto, Gasolina, ...)
--
-- Rode no SQL Editor do Supabase.

alter table public.listas
  add column if not exists parent_id uuid references public.listas(id) on delete cascade;

-- Leitura das filhas de um caixa (sidebar e cartão de envelopes)
create index if not exists listas_parent_idx on public.listas (user_id, parent_id);

-- Realtime: criação/apelido de envelope é aplicado na hora em todos os aparelhos
do $$
begin
  alter publication supabase_realtime add table public.listas;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;