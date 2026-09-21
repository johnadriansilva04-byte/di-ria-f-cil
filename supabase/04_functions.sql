-- ============================================================
-- FUNÇÕES E TRIGGERS
-- Execute este script por último
-- ============================================================

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

-- Revogar permissão de execução da função por segurança
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- Tempo real: o app se atualiza quando o lançamento vem de outro aparelho
ALTER TABLE public.lancamentos REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.lancamentos;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Troféu conquistado em outro aparelho aparece aqui na hora
ALTER TABLE public.conquistas REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conquistas;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- EXCLUSÃO DA PRÓPRIA CONTA (tudo do usuário sai do banco)
-- ============================================================
CREATE OR REPLACE FUNCTION public.excluir_minha_conta()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário autenticado';
  END IF;

  DELETE FROM public.lancamentos WHERE user_id = uid;
  DELETE FROM public.listas WHERE user_id = uid;
  DELETE FROM public.conquistas WHERE user_id = uid;
  DELETE FROM public.metas WHERE user_id = uid;
  DELETE FROM public.perfis WHERE id = uid;
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.excluir_minha_conta() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.excluir_minha_conta() TO authenticated;

-- Função para atualizar timestamp de metas
CREATE OR REPLACE FUNCTION public.update_meta_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_meta_timestamp_trigger ON public.metas;
CREATE TRIGGER update_meta_timestamp_trigger
BEFORE UPDATE ON public.metas
FOR EACH ROW
EXECUTE FUNCTION public.update_meta_timestamp();
