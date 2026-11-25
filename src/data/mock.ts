/**
 * Dados de exemplo (modo demonstração).
 * Enquanto o Supabase e as cotações reais (brapi.dev / CoinGecko) não estão ligados,
 * o app usa estes valores — os mesmos do design.
 */
import type { Dividend, HelpItem, InvestorProfile, NewsItem, PriceAlert, Quote, Transaction } from './types'

/** PRNG determinístico para gerar históricos estáveis entre recargas */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/** 365 fechamentos terminando em `price`, com variação de `chg30` % nos últimos 30 dias */
function makeHistory(price: number, chg30: number, vol: number, seed: number): number[] {
  const r = rng(seed)
  const n = 365
  const out = new Array<number>(n)
  out[n - 1] = price
  for (let i = n - 1; i > 0; i--) {
    const step = (r() - 0.5) * 2 * vol
    out[i - 1] = out[i] / (1 + step)
  }
  // Ajusta os últimos 30 dias para bater a variação desejada
  const target = price / (1 + chg30 / 100)
  const k = n - 31
  const factor = target / out[k]
  for (let i = 0; i <= k; i++) out[i] *= factor
  for (let i = k + 1; i < n - 1; i++) {
    const t = (i - k) / (n - 1 - k)
    out[i] *= factor * (1 - t) + 1 * t
  }
  return out
}

type Q = Omit<Quote, 'history'> & { chg30: number; vol: number }

const base: Q[] = [
  { ticker: 'PETR4', name: 'Petrobras PN', type: 'acao', price: 36.85, changeDay: 1.24, chg30: 6.2, vol: 0.018, pl: 4.1, dy: 14.2, pvp: 1.12 },
  { ticker: 'ITSA4', name: 'Itaúsa PN', type: 'acao', price: 10.42, changeDay: -0.38, chg30: -1.8, vol: 0.012, pl: 7.8, dy: 8.9, pvp: 1.45 },
  { ticker: 'MXRF11', name: 'Maxi Renda FII', type: 'fii', price: 9.64, changeDay: -0.62, chg30: -3.4, vol: 0.006, dy: 12.4, pvp: 0.96 },
  { ticker: 'HGLG11', name: 'CSHG Logística FII', type: 'fii', price: 164.3, changeDay: 0.41, chg30: 2.1, vol: 0.007, dy: 8.7, pvp: 1.02 },
  { ticker: 'BTC', name: 'Bitcoin', type: 'cripto', price: 352400, changeDay: 2.15, chg30: 11.5, vol: 0.03, marketCap: 6.97e12 },
  { ticker: 'ETH', name: 'Ethereum', type: 'cripto', price: 16900, changeDay: -1.08, chg30: -7.9, vol: 0.035, marketCap: 2.04e12 },
  // Catálogo extra para a busca de ativos (exemplo)
  { ticker: 'VALE3', name: 'Vale ON', type: 'acao', price: 61.2, changeDay: 0.35, chg30: 1.4, vol: 0.016, pl: 6.3, dy: 9.1, pvp: 1.28 },
  { ticker: 'BBAS3', name: 'Banco do Brasil ON', type: 'acao', price: 27.9, changeDay: -0.21, chg30: 2.8, vol: 0.014, pl: 4.6, dy: 10.3, pvp: 0.82 },
  { ticker: 'KNRI11', name: 'Kinea Renda Imobiliária FII', type: 'fii', price: 141.5, changeDay: 0.12, chg30: 0.9, vol: 0.006, dy: 8.2, pvp: 0.97 },
  { ticker: 'SOL', name: 'Solana', type: 'cripto', price: 1050, changeDay: 3.4, chg30: 14.2, vol: 0.045, marketCap: 4.9e11 },
]

export const QUOTES: Quote[] = base.map(({ chg30, vol, ...q }, i) => ({
  ...q,
  history: makeHistory(q.price, chg30, vol, 1000 + i * 77),
}))

export const INDICES = [
  { label: 'IBOV', value: '128.430,12', change: 0.62 },
  { label: 'IFIX', value: '3.412,55', change: -0.18 },
  { label: 'USD/BRL', value: '5,4213', change: -0.31 },
  { label: 'BTC', value: 'R$ 352.400', change: 2.15 },
]

export const TRANSACTIONS: Transaction[] = [
  { id: 't1', ticker: 'PETR4', side: 'compra', qty: 100, price: 32.4, fees: 0, date: '2025-03-12' },
  { id: 't2', ticker: 'ITSA4', side: 'compra', qty: 300, price: 9.8, fees: 0, date: '2025-04-02' },
  { id: 't3', ticker: 'MXRF11', side: 'compra', qty: 500, price: 10.2, fees: 0, date: '2025-05-20' },
  { id: 't4', ticker: 'HGLG11', side: 'compra', qty: 20, price: 160, fees: 0, date: '2025-06-18' },
  { id: 't5', ticker: 'BTC', side: 'compra', qty: 0.015, price: 310000, fees: 0, date: '2025-08-07' },
  { id: 't6', ticker: 'ETH', side: 'compra', qty: 0.4, price: 17500, fees: 0, date: '2025-09-15' },
]

