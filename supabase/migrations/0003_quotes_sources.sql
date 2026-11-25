-- Cotações reais: metadados de origem e controle de atualização
alter table public.quote_cache
  add column if not exists source_id text,                 -- id na CoinGecko (cripto); nulo para B3
  add column if not exists history_at date,                -- último dia em que o histórico foi buscado
  add column if not exists fundamentals_at timestamptz;    -- última busca de P/L, DY, P/VP

comment on column public.quote_cache.history is
  'Fechamentos diários: [["AAAA-MM-DD", fechamento], ...] do mais antigo ao mais recente';

-- Índices de mercado da faixa do topo (IBOV, IFIX, USD/BRL, BTC)
create table if not exists public.market_indices (
  label      text primary key,
  value      numeric not null,
  change     numeric not null default 0,
  position   int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.market_indices enable row level security;
create policy "índices: leitura para logados" on public.market_indices
  for select to authenticated using (true);
