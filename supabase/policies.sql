grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
grant usage, select on sequences to authenticated;

alter table if exists public.pessoas_tipos enable row level security;
alter table if exists public.pessoas enable row level security;
alter table if exists public.produtos enable row level security;
alter table if exists public.vendas enable row level security;
alter table if exists public.vendas_itens enable row level security;
alter table if exists public.movimentacoes_estoque enable row level security;

drop policy if exists "pessoas_tipos_select_authenticated" on public.pessoas_tipos;
create policy "pessoas_tipos_select_authenticated"
on public.pessoas_tipos
for select
to authenticated
using (true);

drop policy if exists "pessoas_select_authenticated" on public.pessoas;
create policy "pessoas_select_authenticated"
on public.pessoas
for select
to authenticated
using (true);

drop policy if exists "pessoas_insert_authenticated" on public.pessoas;
create policy "pessoas_insert_authenticated"
on public.pessoas
for insert
to authenticated
with check (true);

drop policy if exists "pessoas_update_authenticated" on public.pessoas;
create policy "pessoas_update_authenticated"
on public.pessoas
for update
to authenticated
using (true)
with check (true);

drop policy if exists "pessoas_delete_authenticated" on public.pessoas;
create policy "pessoas_delete_authenticated"
on public.pessoas
for delete
to authenticated
using (true);

drop policy if exists "produtos_select_authenticated" on public.produtos;
create policy "produtos_select_authenticated"
on public.produtos
for select
to authenticated
using (true);

drop policy if exists "produtos_insert_authenticated" on public.produtos;
create policy "produtos_insert_authenticated"
on public.produtos
for insert
to authenticated
with check (true);

drop policy if exists "produtos_update_authenticated" on public.produtos;
create policy "produtos_update_authenticated"
on public.produtos
for update
to authenticated
using (true)
with check (true);

drop policy if exists "produtos_delete_authenticated" on public.produtos;
create policy "produtos_delete_authenticated"
on public.produtos
for delete
to authenticated
using (true);

drop policy if exists "vendas_select_authenticated" on public.vendas;
create policy "vendas_select_authenticated"
on public.vendas
for select
to authenticated
using (true);

drop policy if exists "vendas_insert_authenticated" on public.vendas;
create policy "vendas_insert_authenticated"
on public.vendas
for insert
to authenticated
with check (true);

drop policy if exists "vendas_update_authenticated" on public.vendas;
create policy "vendas_update_authenticated"
on public.vendas
for update
to authenticated
using (true)
with check (true);

drop policy if exists "vendas_delete_authenticated" on public.vendas;
create policy "vendas_delete_authenticated"
on public.vendas
for delete
to authenticated
using (true);

drop policy if exists "vendas_itens_select_authenticated" on public.vendas_itens;
create policy "vendas_itens_select_authenticated"
on public.vendas_itens
for select
to authenticated
using (true);

drop policy if exists "vendas_itens_insert_authenticated" on public.vendas_itens;
create policy "vendas_itens_insert_authenticated"
on public.vendas_itens
for insert
to authenticated
with check (true);

drop policy if exists "vendas_itens_update_authenticated" on public.vendas_itens;
create policy "vendas_itens_update_authenticated"
on public.vendas_itens
for update
to authenticated
using (true)
with check (true);

drop policy if exists "vendas_itens_delete_authenticated" on public.vendas_itens;
create policy "vendas_itens_delete_authenticated"
on public.vendas_itens
for delete
to authenticated
using (true);

drop policy if exists "movimentacoes_estoque_select_authenticated" on public.movimentacoes_estoque;
create policy "movimentacoes_estoque_select_authenticated"
on public.movimentacoes_estoque
for select
to authenticated
using (true);

drop policy if exists "movimentacoes_estoque_insert_authenticated" on public.movimentacoes_estoque;
create policy "movimentacoes_estoque_insert_authenticated"
on public.movimentacoes_estoque
for insert
to authenticated
with check (true);

drop policy if exists "movimentacoes_estoque_update_authenticated" on public.movimentacoes_estoque;
create policy "movimentacoes_estoque_update_authenticated"
on public.movimentacoes_estoque
for update
to authenticated
using (true)
with check (true);

drop policy if exists "movimentacoes_estoque_delete_authenticated" on public.movimentacoes_estoque;
create policy "movimentacoes_estoque_delete_authenticated"
on public.movimentacoes_estoque
for delete
to authenticated
using (true);
