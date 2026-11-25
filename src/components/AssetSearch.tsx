import { useId, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useStore } from '../data/store'
import type { Quote } from '../data/types'
import { TypeBadge } from './ui'
import { brl } from '../lib/format'

/** Campo de busca de ativo com lista de sugestões (combobox) */
export default function AssetSearch({ label, placeholder = 'Buscar ticker ou nome', value, onSelect, exclude = [] }: {
  label?: string; placeholder?: string; value?: Quote | null; onSelect: (q: Quote) => void; exclude?: string[]
}) {
  const { catalog } = useStore()
  const [text, setText] = useState(value ? `${value.ticker} · ${value.name}` : '')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const listId = useId()

  const results = useMemo(() => {
    const t = text.trim().toLowerCase()
    return catalog
      .filter((q) => !exclude.includes(q.ticker))
      .filter((q) => !t || q.ticker.toLowerCase().includes(t) || q.name.toLowerCase().includes(t))
      .slice(0, 6)
  }, [text, catalog, exclude])

  const pick = (q: Quote) => {
    onSelect(q)
    setText(value === undefined ? '' : `${q.ticker} · ${q.name}`)
    setOpen(false)
  }

  return (
    <div className="field relative">
      {label && <span className="field-label">{label}</span>}
      <span className="field-box">
        <Search size={18} color="#8190A0" strokeWidth={1.75} aria-hidden="true" />
        <input
          type="text" role="combobox" aria-expanded={open} aria-controls={listId} aria-label={label ?? placeholder}
          placeholder={placeholder} value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); setHi(0) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!open) return
            if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
            if (e.key === 'Enter' && results[hi]) { e.preventDefault(); pick(results[hi]) }
          }}
        />
      </span>
      {open && results.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-20 left-0 right-0 top-full mt-1 m-0 p-1 list-none bg-s1 border border-line-strong rounded-lg shadow-[0_12px_32px_rgba(0,0,0,.5)]">
          {results.map((q, i) => (
            <li key={q.ticker} role="option" aria-selected={i === hi}
              onMouseDown={(e) => { e.preventDefault(); pick(q) }} onMouseEnter={() => setHi(i)}
              className={`flex items-center gap-2.5 px-3 min-h-11 rounded-md cursor-pointer ${i === hi ? 'bg-s3' : ''}`}>
              <span className="mono text-[13px] font-semibold w-16">{q.ticker}</span>
              <TypeBadge type={q.type} />
              <span className="text-[12px] text-tx3 flex-1 min-w-0 truncate">{q.name}</span>
              <span className="mono text-[12px] text-tx2">{brl(q.price)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
