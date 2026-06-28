# Supabase

## Liberar acesso do app

Este projeto usa o cliente web do Supabase com autenticacao por e-mail e senha.
Por isso, as telas de dados dependem de permissoes para o papel `authenticated`.

Se aparecer `permission denied for table ...`, abra o **SQL Editor** do Supabase e rode o arquivo:

- `supabase/policies.sql`

Depois:

1. Salve o SQL no Supabase.
2. Volte ao app.
3. Saia da conta.
4. Entre novamente.

Isso libera leitura e escrita para:

- `pessoas_tipos`
- `pessoas`
- `produtos`
- `vendas`
- `vendas_itens`
- `movimentacoes_estoque`
