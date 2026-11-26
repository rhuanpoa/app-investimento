import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Play, X } from 'lucide-react'
import type { AssetType } from '../data/types'
import { pctArrow, toneOf } from '../lib/format'

export const TYPE_META: Record<AssetType, { label: string; plural: string; color: string; rgb: string }> = {
  acao: { label: 'AÇÃO', plural: 'Ações', color: '#7CB4FF', rgb: '124,180,255' },
  fii: { label: 'FII', plural: 'FIIs', color: '#BDA6FF', rgb: '189,166,255' },
  cripto: { label: 'CRIPTO', plural: 'Cripto', color: '#FF8FC4', rgb: '255,143,196' },
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" className="flex-none">
        <rect x=".5" y=".5" width="29" height="29" rx="8" fill="rgba(245,184,61,0.12)" stroke="rgba(245,184,61,0.42)" />
        <polyline points="7,20 12,14 16.5,17 23,9" fill="none" stroke="#F5B83D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="23" cy="9" r="2.3" fill="#F5B83D" />
      </svg>
      <span className="text-[18px] font-bold tracking-[-.02em] text-tx">Vértice</span>
    </span>
  )
}

export function TypeBadge({ type }: { type: AssetType }) {
  const m = TYPE_META[type]
  return (
    <span
      className="inline-flex items-center h-5 px-[7px] rounded text-[10.5px] font-semibold tracking-[.06em] leading-none"
      style={{ color: m.color, background: `rgba(${m.rgb},0.12)`, border: `1px solid rgba(${m.rgb},0.32)` }}
    >
      {m.label}
    </span>
  )
}

export function AssetAvatar({ ticker, type, size = 32 }: { ticker: string; type: AssetType; size?: number }) {
  const m = TYPE_META[type]
  return (
    <span
      className="rounded-full flex-none inline-flex items-center justify-center"
      style={{ width: size, height: size, background: `rgba(${m.rgb},0.12)`, border: `1px solid rgba(${m.rgb},0.3)` }}
    >
      <span className="mono text-[11px] font-semibold" style={{ color: m.color }}>{ticker.slice(0, 2)}</span>
    </span>
  )
}

/** Variação com seta e sinal, sempre colorida pelo sentido */
export function Delta({ value, className = 'text-[12.5px]', digits = 2 }: { value: number; className?: string; digits?: number }) {
  return <span className={`mono font-medium ${toneOf(value)} ${className}`}>{pctArrow(value, digits)}</span>
}

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`card ${className}`} style={style}>{children}</div>
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1 min-w-0">
        <h1 className="h-page max-lg:text-[21px]">{title}</h1>
        {subtitle && <div className="text-[13px] text-tx3">{subtitle}</div>}
      </div>
      {action}
    </div>
  )
}

/** Fundo do app: aurora em movimento + grão */
export function Ambient() {
  return (
    <>
      <div className="vxa" aria-hidden="true"><i className="a" /><i className="b" /><i className="c" /></div>
      <div className="vxg" aria-hidden="true" />
    </>
  )
}

/** Bloco de destaque do topo das páginas (design v2) */
export function Hero({ pill, title, highlight, subtitle, actions, visual, mobileExtra }: {
  pill: ReactNode
  title: string
  highlight: string
  subtitle?: ReactNode
  actions?: ReactNode
  /** Ilustração da direita (só no desktop) */
  visual?: ReactNode
  /** Destaque extra que aparece só no celular */
  mobileExtra?: ReactNode
}) {
  return (
    <section className="hero flex flex-wrap items-center gap-8 px-5 py-6 rounded-[24px] lg:rounded-[30px] lg:px-12 lg:py-11">
      <div aria-hidden="true" className="hero-grid max-lg:hidden" />
      <div aria-hidden="true" className="bl bA w-[240px] h-[200px] -right-[70px] -top-[90px] lg:w-[420px] lg:h-[340px] lg:-right-20 lg:-top-[120px]" style={{ '--c': 'rgba(245,184,61,.26)' } as React.CSSProperties} />
      <div aria-hidden="true" className="bl bB w-[220px] h-[180px] -left-[60px] -bottom-[110px] lg:w-[360px] lg:h-[280px] lg:left-[35%] lg:-bottom-[200px]" style={{ '--c': 'rgba(46,189,133,.16)' } as React.CSSProperties} />
      <div className="relative flex-[1_1_420px] min-w-0 flex flex-col items-start gap-3.5 lg:gap-5">
        <div className="hi" style={{ '--d': '100ms' } as React.CSSProperties}><span className="pill"><span className="pd" />{pill}</span></div>
        <h1 className="hi m-0 text-[32px] leading-[1.06] lg:text-[52px] lg:leading-[1.04] tracking-[-.04em] text-[#F4F6F9]" style={{ '--d': '200ms' } as React.CSSProperties}>
          {title} <span className="gt">{highlight}</span>
        </h1>
        {subtitle && <p className="hi m-0 max-w-[480px] text-[14px] lg:text-[16px] leading-[1.6] text-tx2" style={{ '--d': '300ms' } as React.CSSProperties}>{subtitle}</p>}
        {mobileExtra && <div className="hi lg:hidden" style={{ '--d': '360ms' } as React.CSSProperties}>{mobileExtra}</div>}
        {actions && <div className="hi flex flex-wrap gap-3 max-lg:w-full" style={{ '--d': '400ms' } as React.CSSProperties}>{actions}</div>}
      </div>
      {visual && (
        <div aria-hidden="true" className="hi relative flex-[0_1_380px] min-w-[300px] h-[300px] max-lg:hidden" style={{ '--d': '350ms' } as React.CSSProperties}>
          {visual}
        </div>
      )}
    </section>
  )
}

