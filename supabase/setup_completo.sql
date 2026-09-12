-- SQL Completo para setup do Diária Fácil no Supabase
-- Execute este script no SQL Editor do Supabase

-- Tabela de lançamentos (entradas e saídas)
CREATE TABLE IF NOT EXISTS public.lancamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data DATE NOT NULL DEFAULT (now()::date),
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  detalhe TEXT,
  lista_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Permissões para lancamentos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos TO authenticated;
GRANT ALL ON public.lancamentos TO service_role;

-- RLS para lancamentos
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuario gerencia seus lancamentos" ON public.lancamentos;
CREATE POLICY "Usuario gerencia seus lancamentos" ON public.lancamentos FOR ALL TO authenticated 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Índice para performance
CREATE INDEX IF NOT EXISTS lancamentos_user_data_idx ON public.lancamentos (user_id, data DESC);

-- Tabela de perfis dos usuários
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID NOT NULL PRIMARY KEY,
  telefone TEXT,
  diaria NUMERIC(12,2) NOT NULL DEFAULT 130,
  valor_hora NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Permissões para perfis
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;

-- RLS para perfis
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuario gerencia seu perfil" ON public.perfis;
CREATE POLICY "Usuario gerencia seu perfil" ON public.perfis FOR ALL TO authenticated 
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (id, telefone)
  VALUES (NEW.id, COALESCE(NEW.phone, NEW.raw_user_meta_data->>'telefone'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger para chamar a função automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Adicionar coluna lista_id para suporte a múltiplas carteiras
ALTER TABLE public.lancamentos ADD COLUMN IF NOT EXISTS lista_id UUID NULL;

-- Revogar permissão de execução da função por segurança
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- ============================================================
-- LISTAS (caixas) independentes
-- ============================================================
-- Cada lista (Meu Trabalho, Pizzaria, ...) é uma linha real aqui e
-- cada lançamento carrega seu lista_id. É isso que isola os dados:
-- sem lista_id o lançamento aparecia em todas as listas.
--
-- Quem já tem lançamentos antigos (lista_id nulo) recebe uma lista
-- "Meu Trabalho" e esses lançamentos são adotados por ela. Nada é apagado.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.listas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listas TO authenticated;
GRANT ALL ON public.listas TO service_role;

ALTER TABLE public.listas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuario gerencia suas listas" ON public.listas;
CREATE POLICY "Usuario gerencia suas listas" ON public.listas FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS listas_user_created_idx ON public.listas (user_id, created_at);
CREATE INDEX IF NOT EXISTS lancamentos_lista_idx ON public.lancamentos (user_id, lista_id, data DESC);
CREATE INDEX IF NOT EXISTS lancamentos_user_idx ON public.lancamentos (user_id, data DESC);

-- Ao excluir uma lista, os lançamentos dela vão junto
ALTER TABLE public.lancamentos DROP CONSTRAINT IF EXISTS lancamentos_lista_id_fkey;
ALTER TABLE public.lancamentos ADD CONSTRAINT lancamentos_lista_id_fkey
  FOREIGN KEY (lista_id) REFERENCES public.listas (id) ON DELETE CASCADE;

-- Lançamentos antigos passam a pertencer à lista do usuário
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

-- Tempo real: o app se atualiza quando o lançamento vem de outro aparelho
ALTER TABLE public.lancamentos REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.lancamentos;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
