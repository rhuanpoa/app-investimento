import type { AssetType, Holding, PriceAlert, Quote, Transaction } from '../data/types'

export interface Position { qty: number; avgPrice: number }

/** Preço médio ponderado (taxas entram no custo da compra; venda não altera o PM) */
export function positions(txs: Transaction[]): Map<string, Position> {
  const map = new Map<string, Position>()
  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date))
  for (const t of sorted) {
    const p = map.get(t.ticker) ?? { qty: 0, avgPrice: 0 }
    if (t.side === 'compra') {
      const cost = p.qty * p.avgPrice + t.qty * t.price + t.fees
      p.qty += t.qty
      p.avgPrice = p.qty > 0 ? cost / p.qty : 0
    } else {
      p.qty = Math.max(0, p.qty - t.qty)
      if (p.qty === 0) p.avgPrice = 0
    }
    map.set(t.ticker, p)
  }
  for (const [k, v] of map) if (v.qty <= 1e-12) map.delete(k)
  return map
}

export function holdings(txs: Transaction[], quotes: Map<string, Quote>): Holding[] {
  const pos = positions(txs)
  const rows: Holding[] = []
  for (const [ticker, p] of pos) {
    const q = quotes.get(ticker)
    if (!q) continue
    const invested = p.qty * p.avgPrice
    const value = p.qty * q.price
    rows.push({
      ticker, name: q.name, type: q.type, qty: p.qty, avgPrice: p.avgPrice, invested,
      price: q.price, value, pnl: value - invested, pnlPct: invested ? ((value - invested) / invested) * 100 : 0, weight: 0,
    })
  }
  const total = rows.reduce((s, r) => s + r.value, 0)
  for (const r of rows) r.weight = total ? (r.value / total) * 100 : 0
  return rows
}

export function totals(rows: Holding[]) {
  const invested = rows.reduce((s, r) => s + r.invested, 0)
  const value = rows.reduce((s, r) => s + r.value, 0)
  const pnl = value - invested
  return { invested, value, pnl, pnlPct: invested ? (pnl / invested) * 100 : 0 }
}

export function allocation(rows: Holding[]): Record<AssetType, number> {
  const total = rows.reduce((s, r) => s + r.value, 0)
  const out: Record<AssetType, number> = { acao: 0, fii: 0, cripto: 0 }
  for (const r of rows) out[r.type] += total ? (r.value / total) * 100 : 0
  return out
}

/** Série do patrimônio (posição atual × fechamentos históricos) dos últimos `days` dias */
export function portfolioSeries(rows: Holding[], quotes: Map<string, Quote>, days: number): number[] {
  if (!rows.length) return []
  const len = Math.min(days, ...rows.map((r) => quotes.get(r.ticker)?.history.length ?? 0))
  if (len < 2) return []
  const out = new Array<number>(len).fill(0)
  for (const r of rows) {
    const h = quotes.get(r.ticker)!.history
    for (let i = 0; i < len; i++) out[i] += r.qty * h[h.length - len + i]
  }
  return out
}

function stats(xs: number[]) {
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length
  const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, xs.length - 1)
  return { mean, sd: Math.sqrt(variance) }
}

/**
 * Estimativa de 7 dias: retorno médio diário dos últimos 30 dias × 7,
 * com faixa pessimista/otimista de ± 1 desvio-padrão·√7. Não é garantia.
 */
export function projection7d(rows: Holding[], quotes: Map<string, Quote>) {
  let mid = 0, low = 0, high = 0
  for (const r of rows) {
    const h = (quotes.get(r.ticker)?.history ?? []).slice(-31)
    if (h.length < 3) { mid += r.value; low += r.value; high += r.value; continue }
    const rets = h.slice(1).map((p, i) => p / h[i] - 1)
    const { mean, sd } = stats(rets)
    const drift = mean * 7
    const band = sd * Math.sqrt(7)
    mid += r.value * (1 + drift)
    low += r.value * (1 + drift - band)
    high += r.value * (1 + drift + band)
  }
  return { mid, low, high }
}

/** Meses até atingir a meta com aporte mensal e retorno anual constante */
export function monthsToGoal(current: number, monthly: number, goal: number, annualRate = 0.08) {
  if (current >= goal) return 0
  const i = Math.pow(1 + annualRate, 1 / 12) - 1
  let v = current
  for (let m = 1; m <= 1200; m++) {
    v = v * (1 + i) + monthly
    if (v >= goal) return m
  }
  return Infinity
}

export const ALERT_LABEL: Record<PriceAlert['kind'], { verb: string; kind: string }> = {
  preco_abaixo: { verb: 'abaixo de', kind: 'Preço' },
  preco_acima: { verb: 'acima de', kind: 'Preço' },
  dy_min: { verb: 'com DY ≥', kind: 'Dividend Yield' },
  pvp_max: { verb: 'com P/VP ≤', kind: 'P/VP' },
}

/** Retorna a descrição do disparo, ou null se a condição não foi atingida */
export function alertTriggered(a: PriceAlert, q?: Quote): string | null {
  if (!a.active || !q) return null
  switch (a.kind) {
    case 'preco_abaixo': return q.price <= a.value ? 'Preço' : null
    case 'preco_acima': return q.price >= a.value ? 'Preço' : null
    case 'dy_min': return q.dy != null && q.dy >= a.value ? 'DY' : null
    case 'pvp_max': return q.pvp != null && q.pvp <= a.value ? 'P/VP' : null
  }
}
