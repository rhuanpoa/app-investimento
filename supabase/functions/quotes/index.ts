// Edge Function "quotes"
// - action "search":  busca ativos na B3 (brapi /v2/tickers) e cripto (CoinGecko /search)
// - action "refresh": atualiza quote_cache para os ativos pedidos, respeitando o cache,
//                     e a faixa de índices (market_indices)
// - action "push-key":  chave pública VAPID para o app se inscrever nas notificações
// - action "push-test": envia uma notificação de teste para os aparelhos do usuário
// - action "cron":      chamada pelo pg_cron (cabeçalho x-cron-secret) a cada 15 min:
//                       atualiza os ativos com alerta, confere as condições e envia o push
//
// Segredos (Supabase → Edge Functions → Secrets):
//   BRAPI_TOKEN      token da brapi.dev (sem ele só PETR4, VALE3, ITUB4, MGLU3, MXRF11, HGLG11 funcionam)
//   COINGECKO_KEY    opcional (chave "demo" da CoinGecko)
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import webpush from 'npm:web-push@3.6.7'

type AssetType = 'acao' | 'fii' | 'cripto'
interface AssetReq { ticker: string; type: AssetType; name?: string; sourceId?: string }

const BRAPI = 'https://brapi.dev/api'
const CG = 'https://api.coingecko.com/api/v3'
const PRICE_TTL_B3 = 30 * 60 * 1000     // plano gratuito da brapi atualiza a cada 30 min
const PRICE_TTL_CRYPTO = 5 * 60 * 1000
const FUND_TTL = 24 * 60 * 60 * 1000
const INDEX_TTL = 30 * 60 * 1000
const MAX_HISTORY = 400

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const brapiToken = Deno.env.get('BRAPI_TOKEN') ?? ''
const cgKey = Deno.env.get('COINGECKO_KEY') ?? ''

async function brapi(path: string): Promise<any> {
  const r = await fetch(`${BRAPI}${path}`, { headers: brapiToken ? { Authorization: `Bearer ${brapiToken}` } : {} })
  if (!r.ok) throw new Error(`brapi ${r.status} ${path.split('?')[0]}`)
  return r.json()
}

async function coingecko(path: string): Promise<any> {
  const r = await fetch(`${CG}${path}`, { headers: cgKey ? { 'x-cg-demo-api-key': cgKey } : {} })
  if (!r.ok) throw new Error(`coingecko ${r.status} ${path.split('?')[0]}`)
  return r.json()
}

const day = (d: Date) => d.toISOString().slice(0, 10)
const num = (v: unknown) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

/** Junta históricos por data (o novo vence), ordena e limita o tamanho */
function mergeHistory(old: [string, number][], add: [string, number][]): [string, number][] {
  const m = new Map<string, number>()
  for (const it of Array.isArray(old) ? old : []) if (Array.isArray(it)) m.set(it[0], it[1])
  for (const [d, c] of add) m.set(d, c)
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-MAX_HISTORY)
}

function b3Type(subType?: string, assetType?: string): AssetType {
  const s = (subType ?? assetType ?? '').toLowerCase()
  return s.startsWith('fii') || s.startsWith('fi-') || s === 'fund' ? 'fii' : 'acao'
}

/* ---------------- busca ---------------- */

async function search(q: string) {
  const term = q.trim()
  if (!term) return []
  const [b3, cg] = await Promise.allSettled([
    brapi(`/v2/tickers?search=${encodeURIComponent(term)}&limit=8`),
    coingecko(`/search?query=${encodeURIComponent(term)}`),
  ])
  const out: { ticker: string; name: string; type: AssetType; sourceId?: string; price?: number }[] = []
  if (b3.status === 'fulfilled') {
    for (const r of b3.value?.results ?? []) {
      const st = String(r.subType ?? r.assetType ?? '')
      if (['fidc', 'fip'].includes(st)) continue
      out.push({ ticker: r.symbol, name: r.longName ?? r.name ?? r.symbol, type: b3Type(r.subType, r.assetType), price: num(r.quote?.lastPrice) ?? undefined })
    }
  }
  if (cg.status === 'fulfilled') {
    for (const c of (cg.value?.coins ?? []).slice(0, 5)) {
      out.push({ ticker: String(c.symbol).toUpperCase(), name: c.name, type: 'cripto', sourceId: c.id })
    }
  }
  return out.slice(0, 12)
}

/* ---------------- atualização ---------------- */

