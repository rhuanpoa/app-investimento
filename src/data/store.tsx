/**
 * Estado do app.
 * - Com Supabase configurado (VITE_SUPABASE_URL/ANON_KEY): login real e dados nas tabelas, protegidos por RLS.
 * - Sem Supabase: modo demonstração, com dados de exemplo salvos só no navegador.
 * Cotações: vêm de quote_cache quando houver dados lá; enquanto a Edge Function de cotações
 * não existir, usa os valores de exemplo.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as mock from './mock'
import { supabase } from '../lib/supabase'
import type { Dividend, HelpItem, InvestorProfile, PriceAlert, Quote, Transaction } from './types'

interface Data {
  transactions: Transaction[]
  dividends: Dividend[]
  watchlist: string[]
  alerts: PriceAlert[]
  profile: InvestorProfile
  help: HelpItem[]
}

const DEMO: Data = {
  transactions: mock.TRANSACTIONS,
  dividends: mock.DIVIDENDS,
  watchlist: mock.WATCHLIST,
  alerts: mock.ALERTS,
  profile: mock.PROFILE,
  help: mock.HELP_ITEMS,
}

const EMPTY: Data = {
  transactions: [], dividends: [], watchlist: [], alerts: [], help: [],
  profile: { ...mock.PROFILE },
}

const KEY = 'vertice:v1'

function loadDemo(): { user: { email: string } | null; data: Data } {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      return { user: s.user ?? null, data: { ...DEMO, ...s } }
    }
  } catch { /* sem storage */ }
  return { user: null, data: DEMO }
}

export function uid() {
  return crypto.randomUUID()
}

/* ---------- Supabase: leitura ---------- */

async function fetchAll(): Promise<{ data: Data; quotes: Quote[] }> {
  const sb = supabase!
  const [tx, dv, wl, al, pf, hp, qc] = await Promise.all([
    sb.from('transactions').select('*').order('date'),
    sb.from('dividends').select('*').order('date'),
    sb.from('watchlist').select('*').order('position'),
    sb.from('price_alerts').select('*').order('created_at'),
    sb.from('investor_profile').select('*').maybeSingle(),
    sb.from('help_items').select('*').order('position').order('created_at'),
    sb.from('quote_cache').select('*'),
  ])
  const err = [tx, dv, wl, al, pf, hp, qc].find((r) => r.error)?.error
  if (err) throw err

  let profile = mock.PROFILE
  if (pf.data) {
    profile = {
      risk: pf.data.risk, targets: pf.data.targets, goal: +pf.data.goal, monthly: +pf.data.monthly,
      refreshSeconds: pf.data.refresh_seconds, sources: pf.data.sources,
    }
  } else {
    await sb.from('investor_profile').insert({}) // cria o perfil com os valores padrão
  }

  return {
    data: {
      transactions: (tx.data ?? []).map((r) => ({ id: r.id, ticker: r.ticker, side: r.side, qty: +r.qty, price: +r.price, fees: +r.fees, date: r.date })),
      dividends: (dv.data ?? []).map((r) => ({ id: r.id, ticker: r.ticker, amount: +r.amount, date: r.date })),
      watchlist: (wl.data ?? []).map((r) => r.ticker),
      alerts: (al.data ?? []).map((r) => ({ id: r.id, ticker: r.ticker, kind: r.kind, value: +r.value, active: r.active })),
      profile,
      help: (hp.data ?? []).map((r) => ({
        id: r.id, category: r.category, thumb: r.thumb, title: r.title, summary: r.summary,
        youtubeId: r.youtube_id ?? undefined, body: r.body ?? undefined,
      })),
    },
    quotes: (qc.data ?? []).map((r) => ({
      ticker: r.ticker, name: r.name, type: r.type, price: +r.price, changeDay: +r.change_day,
      pl: r.pl == null ? undefined : +r.pl, dy: r.dy == null ? undefined : +r.dy, pvp: r.pvp == null ? undefined : +r.pvp,
      marketCap: r.market_cap == null ? undefined : +r.market_cap, history: (r.history as number[]) ?? [],
    })),
  }
}

/* ---------- Contexto ---------- */

interface Ctx extends Data {
  user: { email: string } | null
  ready: boolean
  /** true = sem Supabase (dados de exemplo no navegador) */
  demo: boolean
  /** true = cotações de exemplo (quote_cache ainda vazio) */
  demoQuotes: boolean
  quotes: Map<string, Quote>
  catalog: Quote[]
  login: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
  addTransaction: (tx: Transaction) => Promise<string | null>
  savePanel: (p: { profile: InvestorProfile; watchlist: string[]; alerts: PriceAlert[] }) => Promise<string | null>
  addHelp: (item: HelpItem) => Promise<string | null>
}

