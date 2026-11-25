import { useId } from 'react'
import type { AssetType } from '../data/types'
import { TYPE_META } from './ui'

const MONO = 'JetBrains Mono, monospace'

function kfmt(v: number) {
  if (v >= 1000) return `${(v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}k`
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function dateLabel(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').replace(' de ', ' ')
}

/** Gráfico de área do patrimônio, com linha tracejada do valor investido */
export function AreaChart({ data, baseline, label }: { data: number[]; baseline?: number; label: string }) {
  const gid = useId()
  const W = 712, H = 262, L = 6, R = 664, T = 10, B = 238
  if (data.length < 2) return null
  const all = baseline != null ? [...data, baseline] : data
  let min = Math.min(...all), max = Math.max(...all)
  const pad = (max - min) * 0.08 || max * 0.01
  min -= pad; max += pad
  const x = (i: number) => L + ((R - L) * i) / (data.length - 1)
  const y = (v: number) => B - ((v - min) / (max - min)) * (B - T)
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${R} ${B} L${L} ${B} Z`
  const ticks = [0, 1, 2, 3].map((k) => min + ((max - min) * k) / 3)
  const n = data.length
  const xt = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (n - 1)))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label} className="block h-auto">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E8ECF1" stopOpacity=".13" />
          <stop offset="1" stopColor="#E8ECF1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={L} x2={R} y1={y(t)} y2={y(t)} stroke="#242B34" />
          <text x={672} y={y(t) + 3.5} fill="#8190A0" fontFamily={MONO} fontSize="10.5">{kfmt(t)}</text>
        </g>
      ))}
      {xt.map((i, k) => (
        <text key={k} x={x(i)} y={256} fill="#8190A0" fontFamily={MONO} fontSize="10.5"
          textAnchor={k === 0 ? 'start' : k === xt.length - 1 ? 'end' : 'middle'}>
          {dateLabel(n - 1 - i)}
        </text>
      ))}
      {baseline != null && <line x1={L} x2={R} y1={y(baseline)} y2={y(baseline)} stroke="#8190A0" strokeDasharray="4 4" />}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="#E8ECF1" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(n - 1)} cy={y(data[n - 1])} r="4.5" fill="#F5B83D" stroke="#0B0E11" strokeWidth="2" />
    </svg>
  )
}

/** Rosca dupla: anel externo = alocação atual, interno = meta */
export function AllocationDonut({ current, target, size = 190 }: {
  current: Record<AssetType, number>; target: Record<AssetType, number>; size?: number
}) {
  const c = size / 2
  const rO = size * 0.39, rI = size * 0.29
  const types: AssetType[] = ['acao', 'fii', 'cripto']
  const ring = (r: number, w: number, vals: Record<AssetType, number>, op: number) => {
    const C = 2 * Math.PI * r
    let off = 0
    return types.map((t) => {
      const len = (vals[t] / 100) * C
      const gap = len > 4 ? 2.5 : 0
      const el = (
        <circle key={t + r} cx={c} cy={c} r={r} fill="none" stroke={TYPE_META[t].color} strokeWidth={w} strokeOpacity={op}
          strokeDasharray={`${Math.max(0, len - gap)} ${C}`} strokeDashoffset={-off} transform={`rotate(-90 ${c} ${c})`} />
      )
      off += len
      return el
    })
  }
  const top = types.reduce((a, b) => (current[b] > current[a] ? b : a))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" className="flex-none"
      aria-label="Alocação atual por tipo (anel externo) e meta (anel interno)">
      <circle cx={c} cy={c} r={rO} fill="none" stroke="#20262E" strokeWidth={16} />
      <circle cx={c} cy={c} r={rI} fill="none" stroke="#20262E" strokeWidth={6} />
      {ring(rO, 16, current, 1)}
      {ring(rI, 6, target, 0.55)}
      <text x={c} y={c + 3} textAnchor="middle" fill="#E8ECF1" fontFamily={MONO} fontSize="20" fontWeight="600">
        {current[top].toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
      </text>
      <text x={c} y={c + 21} textAnchor="middle" fill="#8190A0" fontFamily="Inter, sans-serif" fontSize="11">{TYPE_META[top].plural}</text>
    </svg>
  )
}

/** Mini-gráfico de 30 dias */
export function Sparkline({ data, height = 52 }: { data: number[]; height?: number }) {
  const gid = useId()
  const W = 300, H = height
  const min = Math.min(...data), max = Math.max(...data)
  const up = data[data.length - 1] >= data[0]
  const color = up ? '#2EBD85' : '#FF5A6E'
  const x = (i: number) => (W * i) / (data.length - 1)
  const y = (v: number) => 4 + (H - 8) * (1 - (v - min) / (max - min || 1))
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label="Gráfico de 30 dias" className="block">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".18" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}