async function refreshB3(a: AssetReq, row: any) {
  const now = Date.now()
  const patch: Record<string, unknown> = {}
  const fresh = row && now - new Date(row.updated_at).getTime() < PRICE_TTL_B3
  const today = day(new Date())

  if (!fresh) {
    const q = await brapi(`/v2/stocks/quote?symbols=${encodeURIComponent(a.ticker)}`)
    const d = q?.results?.[0]?.data ?? q?.results?.[0]
    if (!d?.regularMarketPrice) throw new Error(`sem cotação para ${a.ticker}`)
    patch.price = num(d.regularMarketPrice)
    patch.change_day = num(d.regularMarketChangePercent) ?? 0
    patch.name = row?.name ?? a.name ?? d.longName ?? d.shortName ?? a.ticker
    if (d.marketCap) patch.market_cap = num(d.marketCap)
    patch.updated_at = new Date().toISOString()
  }

  // Histórico: uma vez por dia (plano gratuito: até 3 meses; o cache acumula com o tempo)
  if (!row?.history_at || row.history_at < today) {
    try {
      const range = row?.history?.length ? '1mo' : '3mo'
      const h = await brapi(`/v2/stocks/historical?symbols=${encodeURIComponent(a.ticker)}&range=${range}&interval=1d`)
      const items = h?.results?.[0]?.data?.historicalDataPrice ?? h?.results?.[0]?.historicalDataPrice ?? []
      const add: [string, number][] = items
        .filter((i: any) => i?.date && (i.adjustedClose ?? i.close) != null)
        .map((i: any) => [day(new Date(i.date * 1000)), Number(i.adjustedClose ?? i.close)])
      patch.history = mergeHistory(row?.history ?? [], add)
      patch.history_at = today
    } catch (e) {
      console.warn('histórico', a.ticker, String(e))
    }
  }

  // P/L e DY: uma vez por dia. O endpoint de múltiplos (v2/statistics) é pago; no plano gratuito
  // usamos a cotação v1 com fundamental=true (P/L) e dividends=true (proventos de até 1 ano),
  // e calculamos o DY = proventos com data-com nos últimos 12 meses ÷ preço atual.
  // Ticker fracionário (final F) usa o papel principal (BBAS3F → BBAS3).
  if (!row?.fundamentals_at || now - new Date(row.fundamentals_at).getTime() > FUND_TTL) {
    const base = /\dF$/.test(a.ticker) ? a.ticker.slice(0, -1) : a.ticker
    try {
      const r = await brapi(`/quote/${encodeURIComponent(base)}?fundamental=true&dividends=true`)
      const d = r?.results?.[0] ?? {}
      patch.pl = num(d.priceEarnings)
      const price = num(patch.price) ?? num(row?.price) ?? num(d.regularMarketPrice)
      const cutoff = Date.now() - 365 * 86400000
      const cash: any[] = d.dividendsData?.cashDividends ?? []
      const sum = cash
        .filter((c) => {
          const when = c.lastDatePrior ?? c.paymentDate
          return when && new Date(when).getTime() >= cutoff && new Date(when).getTime() <= Date.now()
        })
        .reduce((s, c) => s + (Number(c.rate) || 0), 0)
      patch.dy = price && cash.length ? (sum / price) * 100 : null
    } catch (e) {
      console.warn('fundamentos', base, String(e))
    }
    patch.fundamentals_at = new Date().toISOString()
  }

  return patch
}

async function refreshCrypto(list: { a: AssetReq; row: any }[]) {
  const now = Date.now()
  const stale = list.filter(({ row }) => !row || now - new Date(row.updated_at).getTime() > PRICE_TTL_CRYPTO)
  const patches = new Map<string, Record<string, unknown>>()
  if (!stale.length) return patches
  const ids = [...new Set(stale.map(({ a, row }) => a.sourceId ?? row?.source_id).filter(Boolean))]
  if (!ids.length) return patches
  const p = await coingecko(`/simple/price?ids=${ids.join(',')}&vs_currencies=brl&include_24hr_change=true&include_market_cap=true`)
  const today = day(new Date())
  for (const { a, row } of stale) {
    const id = a.sourceId ?? row?.source_id
    const d = p?.[id]
    if (!d?.brl) continue
    const patch: Record<string, unknown> = {
      price: d.brl, change_day: d.brl_24h_change ?? 0, market_cap: d.brl_market_cap ?? null,
      source_id: id, updated_at: new Date().toISOString(),
    }
    if (!row?.history_at || row.history_at < today) {
      try {
        const h = await coingecko(`/coins/${id}/market_chart?vs_currency=brl&days=365&interval=daily`)
        const add: [string, number][] = (h?.prices ?? []).map(([t, c]: [number, number]) => [day(new Date(t)), c])
        patch.history = mergeHistory(row?.history ?? [], add)
        patch.history_at = today
      } catch (e) {
        console.warn('histórico cripto', a.ticker, String(e))
      }
    }
    patches.set(a.ticker, patch)
  }
  return patches
}

