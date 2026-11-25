import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ChartColumn, Hash, Plus, Receipt, Search, type LucideIcon } from 'lucide-react'
import { useStore } from '../data/store'
import { HELP_CATEGORIES } from '../data/mock'
import type { HelpCategory, HelpItem } from '../data/types'
import { HelpThumb, PageHeader } from '../components/ui'
import AdicionarVideo from '../components/AdicionarVideo'

const ICONS: Record<HelpCategory, LucideIcon> = { siglas: Hash, indicadores: ChartColumn, tipos: BookOpen, impostos: Receipt }

function count(n: number) { return `${n} ${n === 1 ? 'conteúdo' : 'conteúdos'}` }

function norm(s: string) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() }

export function HelpCard({ item }: { item: HelpItem }) {
  return (
    <Link to={`/ajuda/${item.id}`} className="flex flex-col gap-3 pt-3 px-3 pb-4 bg-s1 border border-line rounded-[10px] hover:border-line-strong">
      <HelpThumb thumb={item.thumb} category={item.category} youtubeId={item.youtubeId} />
      <div className="flex flex-col gap-1.5 px-1">
        <span className="text-[14.5px] font-semibold leading-[1.35]">{item.title}</span>
        {item.summary && <span className="text-[13px] leading-[1.5] text-tx2">{item.summary}</span>}
        {!item.youtubeId && <span className="text-[11.5px] text-tx3">Só texto · adicione um vídeo quando quiser</span>}
      </div>
    </Link>
  )
}

export default function Ajuda() {
  const { help } = useStore()
  const [cat, setCat] = useState<HelpCategory>('siglas')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)

  const searching = q.trim().length > 0
  const items = searching
    ? help.filter((h) => norm(`${h.title} ${h.summary} ${h.thumb}`).includes(norm(q.trim())))
    : help.filter((h) => h.category === cat)
  const catName = HELP_CATEGORIES.find((c) => c.id === cat)!.name

  return (
    <>
      <PageHeader
        title="Central de Ajuda"
        subtitle="Vídeos curtos e explicações para entender tickers, indicadores e impostos"
        action={<button type="button" className="btn btn-primary max-lg:w-full max-lg:h-12" onClick={() => setModal(true)}><Plus size={18} />Adicionar vídeo</button>}
      />
      <label className="field">
        <span className="field-box h-12">
          <Search size={18} color="#8190A0" aria-hidden="true" />
          <input type="search" aria-label="Buscar na Central de Ajuda" placeholder="Buscar na Central de Ajuda: sigla, indicador, imposto…" value={q} onChange={(e) => setQ(e.target.value)} />
        </span>
      </label>

      {!searching && (
        <div className="flex flex-wrap gap-3 max-lg:grid max-lg:grid-cols-2 max-lg:gap-2.5">
          {HELP_CATEGORIES.map((c) => {
            const Icon = ICONS[c.id]
            const on = c.id === cat
            const n = help.filter((h) => h.category === c.id).length
            return (
              <button key={c.id} type="button" aria-pressed={on} onClick={() => setCat(c.id)}
                className="flex-[1_1_220px] min-w-0 flex items-center gap-3 py-3.5 px-4 rounded-[10px] text-left cursor-pointer border text-tx"
                style={on ? { background: 'rgba(245,184,61,0.08)', borderColor: 'rgba(245,184,61,0.5)' } : { background: '#12161B', borderColor: '#242B34' }}>
                <span className="w-9 h-9 rounded-lg flex-none inline-flex items-center justify-center bg-s2 border border-line-strong">
                  <Icon size={18} className={on ? 'text-accent' : 'text-tx2'} aria-hidden="true" />
                </span>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[13.5px] font-semibold">{c.name}</span>
                  <span className="text-[12px] text-tx3">{count(n)}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-[17px] font-semibold">{searching ? `Resultados para “${q.trim()}”` : catName}</h2>
        <span className="text-[12px] text-tx3">{count(items.length)}</span>
      </div>
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))]">
        {items.map((it) => <HelpCard key={it.id} item={it} />)}
      </div>
      {!items.length && <p className="m-0 text-[14px] text-tx3">Nada encontrado. Tente outro termo, como “DY” ou “11”.</p>}

      {modal && <AdicionarVideo onClose={() => setModal(false)} defaultCategory={cat} />}
    </>
  )
}
