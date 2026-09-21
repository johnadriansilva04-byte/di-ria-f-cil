# Supabase Setup - Easy Account

## Arquivos SQL

Execute os arquivos em ordem no SQL Editor do Supabase:

1. **01_tables.sql** - Cria todas as tabelas (lancamentos, perfis, listas, metas)
2. **02_permissions.sql** - Configura permissões e RLS (Row Level Security)
3. **03_indexes.sql** - Cria índices para performance e chaves estrangeiras
4. **04_functions.sql** - Configura funções e triggers

## Tabelas Criadas

### lancamentos
- Armazena entradas e saídas financeiras
- Campos: id, user_id, data, descricao, tipo, valor, detalhe, lista_id, created_at
- RLS: Usuário só vê seus próprios lançamentos

### perfis
- Configurações do usuário (diária, valor hora)
- Campos: id, telefone, diaria, valor_hora, created_at
- RLS: Usuário só gerencia seu próprio perfil

### listas
- Caixas/cartelas independentes
- Campos: id, user_id, nome, created_at
- RLS: Usuário só gerencia suas listas

### metas
- Metas financeiras do usuário
- Campos: id, user_id, nome, valor_alvo, valor_atual, data_limite, concluida, created_at, updated_at
- RLS: Usuário só gerencia suas metas
- Realtime: Atualizações em tempo real entre dispositivos

## Funções Disponíveis

### handle_new_user()
- Cria perfil automaticamente quando usuário se registra
- Trigger: after insert on auth.users

### excluir_minha_conta()
- Exclui conta do usuário e todos os dados associados
- Segurança: Só deleta dados do usuário autenticado
- Exclui: lancamentos, listas, metas, perfis, auth.users

### update_meta_timestamp()
- Atualiza updated_at automaticamente quando meta é modificada
- Trigger: before update on metas

## Realtime

- **lancamentos**: Publicado para atualizações em tempo real
- **metas**: Publicado para atualizações em tempo real

## Índices

- lancamentos_user_data_idx: user_id, data DESC
- lancamentos_lista_idx: user_id, lista_id, data DESC
- lancamentos_user_idx: user_id, data DESC
- listas_user_created_idx: user_id, created_at
- metas_user_idx: user_id, created_at DESC

## Migrations

Lançamentos antigos sem lista_id são automaticamente migrados para a primeira lista do usuário ("Meu Trabalho").