const StoreCtx = createContext<Ctx | null>(null)

function msg(e: unknown) {
  return e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Erro inesperado'
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const demo = !supabase
  const initial = demo ? loadDemo() : { user: null, data: EMPTY }
  const [user, setUser] = useState<{ email: string } | null>(initial.user)
  const [data, setData] = useState<Data>(initial.data)
  const [dbQuotes, setDbQuotes] = useState<Quote[]>([])
  const [ready, setReady] = useState(demo)

  // Persistência do modo demonstração
  useEffect(() => {
    if (!demo) return
    try { localStorage.setItem(KEY, JSON.stringify({ ...data, user })) } catch { /* ignora */ }
  }, [demo, data, user])

  const hydrate = useCallback(async () => {
    try {
      const r = await fetchAll()
      setData(r.data)
      setDbQuotes(r.quotes)
    } catch (e) {
      console.error('Falha ao carregar dados do Supabase', e)
    }
  }, [])

  // Sessão do Supabase
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) { setUser({ email: session.user.email ?? '' }); await hydrate() }
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { setUser(null); setData(EMPTY); setDbQuotes([]) }
      else if (session?.user) setUser({ email: session.user.email ?? '' })
    })
    return () => sub.subscription.unsubscribe()
  }, [hydrate])

  const login = useCallback(async (email: string, password: string) => {
    if (!supabase) { setUser({ email }); return null }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message
    await hydrate()
    return null
  }, [hydrate])

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }, [])

  const addTransaction = useCallback(async (tx: Transaction) => {
    if (supabase) {
      const { error } = await supabase.from('transactions').insert({
        id: tx.id, ticker: tx.ticker, side: tx.side, qty: tx.qty, price: tx.price, fees: tx.fees, date: tx.date,
      })
      if (error) return msg(error)
    }
    setData((d) => ({ ...d, transactions: [...d.transactions, tx] }))
    return null
  }, [])

  const savePanel = useCallback(async ({ profile, watchlist, alerts }: { profile: InvestorProfile; watchlist: string[]; alerts: PriceAlert[] }) => {
    if (supabase) {
      try {
        const { data: { user: u } } = await supabase.auth.getUser()
        if (!u) return 'Sessão expirada. Entre novamente.'
        const r1 = await supabase.from('investor_profile').upsert({
          user_id: u.id, risk: profile.risk, targets: profile.targets, goal: profile.goal, monthly: profile.monthly,
          refresh_seconds: profile.refreshSeconds, sources: profile.sources, updated_at: new Date().toISOString(),
        })
        if (r1.error) throw r1.error
        const r2 = await supabase.from('watchlist').delete().eq('user_id', u.id)
        if (r2.error) throw r2.error
        if (watchlist.length) {
          const r3 = await supabase.from('watchlist').insert(watchlist.map((t, i) => ({ ticker: t, position: i })))
          if (r3.error) throw r3.error
        }
        const keep = alerts.map((a) => a.id)
        const r4 = keep.length
          ? await supabase.from('price_alerts').delete().eq('user_id', u.id).not('id', 'in', `(${keep.join(',')})`)
          : await supabase.from('price_alerts').delete().eq('user_id', u.id)
        if (r4.error) throw r4.error
        if (alerts.length) {
          const r5 = await supabase.from('price_alerts').upsert(alerts.map((a) => ({ id: a.id, ticker: a.ticker, kind: a.kind, value: a.value, active: a.active })))
          if (r5.error) throw r5.error
        }
      } catch (e) { return msg(e) }
    }
    setData((d) => ({ ...d, profile, watchlist, alerts }))
    return null
  }, [])

  const addHelp = useCallback(async (item: HelpItem) => {
    if (supabase) {
      const { error } = await supabase.from('help_items').insert({
        id: item.id, category: item.category, thumb: item.thumb, title: item.title, summary: item.summary,
        youtube_id: item.youtubeId ?? null, position: 1000,
      })
      if (error) return msg(error)
    }
    setData((d) => ({ ...d, help: [...d.help, item] }))
    return null
  }, [])

  const demoQuotes = dbQuotes.length === 0
  const catalog = demoQuotes ? mock.QUOTES : dbQuotes
  const quotes = useMemo(() => new Map(catalog.map((q) => [q.ticker, q])), [catalog])

  const value = useMemo<Ctx>(() => ({
    ...data, user, ready, demo, demoQuotes, quotes, catalog,
    login, logout, addTransaction, savePanel, addHelp,
  }), [data, user, ready, demo, demoQuotes, quotes, catalog, login, logout, addTransaction, savePanel, addHelp])

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const c = useContext(StoreCtx)
  if (!c) throw new Error('useStore fora do StoreProvider')
  return c
}