export const DIVIDENDS: Dividend[] = [
  { id: 'd1', ticker: 'MXRF11', amount: 165.0, date: '2026-10-15' },
  { id: 'd2', ticker: 'HGLG11', amount: 44.0, date: '2026-10-14' },
  { id: 'd3', ticker: 'PETR4', amount: 86.4, date: '2026-08-20' },
  { id: 'd4', ticker: 'ITSA4', amount: 23.0, date: '2026-07-01' },
]

export const WATCHLIST = ['PETR4', 'ITSA4', 'MXRF11', 'HGLG11', 'BTC', 'ETH']

export const ALERTS: PriceAlert[] = [
  { id: 'a1', ticker: 'PETR4', kind: 'preco_abaixo', value: 35, active: true },
  { id: 'a2', ticker: 'MXRF11', kind: 'dy_min', value: 12, active: true },
  { id: 'a3', ticker: 'HGLG11', kind: 'pvp_max', value: 0.95, active: false },
  { id: 'a4', ticker: 'BTC', kind: 'preco_acima', value: 360000, active: true },
]

export const NEWS_SOURCES = [
  { id: 'mercado', name: 'Mercado Diário', desc: 'Bolsa, juros e câmbio' },
  { id: 'fiis', name: 'Radar de FIIs', desc: 'Fundos imobiliários' },
  { id: 'cripto', name: 'Cripto em Foco', desc: 'Bitcoin, Ethereum e mercado cripto' },
  { id: 'agencia', name: 'Agência Bolsa', desc: 'Resultados e proventos' },
]

export const PROFILE: InvestorProfile = {
  risk: 'Moderado',
  targets: { acao: 40, fii: 40, cripto: 20 },
  goal: 100000,
  monthly: 1000,
  refreshSeconds: 60,
  sources: { mercado: true, fiis: true, cripto: true, agencia: true },
}

export const NEWS: NewsItem[] = [
  { id: 'n1', title: 'Petrobras: produção sobe no trimestre e reforça expectativa de dividendos', source: 'Agência Bolsa', minutesAgo: 18, tickers: ['PETR4'], url: '#' },
  { id: 'n2', title: 'Fundos de papel mantêm distribuições estáveis em meio a juros altos', source: 'Radar de FIIs', minutesAgo: 42, tickers: ['MXRF11'], url: '#' },
  { id: 'n3', title: 'Bitcoin avança com entrada de recursos em ETFs e testa novas máximas do mês', source: 'Cripto em Foco', minutesAgo: 60, tickers: ['BTC'], url: '#' },
  { id: 'n4', title: 'Ibovespa fecha em alta com commodities; dólar recua frente ao real', source: 'Mercado Diário', minutesAgo: 120, tickers: ['PETR4', 'ITSA4'], url: '#' },
  { id: 'n5', title: 'Galpões logísticos: vacância cai e fundos do setor reforçam resultado', source: 'Radar de FIIs', minutesAgo: 180, tickers: ['HGLG11'], url: '#' },
  { id: 'n6', title: 'Ethereum perde força após atualização de rede e recua no dia', source: 'Cripto em Foco', minutesAgo: 240, tickers: ['ETH'], url: '#' },
  { id: 'n7', title: 'Itaúsa divulga pagamento de proventos; veja datas e valores', source: 'Agência Bolsa', minutesAgo: 300, tickers: ['ITSA4'], url: '#' },
  { id: 'n8', title: 'Copom: mercado reduz apostas de corte e a curva de juros sobe', source: 'Mercado Diário', minutesAgo: 360, tickers: [], url: '#' },
]

export const HELP_CATEGORIES = [
  { id: 'siglas', name: 'Siglas dos tickers' },
  { id: 'indicadores', name: 'Indicadores' },
  { id: 'tipos', name: 'Tipos de ativos' },
  { id: 'impostos', name: 'Impostos e IR' },
] as const

