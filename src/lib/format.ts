const MINUS = '−'

function num(v: number, min = 2, max = min) {
  return Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max })
}

/** R$ 1.234,56 (sinal − para negativos) */
export function brl(v: number, digits = 2) {
  return `${v < 0 ? MINUS : ''}R$ ${num(v, digits)}`
}

/** +R$ 833,00 / −R$ 280,00 */
export function brlSigned(v: number) {
  return `${v < 0 ? MINUS : '+'}R$ ${num(v)}`
}

/** 12,4% */
export function pct(v: number, digits = 2) {
  return `${v < 0 ? MINUS : ''}${num(v, digits)}%`
}

/** ▲ +3,19% / ▼ −5,49% */
export function pctArrow(v: number, digits = 2) {
  if (Math.abs(v) < 1e-9) return `+${num(0, digits)}%`
  return `${v > 0 ? '▲ +' : '▼ ' + MINUS}${num(v, digits)}%`
}

export function decimal(v: number, digits = 2) {
  return `${v < 0 ? MINUS : ''}${num(v, digits)}`
}

/** Valores grandes: R$ 6,97 tri / R$ 450 bi */
export function brlCompact(v: number) {
  if (v >= 1e12) return `R$ ${num(v / 1e12)} tri`
  if (v >= 1e9) return `R$ ${num(v / 1e9)} bi`
  if (v >= 1e6) return `R$ ${num(v / 1e6)} mi`
  return brl(v)
}

export function qty(v: number, type: string, ticker: string) {
  if (type === 'cripto') return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 8 })} ${ticker}`
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

/** Converte "1.234,56" em 1234.56 */
export function parseBR(s: string): number {
  const clean = s.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(clean)
  return Number.isFinite(n) ? n : NaN
}

export function toneOf(v: number) {
  if (v > 1e-9) return 'text-profit'
  if (v < -1e-9) return 'text-loss'
  return 'text-tx2'
}

export function timeAgo(minutes: number) {
  if (minutes < 60) return `há ${Math.round(minutes)} min`
  if (minutes < 60 * 24) return `há ${Math.floor(minutes / 60)} h`
  return `há ${Math.floor(minutes / 1440)} d`
}
