# Supabase Setup - Easy Account

## Arquivos SQL

Execute os arquivos em ordem no SQL Editor do Supabase:

1. **01_tables.sql** - Cria todas as tabelas (lancamentos, perfis, listas, metas, conquistas)
2. **02_permissions.sql** - Configura permissões e RLS (Row Level Security)
3. **03_indexes.sql** - Cria índices para performance e chaves estrangeiras
4. **04_functions.sql** - Configura funções e triggers
5. **05_envelopes.sql** - Adiciona `parent_id` em listas (hierarquia caixa → mini caixas)
6. **06_compactar.sql** - Função `compactar_lancamentos`: enxuga meses antigos (soma + apaga o bruto)

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
- Campos: id, user_id, nome, created_at, parent_id (05_envelopes.sql)
- `parent_id` null = caixa raiz; com valor = envelope (mini caixa) do caixa pai
- RLS: Usuário só gerencia suas listas

### metas

- Metas financeiras do usuário
- Campos: id, user_id, nome, valor_alvo, valor_atual, data_limite, concluida, created_at, updated_at
- RLS: Usuário só gerencia suas metas
- Realtime: Atualizações em tempo real entre dispositivos

### conquistas

- Sala de Troféus: troféus ganhos ao concluir metas criadas pelo usuário
- Campos: id, user_id, tipo, titulo, descricao, icone, meta_id, data_conquistada
- RLS: Usuário só gerencia suas conquistas
- Único por (user_id, tipo): o mesmo troféu não sai duas vezes
- meta_id usa ON DELETE SET NULL: excluir a meta não apaga o troféu já ganho
- Realtime: Atualizações em tempo real entre dispositivos

## Funções Disponíveis

### compactar_lancamentos(p_dias integer)

- Limpeza de dados: cada mês inteiramente anterior ao corte de `p_dias` vira
  no máximo 2 linhas com detalhe `resumo mensal` (entradas e saídas) e os
  lançamentos brutos daquele mês são apagados
- O resultado (entradas, saídas, saldo) permanece idêntico
- Pernas de distribuição (`transferência`) continuam brutas, para os KPIs
  continuarem separando movimentação interna de gastos reais
- Idempotente: mês já resumido nunca é compactado de novo
- Retorno: quantidade de meses arquivados; irreversível (o bruto não volta)
- Perigosa para os dados brutos, então só `authenticated` pode executar

### handle_new_user()

- Cria perfil automaticamente quando usuário se registra
- Trigger: after insert on auth.users

### excluir_minha_conta()

- Exclui conta do usuário e todos os dados associados
- Segurança: Só deleta dados do usuário autenticado
- Exclui: lancamentos, listas, conquistas, metas, perfis, auth.users

### update_meta_timestamp()

- Atualiza updated_at automaticamente quando meta é modificada
- Trigger: before update on metas

## Realtime

- **lancamentos**: Publicado para atualizações em tempo real
- **metas**: Publicado para atualizações em tempo real
- **conquistas**: Publicado para atualizações em tempo real

## Índices

- lancamentos_user_data_idx: user_id, data DESC
- lancamentos_lista_idx: user_id, lista_id, data DESC
- lancamentos_user_idx: user_id, data DESC
- listas_user_created_idx: user_id, created_at
- metas_user_idx: user_id, created_at DESC
- conquistas_user_idx: user_id, data_conquistada DESC

## Migrations

Lançamentos antigos sem lista_id são automaticamente migrados para a primeira lista do usuário ("Meu Trabalho").
