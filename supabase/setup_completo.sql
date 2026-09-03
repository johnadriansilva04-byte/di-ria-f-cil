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
