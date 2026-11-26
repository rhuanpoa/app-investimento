import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ChartColumn, ChevronRight, Clock, Hash, Play, Plus, Receipt, Search, type LucideIcon } from 'lucide-react'
import { useStore } from '../data/store'
import { HELP_CATEGORIES } from '../data/mock'
import type { HelpCategory, HelpItem } from '../data/types'
import AdicionarVideo from '../components/AdicionarVideo'

const ICONS: Record<HelpCategory, LucideIcon> = { siglas: Hash, indicadores: ChartColumn, tipos: BookOpen, impostos: Receipt }
const HUES = [40, 160, 215, 275, 190, 340, 25]
const TRENDING: { label: string; term: string }[] = [
  { label: 'units', term: 'units' }, { label: 'FIIs', term: 'fii' }, { label: 'BDRs', term: 'bdr' },
  { label: 'fracionário', term: 'fracion' }, { label: 'dividend yield', term: 'dividend' },
]

function count(n: number, w = 'conteúdo') { return `${n} ${n === 1 ? w : `${w}s`}` }

function norm(s: string) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() }

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

/** Rótulo grande do thumbnail: nas siglas, "ABCD" + final destacado */
function Tag({ item }: { item: HelpItem }) {
  return item.category === 'siglas'
    ? <span className="tg">ABCD<b>{item.thumb}</b></span>
    : <span className="tg"><b>{item.thumb}</b></span>
}

export function HelpCard({ item, i = 0, featured = false, delay = 0 }: { item: HelpItem; i?: number; featured?: boolean; delay?: number }) {
  const thumb = item.youtubeId ? `url(https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg)` : undefined
  return (
    <Link to={`/ajuda/${item.id}`} className={`vc rv ${featured ? 'ft' : ''}`} style={{ '--hue': HUES[i % HUES.length], '--d': `${delay}ms` } as CSSProperties}>
      <div className="th">
        <div className="bg" style={thumb ? { backgroundImage: `linear-gradient(180deg, rgba(11,14,17,.55), rgba(11,14,17,.75)), ${thumb}` } : undefined} />
        <div className="gr" />
        <Tag item={item} />
        <span className="bd">DESTAQUE</span>
        <span className="pl"><Play size={featured ? 24 : 18} /></span>
        <span className="du">{item.youtubeId ? 'vídeo' : 'texto'}</span>
      </div>
      <div className="flex flex-col gap-[7px] px-2">
        <span className="ttl">{item.title}</span>
        {item.summary && <span className="dsc">{item.summary}</span>}
      </div>
    </Link>
  )
}

