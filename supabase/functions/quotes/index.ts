// Edge Function "quotes"
// - action "search":  busca ativos na B3 (brapi /v2/tickers) e cripto (CoinGecko /search)
// - action "refresh": atualiza quote_cache para os ativos pedidos, respeitando o cache,
//                     e a faixa de índices (market_indices)
//
// Segredos (Supabase → Edge Functions → Secrets):
//   BRAPI_TOKEN      token da brapi.dev (sem ele só PETR4, VALE3, ITUB4, MGLU3, MXRF11, HGLG11 funcionam)
//   COINGECKO_KEY    opcional (chave "demo" da CoinGecko)
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

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

  // Múltiplos (P/L, DY, P/VP): uma vez por dia; pode não estar no plano gratuito
  if (!row?.fundamentals_at || now - new Date(row.fundamentals_at).getTime() > FUND_TTL) {
    try {
      const s = await brapi(`/v2/stocks/statistics?symbols=${encodeURIComponent(a.ticker)}&mode=current`)
      const d = s?.results?.[0]?.data ?? s?.results?.[0] ?? {}
      const st = Array.isArray(d) ? d[0] ?? {} : d
      patch.pl = num(st.trailingPE ?? st.priceEarnings)
      const dy = num(st.dividendYield)
      patch.dy = dy == null ? null : dy < 1 ? dy * 100 : dy // a brapi devolve fração (0,03 = 3%)
      patch.pvp = num(st.priceToBook)
    } catch (e) {
      console.warn('múltiplos', a.ticker, String(e))
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
  if (Date.now() - newest < INDEX_TTL) return
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
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
    const d = (await r.json())?.USDBRL
    if (d?.bid) upserts.push({ label: 'USD/BRL', value: Number(d.bid), change: Number(d.pctChange ?? 0), position: 2, updated_at: now })
  } catch (e) { console.warn('dólar', String(e)) }
  try {
    const p = await coingecko('/simple/price?ids=bitcoin&vs_currencies=brl&include_24hr_change=true')
    if (p?.bitcoin?.brl) upserts.push({ label: 'BTC', value: p.bitcoin.brl, change: p.bitcoin.brl_24h_change ?? 0, position: 3, updated_at: now })
  } catch (e) { console.warn('btc', String(e)) }
  if (upserts.length) await admin.from('market_indices').upsert(upserts)
}

/* ---------------- handler ---------------- */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'use POST' }, 405)

  // Só usuário logado
  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await admin.auth.getUser(jwt)
  if (!auth?.user) return json({ error: 'não autenticado' }, 401)

  let body: any = {}
  try { body = await req.json() } catch { /* corpo vazio */ }

  if (body.action === 'search') {
    return json({ results: await search(String(body.q ?? '')) })
  }

  // refresh: ativos pedidos + os da carteira e da lista do usuário
  const uid = auth.user.id
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

  const errors: string[] = []
  const upserts: Record<string, unknown>[] = []

  // B3: uma requisição por vez (plano gratuito permite 1 simultânea)
  for (const a of [...wanted.values()].filter((x) => x.type !== 'cripto')) {
    const row = byTicker.get(a.ticker)
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

  try { await refreshIndices(admin) } catch (e) { errors.push(`índices: ${String(e)}`) }

  return json({ updated: valid.map((u) => u.ticker), errors })
})
