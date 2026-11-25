import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useStore } from '../data/store'
import { HELP_CATEGORIES } from '../data/mock'
import { holdings } from '../lib/calc'
import { AssetAvatar, Card, HelpThumb, TypeBadge } from '../components/ui'

export default function AjudaDetalhe() {
  const { id } = useParams()
  const { help, transactions, quotes } = useStore()
  const item = help.find((h) => h.id === id)
  const rows = useMemo(() => holdings(transactions, quotes), [transactions, quotes])
  if (!item) return <Navigate to="/ajuda" replace />

  const catName = HELP_CATEGORIES.find((c) => c.id === item.category)!.name
  const related = help.filter((h) => h.category === item.category)
  const suffix = item.body?.suffix
  const mine = suffix ? rows.filter((r) => r.ticker.endsWith(suffix)) : []

  return (
    <>
      <nav aria-label="Trilha" className="flex items-center gap-1.5 text-[13px] text-tx3 flex-wrap">
        <Link to="/ajuda" className="hover:text-tx">Central de Ajuda</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <Link to="/ajuda" className="hover:text-tx">{catName}</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span className="text-tx2">{item.thumb ? (item.category === 'siglas' ? `Final ${item.thumb}` : item.thumb) : item.title}</span>
      </nav>

      <div className="flex flex-wrap gap-6 items-start">
        <article className="flex-[2_1_560px] min-w-0 flex flex-col gap-5">
          {item.youtubeId ? (
            <div className="relative w-full aspect-video rounded-[10px] overflow-hidden border border-line bg-s2">
              <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}`}
                title={item.title} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          ) : (
            <HelpThumb thumb={item.thumb} category={item.category} size="lg" />
          )}
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[24px] max-lg:text-[21px] font-semibold tracking-[-.01em]">{item.title}</h1>
            <span className="text-[13px] text-tx3">{catName}{item.youtubeId ? ' · vídeo' : ' · texto'}</span>
          </div>
          <p className="m-0 text-[15px] leading-[1.65] text-tx2">{item.body?.intro ?? item.summary}</p>
          {item.body?.examples && (
            <>
              <h2 className="m-0 text-[17px] font-semibold">{item.body.heading ?? 'Exemplos'}</h2>
              <ul className="m-0 p-0 list-none flex flex-col gap-3">
                {item.body.examples.map((ex) => (
                  <li key={ex.ticker} className="flex gap-3 items-start">
                    <span className="tick mt-0.5 flex-none">{ex.ticker}</span>
                    <span className="text-[14.5px] leading-[1.6] text-tx2">{ex.text}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {item.body?.note && (
            <p className="m-0 p-4 rounded-[10px] text-[14px] leading-[1.55] text-tx2" style={{ background: 'rgba(245,184,61,0.07)', border: '1px solid rgba(245,184,61,0.3)' }}>{item.body.note}</p>
          )}
        </article>

        <aside className="flex-[1_1_300px] min-w-0 flex flex-col gap-4">
          <Card className="p-4">
            <h2 className="h-card mb-2">Nesta categoria</h2>
            <div className="flex flex-col">
              {related.map((r) => (
                <Link key={r.id} to={`/ajuda/${r.id}`} aria-current={r.id === item.id ? 'page' : undefined}
                  className={`flex items-center gap-3 py-2 px-2 rounded-lg ${r.id === item.id ? 'bg-s3' : 'hover:bg-s2'}`}>
                  <div className="w-[88px] flex-none"><HelpThumb thumb={r.thumb} category={r.category} youtubeId={r.youtubeId} size="sm" /></div>
                  <span className={`text-[13px] leading-[1.35] ${r.id === item.id ? 'text-accent font-semibold' : 'text-tx'}`}>{r.title}</span>
                </Link>
              ))}
            </div>
          </Card>
          {suffix && (
            <Card className="p-4">
              <h2 className="h-card">Na sua carteira</h2>
              <p className="m-0 mt-1 mb-2 text-[13px] text-tx3">{mine.length ? `Estes ativos terminam em ${suffix}:` : `Nenhum ativo seu termina em ${suffix}.`}</p>
              {mine.map((h) => (
                <div key={h.ticker} className="flex items-center gap-2.5 py-2.5 border-t border-line">
                  <AssetAvatar ticker={h.ticker} type={h.type} />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2"><span className="mono text-[13.5px] font-semibold">{h.ticker}</span><TypeBadge type={h.type} /></div>
                    <span className="text-[12px] text-tx3 truncate">{h.name}</span>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </aside>
      </div>
    </>
  )
}
