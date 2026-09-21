-- ============================================================
-- TABELAS PRINCIPAIS - Supabase Setup
-- Execute este script primeiro no SQL Editor do Supabase
-- ============================================================

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

-- Tabela de perfis dos usuários
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID NOT NULL PRIMARY KEY,
  telefone TEXT,
  diaria NUMERIC(12,2) NOT NULL DEFAULT 130,
  valor_hora NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de listas (caixas/cartelas)
CREATE TABLE IF NOT EXISTS public.listas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de metas financeiras
CREATE TABLE IF NOT EXISTS public.metas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  valor_alvo NUMERIC(12,2) NOT NULL CHECK (valor_alvo > 0),
  valor_atual NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_atual >= 0),
  data_limite DATE,
  concluida BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