export default function Ajuda() {
  const { help } = useStore()
  const [cat, setCat] = useState<HelpCategory>('siglas')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)

  const term = q.trim()
  const searching = term.length > 0
  const items = searching
    ? help.filter((h) => norm(`${h.title} ${h.summary} ${h.thumb}`).includes(norm(term)))
    : help.filter((h) => h.category === cat)
  const catName = HELP_CATEGORIES.find((c) => c.id === cat)!.name
  const videos = help.filter((h) => h.youtubeId).length

  return (
    <>
      <section className="hero flex flex-wrap items-center gap-8 px-5 py-6 rounded-[24px] lg:rounded-[32px] lg:px-12 lg:py-12">
        <div aria-hidden="true" className="hero-grid max-lg:hidden" />
        <div aria-hidden="true" className="bl bA w-[240px] h-[200px] -right-[70px] -top-[90px] lg:w-[420px] lg:h-[360px] lg:-right-20 lg:-top-[120px]" style={{ background: 'rgba(245,184,61,.28)' }} />
        <div aria-hidden="true" className="bl bB w-[220px] h-[180px] -left-[60px] -bottom-[110px] lg:w-[380px] lg:h-[300px] lg:left-[30%] lg:-bottom-[200px]" style={{ background: 'rgba(46,189,133,.18)' }} />

        <div className="relative flex-[1_1_480px] min-w-0 flex flex-col gap-4 lg:gap-[22px]">
          <h1 className="hi m-0 text-[32px] leading-[1.06] lg:text-[56px] lg:leading-[1.02] tracking-[-.04em] text-[#F4F6F9]" style={d(220)}>
            Entenda o mercado em <span className="gt">poucos minutos</span>
          </h1>
          <p className="hi m-0 max-w-[520px] text-[14px] lg:text-[16px] leading-[1.6] text-tx2" style={d(320)}>
            Vídeos curtos e explicações para entender tickers, indicadores e impostos, sem jargão.
          </p>
          <div className="hi max-w-[640px] w-full" style={d(420)}>
            <label className="sb">
              <span className="relative flex items-center gap-3.5 h-14 lg:h-[62px] px-[18px] lg:px-[22px] rounded-[19px] bg-[#0E1216]">
                <Search size={20} className="text-accent flex-none" aria-hidden="true" />
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: sigla, indicador, imposto…"
                  aria-label="Buscar na Central de Ajuda: sigla, indicador, imposto"
                  className="flex-1 min-w-0 w-full h-full bg-transparent border-0 outline-0 text-tx text-[15px] lg:text-[16px]" />
                <span className="flex-none mono text-[12px] text-tx3 px-2.5 py-[5px] rounded-lg border border-line max-sm:hidden">{count(searching ? items.length : help.length)}</span>
              </span>
            </label>
          </div>
          <div className="hi flex flex-wrap items-center gap-2.5" style={d(520)}>
            <span className="text-[12.5px] text-tx3 mr-0.5">Em alta:</span>
            {TRENDING.map((t) => (
              <button key={t.term} type="button" className={`hchip ${norm(term) === t.term ? 'on' : ''}`} aria-pressed={norm(term) === t.term}
                onClick={() => setQ(norm(term) === t.term ? '' : t.term)}>{t.label}</button>
            ))}
          </div>
        </div>

        <div aria-hidden="true" className="hi relative flex-[0_1_360px] min-w-[300px] h-[320px] max-lg:hidden" style={d(380)}>
          <div className="hg fl absolute left-0 right-5 top-[34px] h-[200px] rounded-[26px] flex flex-col items-center justify-center gap-3">
            <div className="inline-flex items-baseline mono text-[54px] font-bold tracking-[-.04em] text-[#C3CCD6]">
              ABCD<span className="cy text-accent" style={{ textShadow: '0 0 28px rgba(245,184,61,.7)' }}>
                {['3', '4', '11', 'F', '34'].map((s, i) => <span key={s} style={{ '--cd': `${i * 2}s` } as CSSProperties}>{s}</span>)}
              </span>
            </div>
            <span className="text-[12.5px] font-medium text-tx2 tracking-[.06em] uppercase">Cada final conta uma história</span>
          </div>
          <div className="hc fl absolute right-0 top-0" style={{ animationDuration: '5s', animationDelay: '-2s' }}>
            <span className="pd" /><span className="mono text-[12.5px] font-semibold text-tx">AAPL34 · BDR</span>
          </div>
          <div className="hc fl absolute left-2.5 bottom-3.5" style={{ animationDuration: '7s', animationDelay: '-4s' }}>
            <Clock size={15} className="text-accent" /><span className="text-[12.5px] font-semibold text-tx">{videos ? count(videos, 'vídeo') : 'Vídeos curtos'}</span>
          </div>
        </div>
      </section>

      {!searching && (
        <div className="flex flex-wrap gap-3.5 max-lg:grid max-lg:grid-cols-2 max-lg:gap-2.5">
          {HELP_CATEGORIES.map((c, i) => {
            const Icon = ICONS[c.id]
            const on = c.id === cat
            const n = help.filter((h) => h.category === c.id).length
            return (
              <button key={c.id} type="button" aria-pressed={on} onClick={() => setCat(c.id)} className={`cat rv ${on ? 'on' : ''}`} style={d(200 + i * 70)}>
                <span className="ic"><Icon size={19} className={on ? 'text-accent' : 'text-tx2'} aria-hidden="true" /></span>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[14px] lg:text-[14.5px] font-semibold text-tx">{c.name}</span>
                  <span className="text-[12.5px] text-tx2">{count(n)}</span>
                </span>
                <ChevronRight size={18} className="ar text-tx2 max-lg:hidden" aria-hidden="true" />
              </button>
            )
          })}
        </div>
      )}

      <div className="rv flex items-center gap-3.5" style={d(480)}>
        <h2 className="m-0 text-[20px] lg:text-[26px] font-bold text-tx">{searching ? `Resultados para “${term}”` : catName}</h2>
        <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,.18), transparent)' }} />
        <span className="mono text-[12.5px] text-tx2">{count(items.length)}</span>
      </div>

      {!items.length && (
        <div className="flex flex-col items-center gap-3.5 py-14 px-6 rounded-[20px] border border-dashed border-line-strong text-center">
          <span className="font-[family-name:var(--font-display)] text-[22px] font-semibold text-tx">Nada encontrado para “{term}”</span>
          <span className="text-[14px] text-tx2">Tente outra sigla, como “DY” ou “11”, ou limpe a busca.</span>
          <button type="button" className="hchip on" onClick={() => setQ('')}>Limpar busca</button>
        </div>
      )}

      <div className="grid gap-4 lg:gap-5 grid-cols-[repeat(auto-fill,minmax(min(250px,100%),1fr))] grid-flow-dense">
        {items.map((it, i) => <HelpCard key={it.id} item={it} i={i} featured={!searching && i === 0 && items.length > 2} delay={560 + i * 80} />)}
        <button type="button" className="add rv" style={d(560 + items.length * 80)} onClick={() => setModal(true)}>
          <span className="pc"><Plus size={22} /></span>
          <span className="text-[15px] font-semibold text-tx">Adicionar vídeo</span>
          <span className="text-[13px] leading-[1.5] text-tx2 max-w-[200px]">Não achou o que procurava? Cadastre um vídeo do YouTube.</span>
        </button>
      </div>

      {modal && <AdicionarVideo onClose={() => setModal(false)} defaultCategory={cat} />}
    </>
  )
}