async function refreshIndices(admin: ReturnType<typeof createClient>) {
  const { data: rows } = await admin.from('market_indices').select('*')
  const newest = Math.max(0, ...(rows ?? []).map((r: any) => new Date(r.updated_at).getTime()))
  if ((rows ?? []).length >= 4 && Date.now() - newest < INDEX_TTL) return
  const upserts: { label: string; value: number; change: number; position: number; updated_at: string }[] = []
  const now = new Date().toISOString()
  const tryIndex = async (label: string, sym: string, pos: number) => {
    try {
      const q = await brapi(`/v2/stocks/quote?symbols=${encodeURIComponent(sym)}`)
      const d = q?.results?.[0]?.data ?? q?.results?.[0]
      if (d?.regularMarketPrice) upserts.push({ label, value: d.regularMarketPrice, change: d.regularMarketChangePercent ?? 0, position: pos, updated_at: now })
    } catch (e) { console.warn('índice', label, String(e)) }
  }
  await tryIndex('IBOV', '^BVSP', 0)
  await tryIndex('IFIX', 'IFIX', 1)
  // Dólar: AwesomeAPI (tempo real); se falhar, Frankfurter (fechamento diário do BCE)
  let usd: { value: number; change: number } | null = null
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
    const d = r.ok ? (await r.json())?.USDBRL : null
    if (d?.bid) usd = { value: Number(d.bid), change: Number(d.pctChange ?? 0) }
    else console.warn('dólar awesomeapi', r.status)
  } catch (e) { console.warn('dólar awesomeapi', String(e)) }
  if (!usd) {
    try {
      const start = day(new Date(Date.now() - 10 * 86400000))
      const r = await fetch(`https://api.frankfurter.dev/v1/${start}..?base=USD&symbols=BRL`)
      const rates = Object.entries((await r.json())?.rates ?? {}).sort(([a], [b]) => a.localeCompare(b)) as [string, { BRL: number }][]
      const last = rates.at(-1)?.[1]?.BRL, prev = rates.at(-2)?.[1]?.BRL
      if (last) usd = { value: last, change: prev ? (last / prev - 1) * 100 : 0 }
    } catch (e) { console.warn('dólar frankfurter', String(e)) }
  }
  if (usd) upserts.push({ label: 'USD/BRL', ...usd, position: 2, updated_at: now })
  try {
    const p = await coingecko('/simple/price?ids=bitcoin&vs_currencies=brl&include_24hr_change=true')
    if (p?.bitcoin?.brl) upserts.push({ label: 'BTC', value: p.bitcoin.brl, change: p.bitcoin.brl_24h_change ?? 0, position: 3, updated_at: now })
  } catch (e) { console.warn('btc', String(e)) }
  if (upserts.length) await admin.from('market_indices').upsert(upserts)
}

/* ---------------- atualização de um conjunto de ativos ---------------- */

type Admin = ReturnType<typeof createClient>

/** B3 aberta (seg–sex, 10h–18h15 de Brasília = 13h–21h15 UTC) */
function b3Open(d = new Date()) {
  const wd = d.getUTCDay(), m = d.getUTCHours() * 60 + d.getUTCMinutes()
  return wd >= 1 && wd <= 5 && m >= 13 * 60 && m <= 21 * 60 + 15
}

