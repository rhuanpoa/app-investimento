import { useEffect, useId, useState } from 'react'
import { LoaderCircle, Search } from 'lucide-react'
import { useStore, type SearchResult } from '../data/store'
import { TypeBadge } from './ui'
import { brl } from '../lib/format'

/** Campo de busca de ativo (B3 e cripto) com lista de sugestões */
export default function AssetSearch({ label, placeholder = 'Buscar ticker ou nome', value, onSelect, exclude = [] }: {
  label?: string; placeholder?: string; value?: SearchResult | null; onSelect: (a: SearchResult) => void; exclude?: string[]
}) {
  const { searchAssets } = useStore()
  const [text, setText] = useState(value ? `${value.ticker} · ${value.name}` : '')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const listId = useId()

  useEffect(() => {
    if (!open) return
    let alive = true
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await searchAssets(text.includes(' · ') ? '' : text)
        if (alive) { setResults(r.filter((x) => !exclude.includes(x.ticker))); setError('') }
      } catch {
        if (alive) setError('Não foi possível buscar agora.')
      } finally {
        if (alive) setLoading(false)
      }
    }, 300)
    return () => { alive = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, open, searchAssets, exclude.join(',')])

  const pick = (q: SearchResult) => {
    onSelect(q)
    setText(value === undefined ? '' : `${q.ticker} · ${q.name}`)
    setOpen(false)
  }

  return (
    <div className="field relative">
      {label && <span className="field-label">{label}</span>}
      <span className="field-box">
        {loading ? <LoaderCircle size={18} color="#8190A0" className="animate-spin" aria-hidden="true" /> : <Search size={18} color="#8190A0" strokeWidth={1.75} aria-hidden="true" />}
        <input
          type="text" role="combobox" aria-expanded={open} aria-controls={listId} aria-label={label ?? placeholder}
          placeholder={placeholder} value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); setHi(0) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!open) return
            if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
            if (e.key === 'Enter' && results[hi]) { e.preventDefault(); pick(results[hi]) }
          }}
        />
      </span>
      {open && (results.length > 0 || error) && (
        <ul id={listId} role="listbox" className="absolute z-20 left-0 right-0 top-full mt-1 m-0 p-1 list-none bg-s1 border border-line-strong rounded-lg shadow-[0_12px_32px_rgba(0,0,0,.5)] max-h-80 overflow-y-auto hs">
          {error && <li className="px-3 py-2.5 text-[12px] text-loss">{error}</li>}
          {results.map((q, i) => (
            <li key={`${q.type}-${q.sourceId ?? q.ticker}`} role="option" aria-selected={i === hi}
              onMouseDown={(e) => { e.preventDefault(); pick(q) }} onMouseEnter={() => setHi(i)}
              className={`flex items-center gap-2.5 px-3 min-h-11 rounded-md cursor-pointer ${i === hi ? 'bg-s3' : ''}`}>
              <span className="mono text-[13px] font-semibold w-16 truncate">{q.ticker}</span>
              <TypeBadge type={q.type} />
              <span className="text-[12px] text-tx3 flex-1 min-w-0 truncate">{q.name}</span>
              {q.price != null && <span className="mono text-[12px] text-tx2">{brl(q.price)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
