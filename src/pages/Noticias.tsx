import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellRing } from 'lucide-react'
import { useStore } from '../data/store'
import { NEWS, NEWS_SOURCES } from '../data/mock'
import type { PriceAlert, Quote } from '../data/types'
import { alertTriggered, ALERT_LABEL } from '../lib/calc'
import { brl, brlCompact, decimal, pct, pctArrow, timeAgo, toneOf } from '../lib/format'
import { AssetAvatar, Card, Delta, PageHeader, Seg, TypeBadge } from '../components/ui'
import { Sparkline } from '../components/charts'

function firedText(a: PriceAlert, q: Quote) {
  switch (a.kind) {
    case 'dy_min': return `DY ${pct(q.dy ?? 0, 1)} ≥ ${pct(a.value, 0)}`
    case 'pvp_max': return `P/VP ${decimal(q.pvp ?? 0)} ≤ ${decimal(a.value)}`
    default: return `Preço ${brl(q.price)} ${ALERT_LABEL[a.kind].verb} ${brl(a.value)}`
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[3px] min-w-0">
      <div className="label-caps text-[10px]">{label}</div>
      <span className="mono text-[13px] font-medium">{value}</span>
    </div>
  )
}

function WatchCard({ q, alert }: { q: Quote; alert?: string }) {
  const h30 = q.history.slice(-31)
  const chg30 = (h30[h30.length - 1] / h30[0] - 1) * 100
  const metrics = q.type === 'cripto'
    ? [['Market cap', q.marketCap ? brlCompact(q.marketCap) : '—'], ['Var. 24h', `${q.changeDay >= 0 ? '+' : '−'}${pct(Math.abs(q.changeDay))}`]]
    : q.type === 'fii'
      ? [['P/VP', q.pvp != null ? decimal(q.pvp) : '—'], ['DY', q.dy != null ? pct(q.dy, 1) : '—']]
      : [['P/L', q.pl != null ? decimal(q.pl, 1) : '—'], ['DY', q.dy != null ? pct(q.dy, 1) : '—']]
  return (
    <Card className="overflow-hidden" style={alert ? { borderColor: 'rgba(245,184,61,0.55)', boxShadow: '0 0 0 3px rgba(245,184,61,0.1)' } : undefined}>
      {alert && (
        <div className="flex items-center gap-2 py-2 px-3.5 text-[12px] font-semibold text-accent" style={{ background: 'rgba(245,184,61,0.13)', borderBottom: '1px solid rgba(245,184,61,0.35)' }}>
          <span className="w-2 h-2 rounded-full bg-accent" />
          <BellRing size={14} aria-hidden="true" />
          Alerta disparado · {alert}
        </div>
      )}
      <div className="py-3.5 px-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <AssetAvatar ticker={q.ticker} type={q.type} />
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2"><span className="mono text-[14px] font-semibold">{q.ticker}</span><TypeBadge type={q.type} /></div>
              <span className="text-[12px] text-tx3 truncate">{q.name}</span>
            </div>
          </div>
          <div className="text-right flex flex-col gap-[3px]">
            <span className="mono text-[15px] font-semibold">{brl(q.price)}</span>
            <Delta value={q.changeDay} />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[11px] text-tx3">30 dias</span>
            <span className={`mono text-[11.5px] font-medium ${toneOf(chg30)}`}>{pctArrow(chg30, 1)}</span>
          </div>
          <Sparkline data={h30} />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-line">
          {metrics.map(([l, v]) => <Metric key={l} label={l} value={v} />)}
        </div>
      </div>
    </Card>
  )
}

export default function Noticias() {
  const { watchlist, quotes, alerts, profile } = useStore()
  const [only, setOnly] = useState<'todas' | 'meus'>('todas')

  const fired = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of alerts) {
      const q = quotes.get(a.ticker)
      if (q && alertTriggered(a, q) && !m.has(a.ticker)) m.set(a.ticker, firedText(a, q))
    }
    return m
  }, [alerts, quotes])

  const activeSources = new Set(NEWS_SOURCES.filter((s) => profile.sources[s.id]).map((s) => s.name))
  const news = NEWS.filter((n) => activeSources.has(n.source))
    .filter((n) => only === 'todas' || n.tickers.some((t) => watchlist.includes(t)))

  return (
    <>
      <PageHeader title="Notícias e Mercado" subtitle="Indicadores da sua lista e o que está movendo o mercado" />
      <div className="flex flex-wrap gap-5 items-start">
        <section className="flex-[3_1_560px] min-w-0 flex flex-col gap-3.5" aria-label="Ativos acompanhados">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[15px] font-semibold">Ativos acompanhados</h2>
            {fired.size > 0 && <span className="text-[12px] text-tx3">{fired.size} {fired.size === 1 ? 'alerta disparado' : 'alertas disparados'} hoje</span>}
          </div>
          {watchlist.length ? (
            <div className="grid gap-4 items-start grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))]">
              {watchlist.map((t) => quotes.get(t)).filter(Boolean).map((q) => <WatchCard key={q!.ticker} q={q!} alert={fired.get(q!.ticker)} />)}
            </div>
          ) : (
            <Card className="p-6 text-[14px] text-tx2">Sua lista está vazia. Adicione ativos no <Link to="/painel" className="text-accent font-semibold">Painel do Investidor</Link>.</Card>
          )}
        </section>

        <section className="flex-[2_1_360px] min-w-0" aria-label="Notícias">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap py-3 px-5">
              <h2 className="h-card">Notícias</h2>
              <Seg label="Filtro de notícias" value={only} onChange={setOnly}
                options={[{ value: 'todas', label: 'Todas' }, { value: 'meus', label: 'Só dos meus ativos' }]} />
            </div>
            {news.map((n) => (
              <a key={n.id} href={n.url.startsWith('http') ? n.url : undefined} target="_blank" rel="noreferrer"className="flex flex-col gap-2 py-3.5 px-5 border-t border-line hover:bg-s2/60">
                <span className="text-[14.5px] font-semibold leading-[1.4]">{n.title}</span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="text-[12px] text-tx2">{n.source}</span>
                  <span className="text-[12px] text-tx3">{timeAgo(n.minutesAgo)}</span>
                  {n.tickers.map((t) => <span key={t} className="tick">{t}</span>)}
                </div>
              </a>
            ))}
            {!news.length && <p className="m-0 py-6 px-5 border-t border-line text-[13px] text-tx3">Nenhuma notícia com esse filtro.</p>}
          </Card>
        </section>
      </div>
    </>
  )
}