/** Cabeçalho numerado das seções do Painel */
export function SectionHead({ n, title, desc, action }: { n: number; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex-none w-6 h-6 rounded-md bg-s3 inline-flex items-center justify-center">
        <span className="mono text-[12px] font-semibold text-tx2">{n}</span>
      </span>
      <div className="flex-1 min-w-0">
        <h2 className="h-card">{title}</h2>
        {desc && <p className="m-0 mt-1 text-[13px] text-tx3">{desc}</p>}
      </div>
      {action}
    </div>
  )
}

export function Seg<T extends string>({ options, value, onChange, mono, label }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; mono?: boolean; label?: string
}) {
  return (
    <div role="group" aria-label={label} className={`seg ${mono ? 'seg-mono' : ''}`}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="chip" aria-pressed={active} onClick={onClick}>{children}</button>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className="flex-none w-12 h-11 p-0 border-0 bg-transparent inline-flex items-center justify-center cursor-pointer"
    >
      <span className="relative block w-10 h-[22px] rounded-[11px] transition-colors" style={{ background: on ? '#F5B83D' : '#313A45' }}>
        <span
          className="absolute top-[2px] w-[18px] h-[18px] rounded-full transition-all"
          style={{ left: on ? 20 : 2, background: on ? '#0B0E11' : '#E8ECF1' }}
        />
      </span>
    </button>
  )
}

export function Field({ label, children, error, className = '' }: { label?: string; children: ReactNode; error?: string; className?: string }) {
  return (
    <label className={`field ${className}`}>
      {label && <span className="field-label">{label}</span>}
      {children}
      {error && <span className="text-[12px] text-loss">{error}</span>}
    </label>
  )
}

/** Miniatura dos conteúdos da Central de Ajuda (YouTube ou marcador tipográfico) */
export function HelpThumb({ thumb, category, youtubeId, size = 'md' }: {
  thumb: string; category: string; youtubeId?: string; size?: 'sm' | 'md' | 'lg'
}) {
  const gid = useId()
  const fs = size === 'sm' ? 13 : size === 'lg' ? 64 : 34
  const play = size === 'sm' ? 28 : size === 'lg' ? 64 : 44
  return (
    <div className="relative w-full aspect-video bg-s2 border border-line rounded-lg overflow-hidden flex items-center justify-center">
      {youtubeId ? (
        <img src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <>
          <svg aria-hidden="true" width="100%" height="100%" className="absolute inset-0">
            <defs>
              <pattern id={gid} width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0H0V24" fill="none" stroke="#242B34" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${gid})`} opacity=".7" />
          </svg>
          <span className="relative mono font-semibold tracking-[-.02em] text-tx3" style={{ fontSize: fs }}>
            {category === 'siglas' ? <>ABCD<span className="text-accent">{thumb}</span></> : <span className="text-accent">{thumb}</span>}
          </span>
        </>
      )}
      {youtubeId && (
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full inline-flex items-center justify-center"
          style={{ width: play, height: play, background: 'rgba(11,14,17,.72)', border: '1px solid rgba(232,236,241,.35)' }}
        >
          <Play size={play / 2} fill="#E8ECF1" color="#E8ECF1" strokeWidth={1.5} aria-hidden="true" />
        </span>
      )}
    </div>
  )
}

/** Modal: centralizado no desktop, bottom-sheet no celular */
export function Modal({ title, onClose, children, footer, width = 560 }: {
  title: string; onClose: () => void; children: ReactNode; footer: ReactNode; width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>('input,select,textarea') ?? ref.current?.querySelector<HTMLElement>('button')
    first?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus() }
  }, [])
  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-6"
      style={{ background: 'rgba(5,7,9,.76)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className="w-full bg-s1 border-line-strong flex flex-col max-h-[92vh] max-lg:border-t max-lg:rounded-t-2xl lg:border lg:rounded-xl"
        style={{ maxWidth: width, boxShadow: '0 24px 80px rgba(0,0,0,.6)' }}
      >
        <div className="lg:hidden flex justify-center pt-2"><span className="w-10 h-1 rounded-sm bg-line-strong" /></div>
        <div className="flex items-center justify-between py-2 lg:py-3 pr-2 pl-5 lg:pl-6 border-b border-line">
          <h2 className="m-0 text-[18px] font-semibold text-tx">{title}</h2>
          <button type="button" className="btn-icon" aria-label="Fechar" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 lg:p-6 flex flex-col gap-4 overflow-y-auto hs">{children}</div>
        <div className="py-4 px-5 lg:px-6 border-t border-line flex gap-3 max-lg:flex-col-reverse lg:justify-end">{footer}</div>
      </div>
    </div>
  )
}
