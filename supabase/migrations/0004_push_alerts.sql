-- Notificações no celular (Web Push) para os alertas de preço.
-- O pg_cron chama a Edge Function "quotes" (action "cron") a cada 15 minutos; ela atualiza
-- as cotações dos ativos com alerta, confere as condições e envia o aviso (no máximo 1x/dia por alerta).

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Quando o alerta avisou pela última vez (controle de "uma vez por dia")
alter table public.price_alerts add column if not exists notified_at timestamptz;

-- Inscrições de push de cada aparelho
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "push: dono" on public.push_subscriptions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Segredos internos (chaves VAPID e o segredo do agendamento). Sem políticas: só o service role lê.
create table if not exists public.app_secrets (
  key        text primary key,
  value      text not null,
  created_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

insert into public.app_secrets (key, value)
values ('cron_secret', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

-- Agendamento: a cada 15 minutos
select cron.schedule(
  'vertice-alertas',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://vtjridqghtjvwofuntpf.supabase.co/functions/v1/quotes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from public.app_secrets where key = 'cron_secret')
    ),
    body := '{"action":"cron"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