export const HELP_ITEMS: HelpItem[] = [
  // Siglas
  { id: 'final-3', category: 'siglas', thumb: '3', title: 'Final 3: ação ordinária (ON)', summary: 'Dá direito a voto em assembleias. É o tipo mais comum entre as empresas listadas.' },
  { id: 'final-4', category: 'siglas', thumb: '4', title: 'Final 4: ação preferencial (PN)', summary: 'Tem prioridade no recebimento de dividendos, em geral sem direito a voto.' },
  { id: 'final-5-6', category: 'siglas', thumb: '5/6', title: 'Finais 5 e 6: PNA e PNB', summary: 'Preferenciais de classes A e B, com direitos definidos no estatuto da empresa.' },
  {
    id: 'final-11', category: 'siglas', thumb: '11', title: 'Final 11: units, FIIs e ETFs',
    summary: 'Três produtos diferentes usam o mesmo final. Veja como diferenciar um do outro.',
    body: {
      intro: 'Um ticker terminado em 11 pode ser de três produtos diferentes: units, fundos imobiliários (FIIs) e ETFs. O número sozinho não diz qual deles é.',
      heading: 'Como diferenciar',
      examples: [
        { ticker: 'KLBN11', text: 'Unit: um pacote com ações ON e PN da mesma empresa, negociado como um único papel.' },
        { ticker: 'MXRF11', text: 'FII: cota de um fundo imobiliário, que costuma distribuir rendimentos todo mês.' },
        { ticker: 'BOVA11', text: 'ETF: fundo negociado em bolsa que replica um índice, no caso o Ibovespa.' },
      ],
      note: 'Na dúvida, confira o nome completo do ativo na B3 ou na sua corretora antes de comprar.',
      suffix: '11',
    },
  },
  { id: 'final-f', category: 'siglas', thumb: 'F', title: 'Final F: mercado fracionário', summary: 'A letra F indica negociação em lotes menores que o lote padrão de 100.' },
  { id: 'final-3f-4f', category: 'siglas', thumb: '3F·4F', title: 'Finais 3F e 4F', summary: 'Versões fracionárias de ações ON e PN: mesmo papel, negociado em quantidades menores.' },
  { id: 'final-34-35', category: 'siglas', thumb: '34/35', title: 'Finais 34 e 35: BDRs', summary: 'Recibos de ações de empresas estrangeiras negociados na B3, como AAPL34.' },
  // Indicadores
  { id: 'pl', category: 'indicadores', thumb: 'P/L', title: 'P/L: preço sobre lucro', summary: 'Quantos anos de lucro atual seriam necessários para "pagar" o preço da ação.' },
  { id: 'pvp', category: 'indicadores', thumb: 'P/VP', title: 'P/VP: preço sobre valor patrimonial', summary: 'Compara o preço de mercado com o patrimônio contábil. Muito usado para FIIs e bancos.' },
  { id: 'dy', category: 'indicadores', thumb: 'DY', title: 'Dividend Yield (DY)', summary: 'Proventos pagos nos últimos 12 meses divididos pelo preço atual, em %.' },
  { id: 'roe', category: 'indicadores', thumb: 'ROE', title: 'ROE: retorno sobre o patrimônio', summary: 'Mede quanto lucro a empresa gera com o capital dos acionistas.' },
  { id: 'liquidez', category: 'indicadores', thumb: 'LIQ', title: 'Liquidez diária', summary: 'Volume negociado por dia. Baixa liquidez dificulta comprar e vender pelo preço justo.' },
  // Tipos
  { id: 'acao', category: 'tipos', thumb: 'AÇÃO', title: 'Ações', summary: 'Pequenas partes de uma empresa listada em bolsa. Você vira sócio do negócio.' },
  { id: 'fii', category: 'tipos', thumb: 'FII', title: 'Fundos imobiliários (FIIs)', summary: 'Fundos que investem em imóveis ou títulos do setor e distribuem rendimentos mensais.' },
  { id: 'etf', category: 'tipos', thumb: 'ETF', title: 'ETFs', summary: 'Fundos negociados em bolsa que replicam um índice, como o Ibovespa.' },
  { id: 'bdr', category: 'tipos', thumb: 'BDR', title: 'BDRs', summary: 'Certificados que representam ações de empresas estrangeiras, negociados na B3.' },
  { id: 'cripto', category: 'tipos', thumb: 'BTC', title: 'Criptomoedas', summary: 'Ativos digitais descentralizados, com alta volatilidade e negociação 24 horas.' },
  // Impostos
  { id: 'ir-acoes', category: 'impostos', thumb: 'IR', title: 'IR sobre ações', summary: 'Vendas de até R$ 20 mil por mês em ações são isentas no swing trade; acima disso, 15% sobre o lucro.' },
  { id: 'ir-fiis', category: 'impostos', thumb: 'FII', title: 'IR sobre FIIs', summary: 'Rendimentos mensais costumam ser isentos para pessoa física; o ganho na venda paga 20%.' },
  { id: 'darf', category: 'impostos', thumb: 'DARF', title: 'Como emitir a DARF', summary: 'O imposto sobre o lucro é pago até o último dia útil do mês seguinte à venda.' },
  { id: 'ir-cripto', category: 'impostos', thumb: 'BTC', title: 'IR sobre criptomoedas', summary: 'Regras de isenção e alíquotas para ganhos com cripto e como declarar.' },
]
