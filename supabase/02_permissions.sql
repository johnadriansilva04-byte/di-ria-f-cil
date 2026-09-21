-- ============================================================
-- PERMISSÕES E RLS (Row Level Security)
-- Execute este script após criar as tabelas
-- ============================================================

-- Permissões para lancamentos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos TO authenticated;
GRANT ALL ON public.lancamentos TO service_role;

-- Permissões para perfis
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;

-- Permissões para listas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listas TO authenticated;
GRANT ALL ON public.listas TO service_role;

-- Permissões para metas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas TO authenticated;
GRANT ALL ON public.metas TO service_role;

-- Habilitar RLS
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

-- RLS para lancamentos
DROP POLICY IF EXISTS "Usuario gerencia seus lancamentos" ON public.lancamentos;
CREATE POLICY "Usuario gerencia seus lancamentos" ON public.lancamentos FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS para perfis
DROP POLICY IF EXISTS "Usuario gerencia seu perfil" ON public.perfis;
CREATE POLICY "Usuario gerencia seu perfil" ON public.perfis FOR ALL TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- RLS para listas
DROP POLICY IF EXISTS "Usuario gerencia suas listas" ON public.listas;
CREATE POLICY "Usuario gerencia suas listas" ON public.listas FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS para metas
DROP POLICY IF EXISTS "Usuario gerencia suas metas" ON public.metas;
CREATE POLICY "Usuario gerencia suas metas" ON public.metas FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
