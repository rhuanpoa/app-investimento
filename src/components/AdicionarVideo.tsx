import { useState } from 'react'
import { Check, Link2, Plus, TriangleAlert } from 'lucide-react'
import { Field, HelpThumb, Modal } from './ui'
import { HELP_CATEGORIES } from '../data/mock'
import { uid, useStore } from '../data/store'
import type { HelpCategory } from '../data/types'

/** Extrai o ID de links youtu.be, youtube.com/watch?v=, /shorts/ e /embed/ */
export function youtubeId(url: string): string | null {
  const m = url.trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/)
  return m ? m[1] : null
}

export default function AdicionarVideo({ onClose, defaultCategory = 'siglas' }: { onClose: () => void; defaultCategory?: HelpCategory }) {
  const { addHelp } = useStore()
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState<HelpCategory>(defaultCategory)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [touched, setTouched] = useState(false)
  const [saveError, setSaveError] = useState('')
  const id = youtubeId(url)

  const submit = async () => {
    setTouched(true)
    if (!id || !title.trim()) return
    const err = await addHelp({ id: uid(), category, thumb: '', title: title.trim(), summary: summary.trim(), youtubeId: id })
    if (err) return setSaveError(err)
    onClose()
  }

  return (
    <Modal title="Adicionar vídeo" onClose={onClose} footer={<>
      <button type="button" className="btn btn-ghost max-lg:h-11" onClick={onClose}>Cancelar</button>
      <button type="button" className="btn btn-primary max-lg:h-12" onClick={submit}><Plus size={18} />Adicionar vídeo</button>
    </>}>
      {saveError && <p role="alert" className="m-0 text-[13px] text-loss">Não foi possível salvar: {saveError}</p>}
      <Field label="Link do YouTube">
        <span className={`field-box ${touched && !id ? 'error' : ''}`}>
          <Link2 size={18} color="#8190A0" aria-hidden="true" />
          <input type="url" placeholder="https://www.youtube.com/watch?v=…" value={url} onChange={(e) => setUrl(e.target.value)} />
        </span>
      </Field>
      {url && (
        <div className="flex gap-3 items-center">
          <div className="w-[120px] flex-none"><HelpThumb thumb="" category={category} youtubeId={id ?? undefined} size="sm" /></div>
          <div className="flex flex-col gap-[3px] min-w-0">
            {id
              ? <span className="text-[12px] font-semibold text-profit inline-flex items-center gap-1.5"><Check size={14} strokeWidth={2.4} />Link válido</span>
              : <span className="text-[12px] font-semibold text-loss inline-flex items-center gap-1.5"><TriangleAlert size={14} />Link do YouTube não reconhecido</span>}
            <span className="text-[12px] text-tx3 leading-[1.45]">Pré-visualização do vídeo do YouTube</span>
          </div>
        </div>
      )}
      <Field label="Categoria">
        <span className="field-box">
          <select value={category} onChange={(e) => setCategory(e.target.value as HelpCategory)}>
            {HELP_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </span>
      </Field>
      <Field label="Título" error={touched && !title.trim() ? 'Dê um título ao vídeo' : ''}>
        <span className={`field-box ${touched && !title.trim() ? 'error' : ''}`}>
          <input type="text" placeholder="Título que aparecerá no card" value={title} onChange={(e) => setTitle(e.target.value)} />
        </span>
      </Field>
      <Field label="Descrição">
        <textarea className="textarea" rows={3} placeholder="Explique em uma ou duas frases o que o vídeo ensina" value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
    </Modal>
  )
}
