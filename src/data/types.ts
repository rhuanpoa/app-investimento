export type AssetType = 'acao' | 'fii' | 'cripto'

export interface Quote {
  ticker: string
  name: string
  type: AssetType
  price: number
  changeDay: number // %
  /** Fechamentos diários, do mais antigo ao mais recente (último = preço atual) */
  history: number[]
  pl?: number
  dy?: number
  pvp?: number
  marketCap?: number
}

export interface Transaction {
  id: string
  ticker: string
  side: 'compra' | 'venda'
  qty: number
  price: number
  fees: number
  date: string // AAAA-MM-DD
}

export interface Dividend {
  id: string
  ticker: string
  amount: number
  date: string
}

export type AlertKind = 'preco_abaixo' | 'preco_acima' | 'dy_min' | 'pvp_max'

export interface PriceAlert {
  id: string
  ticker: string
  kind: AlertKind
  value: number
  active: boolean
}

export type RiskProfile = 'Conservador' | 'Moderado' | 'Arrojado'

export interface InvestorProfile {
  risk: RiskProfile
  targets: Record<AssetType, number>
  goal: number
  monthly: number
  refreshSeconds: number
  sources: Record<string, boolean>
}

export type HelpCategory = 'siglas' | 'indicadores' | 'tipos' | 'impostos'

export interface HelpItem {
  id: string
  category: HelpCategory
  /** Rótulo do thumbnail quando não há vídeo (ex.: "11", "P/L") */
  thumb: string
  title: string
  summary: string
  youtubeId?: string
  body?: {
    intro: string
    heading?: string
    examples?: { ticker: string; text: string }[]
    note?: string
    /** Sufixo usado para listar ativos da carteira (ex.: "11") */
    suffix?: string
  }
}

export interface NewsItem {
  id: string
  title: string
  source: string
  minutesAgo: number
  tickers: string[]
  url: string
}

export interface Holding {
  ticker: string
  name: string
  type: AssetType
  qty: number
  avgPrice: number
  invested: number
  price: number
  value: number
  pnl: number
  pnlPct: number
  weight: number
}
