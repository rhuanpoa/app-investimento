-- Vértice · esquema inicial
-- Todas as tabelas de usuário têm RLS: cada linha só é visível/editável pelo próprio dono.

-- Tipos -----------------------------------------------------------------------
create type public.asset_type as enum ('acao', 'fii', 'cripto');
create type public.tx_side as enum ('compra', 'venda');
create type public.alert_kind as enum ('preco_abaixo', 'preco_acima', 'dy_min', 'pvp_max');
create type public.risk_profile as enum ('Conservador', 'Moderado', 'Arrojado');
create type public.help_category as enum ('siglas', 'indicadores', 'tipos', 'impostos');

-- Cache de cotações (escrito pela Edge Function com service role; leitura p/ logados)
create table public.quote_cache (
  ticker      text primary key,
  name        text not null,
  type        public.asset_type not null,
  price       numeric not null,
  change_day  numeric not null default 0,
  pl          numeric,
  dy          numeric,
  pvp         numeric,
  market_cap  numeric,
  history     jsonb not null default '[]'::jsonb,  -- fechamentos diários, do mais antigo ao mais recente
  updated_at  timestamptz not null default now()
);

-- Operações (compra/venda) ------------------------------------------------------
create table public.transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ticker     text not null,
  side       public.tx_side not null,
  qty        numeric not null check (qty > 0),
  price      numeric not null check (price > 0),
  fees       numeric not null default 0 check (fees >= 0),
  date       date not null default current_date,
  created_at timestamptz not null default now()
);
create index transactions_user_idx on public.transactions (user_id, date);

-- Proventos recebidos -------------------------------------------------------------
create table public.dividends (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ticker     text not null,
  amount     numeric not null check (amount > 0),
  date       date not null default current_date,
  created_at timestamptz not null default now()
);
create index dividends_user_idx on public.dividends (user_id, date);

-- Lista de acompanhamento -----------------------------------------------------------
create table public.watchlist (
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ticker   text not null,
  position int  not null default 0,
  primary key (user_id, ticker)
);

-- Alertas -------------------------------------------------------------------------
create table public.price_alerts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ticker     text not null,
  kind       public.alert_kind not null,
  value      numeric not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index price_alerts_user_idx on public.price_alerts (user_id);

-- Perfil do investidor (1 linha por usuário) -----------------------------------------
create table public.investor_profile (
  user_id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  risk            public.risk_profile not null default 'Moderado',
  targets         jsonb not null default '{"acao":40,"fii":40,"cripto":20}'::jsonb,
  goal            numeric not null default 100000,
  monthly         numeric not null default 1000,
  refresh_seconds int not null default 60,
  sources         jsonb not null default '{"mercado":true,"fiis":true,"cripto":true,"agencia":true}'::jsonb,
  updated_at      timestamptz not null default now()
);

-- Central de Ajuda: conteúdos globais (user_id nulo) + vídeos adicionados pelo usuário
create table public.help_items (
  id         text primary key default gen_random_uuid()::text,
  user_id    uuid default auth.uid() references auth.users (id) on delete cascade,
  category   public.help_category not null,
  thumb      text not null default '',
  title      text not null,
  summary    text not null default '',
  youtube_id text,
  body       jsonb,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index help_items_user_idx on public.help_items (user_id);

-- RLS -----------------------------------------------------------------------------
alter table public.quote_cache      enable row level security;
alter table public.transactions     enable row level security;
alter table public.dividends        enable row level security;
alter table public.watchlist        enable row level security;
alter table public.price_alerts     enable row level security;
alter table public.investor_profile enable row level security;
alter table public.help_items       enable row level security;

create policy "cotações: leitura para logados" on public.quote_cache
  for select to authenticated using (true);

create policy "operações: dono" on public.transactions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "proventos: dono" on public.dividends
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "watchlist: dono" on public.watchlist
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "alertas: dono" on public.price_alerts
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "perfil: dono" on public.investor_profile
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "ajuda: ler globais e os próprios" on public.help_items
  for select to authenticated using (user_id is null or (select auth.uid()) = user_id);
create policy "ajuda: inserir os próprios" on public.help_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ajuda: editar os próprios" on public.help_items
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "ajuda: apagar os próprios" on public.help_items
  for delete to authenticated using ((select auth.uid()) = user_id);