async function refreshAssets(admin: Admin, wanted: Map<string, AssetReq>, byTicker: Map<string, any>, opts: { skipClosedB3?: boolean } = {}) {
  const errors: string[] = []
  const upserts: Record<string, unknown>[] = []
  const open = b3Open()

  // B3: uma requisição por vez (plano gratuito permite 1 simultânea)
  for (const a of [...wanted.values()].filter((x) => x.type !== 'cripto')) {
    const row = byTicker.get(a.ticker)
    if (opts.skipClosedB3 && !open && row) continue // pregão fechado: o preço não muda
    try {
      const patch = await refreshB3(a, row)
      if (Object.keys(patch).length) upserts.push({ ...(row ?? {}), ticker: a.ticker, type: row?.type ?? a.type, name: row?.name ?? a.name ?? a.ticker, ...patch })
    } catch (e) { errors.push(`${a.ticker}: ${String(e)}`) }
  }

  try {
    const crypto = [...wanted.values()].filter((x) => x.type === 'cripto').map((a) => ({ a, row: byTicker.get(a.ticker) }))
    const patches = await refreshCrypto(crypto)
    for (const { a, row } of crypto) {
      const patch = patches.get(a.ticker)
      if (patch) upserts.push({ ...(row ?? {}), ticker: a.ticker, type: 'cripto', name: row?.name ?? a.name ?? a.ticker, ...patch })
    }
  } catch (e) { errors.push(`cripto: ${String(e)}`) }

  const valid = upserts.filter((u) => u.price != null)
  if (valid.length) {
    const { error } = await admin.from('quote_cache').upsert(valid)
    if (error) errors.push(`cache: ${error.message}`)
  }
  for (const u of valid) byTicker.set(String(u.ticker), { ...(byTicker.get(String(u.ticker)) ?? {}), ...u })
  return { updated: valid.map((u) => String(u.ticker)), errors }
}

/* ---------------- notificações (Web Push) ---------------- */

async function secret(admin: Admin, key: string): Promise<string | null> {
  const { data } = await admin.from('app_secrets').select('value').eq('key', key).maybeSingle()
  return (data as any)?.value ?? null
}

/** Chaves VAPID: geradas na primeira vez e guardadas em app_secrets */
async function vapidKeys(admin: Admin) {
  let pub = await secret(admin, 'vapid_public')
  let priv = await secret(admin, 'vapid_private')
  if (!pub || !priv) {
    const k = webpush.generateVAPIDKeys()
    await admin.from('app_secrets').upsert(
      [{ key: 'vapid_public', value: k.publicKey }, { key: 'vapid_private', value: k.privateKey }],
      { onConflict: 'key', ignoreDuplicates: true },
    )
    pub = await secret(admin, 'vapid_public')
    priv = await secret(admin, 'vapid_private')
  }
  return { pub: pub!, priv: priv! }
}

interface PushMsg { title: string; body: string; tag?: string; url?: string }

/** Envia para todos os aparelhos do usuário; remove inscrições que expiraram */
async function pushToUser(admin: Admin, userId: string, msg: PushMsg) {
  const { pub, priv } = await vapidKeys(admin)
  webpush.setVapidDetails('mailto:alertas@vertice.app', pub, priv)
  const { data: subs } = await admin.from('push_subscriptions').select('*').eq('user_id', userId)
  let sent = 0
  const errors: string[] = []
  for (const s of (subs ?? []) as any[]) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(msg),
        { TTL: 6 * 3600, urgency: 'high' },
      )
      sent++
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      else errors.push(`push ${e?.statusCode ?? ''} ${String(e?.body ?? e).slice(0, 160)}`)
    }
  }
  return { sent, devices: subs?.length ?? 0, errors }
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: v < 1 ? 6 : 2 })
const dec = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dayBR = (d: Date) => new Date(d.getTime() - 3 * 3600000).toISOString().slice(0, 10)
const chg = (q: any) => { const c = Number(q.change_day ?? 0); return `${c >= 0 ? '+' : '−'}${dec(Math.abs(c))}% no dia` }

function alertHit(a: any, q: any): PushMsg | null {
  if (!q || q.price == null) return null
  const price = Number(q.price), v = Number(a.value)
  switch (a.kind) {
    case 'preco_abaixo':
      return price <= v ? { title: `${a.ticker} abaixo de ${brl(v)}`, body: `Agora em ${brl(price)} (${chg(q)}).` } : null
    case 'preco_acima':
      return price >= v ? { title: `${a.ticker} acima de ${brl(v)}`, body: `Agora em ${brl(price)} (${chg(q)}).` } : null
    case 'dy_min':
      return q.dy != null && Number(q.dy) >= v ? { title: `${a.ticker} com DY de ${dec(Number(q.dy))}%`, body: `Atingiu o seu alerta de DY ≥ ${dec(v)}%. Preço: ${brl(price)}.` } : null
    case 'pvp_max':
      return q.pvp != null && Number(q.pvp) <= v ? { title: `${a.ticker} com P/VP de ${dec(Number(q.pvp))}`, body: `Atingiu o seu alerta de P/VP ≤ ${dec(v)}. Preço: ${brl(price)}.` } : null
  }
  return null
}

