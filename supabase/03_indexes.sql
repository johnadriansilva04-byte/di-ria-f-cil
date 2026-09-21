-- ============================================================
-- ÍNDICES E CHAVES ESTRANGEIRAS
-- Execute este script após configurar permissões
-- ============================================================

-- Índices para performance
CREATE INDEX IF NOT EXISTS lancamentos_user_data_idx ON public.lancamentos (user_id, data DESC);
CREATE INDEX IF NOT EXISTS lancamentos_lista_idx ON public.lancamentos (user_id, lista_id, data DESC);
CREATE INDEX IF NOT EXISTS lancamentos_user_idx ON public.lancamentos (user_id, data DESC);
CREATE INDEX IF NOT EXISTS listas_user_created_idx ON public.listas (user_id, created_at);
CREATE INDEX IF NOT EXISTS metas_user_idx ON public.metas (user_id, created_at DESC);

-- Chaves estrangeiras
-- Ao excluir uma lista, os lançamentos dela vão junto
ALTER TABLE public.lancamentos DROP CONSTRAINT IF EXISTS lancamentos_lista_id_fkey;
ALTER TABLE public.lancamentos ADD CONSTRAINT lancamentos_lista_id_fkey
  FOREIGN KEY (lista_id) REFERENCES public.listas (id) ON DELETE CASCADE;

-- Migração de lançamentos antigos para listas
DO $$
DECLARE
  r RECORD;
  destino UUID;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.lancamentos WHERE lista_id IS NULL LOOP
    SELECT id INTO destino
      FROM public.listas
     WHERE user_id = r.user_id
     ORDER BY created_at ASC
     LIMIT 1;

    IF destino IS NULL THEN
      INSERT INTO public.listas (user_id, nome)
      VALUES (r.user_id, 'Meu Trabalho')
      RETURNING id INTO destino;
    END IF;

    UPDATE public.lancamentos
       SET lista_id = destino
     WHERE user_id = r.user_id AND lista_id IS NULL;
  END LOOP;
END $$;