/** Rodada do agendamento: atualiza os ativos com alerta e avisa (no máximo 1x por dia por alerta) */
async function runAlerts(admin: Admin) {
  const { data } = await admin.from('price_alerts').select('*').eq('active', true)
  const alerts = (data ?? []) as any[]
  if (!alerts.length) return { checked: 0, notified: 0, errors: [] as string[] }
  const tickers = [...new Set(alerts.map((a) => a.ticker))]
  const { data: cached } = await admin.from('quote_cache').select('*').in('ticker', tickers)
  const byTicker = new Map((cached ?? []).map((r: any) => [r.ticker, r]))
  const wanted = new Map<string, AssetReq>()
  for (const t of tickers) {
    const r = byTicker.get(t)
    if (r) wanted.set(t, { ticker: t, type: r.type, name: r.name, sourceId: r.source_id })
  }
  const { errors } = await refreshAssets(admin, wanted, byTicker, { skipClosedB3: true })

  const today = dayBR(new Date())
  let notified = 0
  for (const a of alerts) {
    if (a.notified_at && dayBR(new Date(a.notified_at)) === today) continue
    const msg = alertHit(a, byTicker.get(a.ticker))
    if (!msg) continue
    const r = await pushToUser(admin, a.user_id, { ...msg, tag: `alerta-${a.id}`, url: './#/noticias' })
    errors.push(...r.errors)
    if (r.sent) {
      notified++
      await admin.from('price_alerts').update({ notified_at: new Date().toISOString() }).eq('id', a.id)
    }
  }
  return { checked: alerts.length, notified, errors }
}

/* ---------------- handler ---------------- */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'use POST' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  let body: any = {}
  try { body = await req.json() } catch { /* corpo vazio */ }

  // Agendamento (pg_cron): autenticado pelo segredo guardado em app_secrets
  const cronHeader = req.headers.get('x-cron-secret')
  if (cronHeader) {
    const expected = await secret(admin, 'cron_secret')
    if (!expected || cronHeader !== expected) return json({ error: 'segredo inválido' }, 401)
    const r = await runAlerts(admin)
    if (r.errors.length) console.warn('alertas', r.errors)
    return json(r)
  }

  // Demais ações: só usuário logado
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await admin.auth.getUser(jwt)
  if (!auth?.user) return json({ error: 'não autenticado' }, 401)
  const uid = auth.user.id

  if (body.action === 'search') {
    return json({ results: await search(String(body.q ?? '')) })
  }

  if (body.action === 'push-key') {
    return json({ key: (await vapidKeys(admin)).pub })
  }

  if (body.action === 'push-test') {
    return json(await pushToUser(admin, uid, { title: 'Vértice: notificações ativas', body: 'Os avisos dos seus alertas de preço vão chegar aqui.', tag: 'teste', url: './#/painel' }))
  }

  // refresh: ativos pedidos + os da carteira e da lista do usuário
  const [tx, wl] = await Promise.all([
    admin.from('transactions').select('ticker').eq('user_id', uid),
    admin.from('watchlist').select('ticker').eq('user_id', uid),
  ])
  const wanted = new Map<string, AssetReq>()
  for (const a of (body.assets ?? []) as AssetReq[]) {
    if (a?.ticker && ['acao', 'fii', 'cripto'].includes(a.type)) wanted.set(String(a.ticker).toUpperCase(), { ...a, ticker: String(a.ticker).toUpperCase() })
  }
  const owned = [...new Set([...(tx.data ?? []), ...(wl.data ?? [])].map((r: any) => r.ticker))]
  const { data: cached } = await admin.from('quote_cache').select('*').in('ticker', [...new Set([...owned, ...wanted.keys()])])
  const byTicker = new Map((cached ?? []).map((r: any) => [r.ticker, r]))
  for (const t of owned) {
    const r = byTicker.get(t)
    if (!wanted.has(t) && r) wanted.set(t, { ticker: t, type: r.type, name: r.name, sourceId: r.source_id })
  }

  const { updated, errors } = await refreshAssets(admin, wanted, byTicker)
  try { await refreshIndices(admin) } catch (e) { errors.push(`índices: ${String(e)}`) }

  return json({ updated, errors })
})
