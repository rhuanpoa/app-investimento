import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, Plus } from 'lucide-react'
import { useStore } from '../data/store'
import type { AssetType, Holding } from '../data/types'
import { allocation, holdings, portfolioSeries, projection7d, totals } from '../lib/calc'
import { brl, brlSigned, decimal, pct, pctArrow, qty as fmtQty, toneOf } from '../lib/format'
import { AssetAvatar, Card, Chip, PageHeader, Seg, TYPE_META, TypeBadge } from '../components/ui'
import { AllocationDonut, AreaChart } from '../components/charts'
import NovaOperacao from '../components/NovaOperacao'

type Range = '7D' | '1M' | '6M' | '1A'
const RANGE_DAYS: Record<Range, number> = { '7D': 8, '1M': 31, '6M': 183, '1A': 365 }
const RANGE_TEXT: Record<Range, string> = { '7D': 'em 7 dias', '1M': 'em 30 dias', '6M': 'em 6 meses', '1A': 'em 1 ano' }
const COLS = 'minmax(190px,1.7fr) 78px 96px 112px 112px 124px 132px 120px'

function Kpi({ label, children, foot }: { label: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <Card className="p-4 lg:p-[18px]">
      <div className="flex flex-col justify-between h-full gap-3.5">
        <div className="flex flex-col gap-2">
          <div className="label-caps">{label}</div>
          {children}
        </div>
        {foot}
      </div>
    </Card>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-4">
        {['Total investido', 'Valor atual', 'Lucro / Prejuízo', 'Proventos recebidos'].map((l) => (
          <Kpi key={l} label={l}><span className="mono text-[16px] lg:text-[22px] font-semibold text-tx3">R$ 0,00</span></Kpi>
        ))}
      </div>
      <Card>
        <div className="flex flex-col items-center text-center gap-3.5 py-7 lg:py-16 px-2">
          <svg width="96" height="72" viewBox="0 0 96 72" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="94" height="70" rx="8" stroke="#313A45" strokeDasharray="4 4" />
            <path d="M14 54 L32 40 L46 48 L66 26 L82 32" stroke="#8190A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="82" cy="32" r="3.5" fill="#F5B83D" />
          </svg>
          <div className="flex flex-col gap-1.5 max-w-[420px]">
            <h2 className="m-0 text-[18px] font-semibold">Sua carteira está vazia</h2>
            <p className="m-0 text-[14px] leading-[1.55] text-tx2">Registre sua primeira compra para acompanhar patrimônio, proventos e a distribuição entre ações, FIIs e cripto.</p>
          </div>
          <div className="flex flex-wrap gap-2.5 justify-center mt-1.5">
            <button type="button" className="btn btn-primary h-11" onClick={onNew}><Plus size={18} />Nova operação</button>
            <Link to="/ajuda" className="btn btn-secondary h-11">Entender os tickers</Link>
          </div>
        </div>
      </Card>
    </>
  )
}

function MobileAssetCard({ h }: { h: Holding }) {
  return (
    <Card className="p-3.5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <AssetAvatar ticker={h.ticker} type={h.type} size={34} />
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="mono text-[15px] font-semibold">{h.ticker}</span>
                <TypeBadge type={h.type} />
              </div>
              <span className="text-[12px] text-tx3 truncate">{h.name} · {h.type === 'cripto' ? fmtQty(h.qty, h.type, h.ticker) : `${fmtQty(h.qty, h.type, h.ticker)} cotas`}</span>
            </div>
          </div>
          <div className="text-right flex flex-col gap-[3px]">
            <span className="mono text-[14px] font-semibold">{brl(h.value)}</span>
            <span className={`mono text-[12.5px] font-medium ${toneOf(h.pnl)}`}>{brlSigned(h.pnl)}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-line">
          <div><div className="label-caps text-[10px]">Preço médio</div><div className="mt-1 mono text-[12px] font-medium text-tx2">{brl(h.avgPrice)}</div></div>
          <div><div className="label-caps text-[10px]">Atual</div><div className="mt-1 mono text-[12px] font-medium">{brl(h.price)}</div></div>
          <div className="text-right">
            <div className="label-caps text-[10px]">L/P · % cart.</div>
            <div className="mt-1 flex justify-end gap-2">
              <span className={`mono text-[12px] font-medium ${toneOf(h.pnlPct)}`}>{h.pnlPct >= 0 ? '+' : '−'}{pct(Math.abs(h.pnlPct))}</span>
              <span className="mono text-[12px] font-medium text-tx2">{pct(h.weight, 1)}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function Carteira() {
  const { transactions, dividends, quotes, profile, quotesUpdatedAt } = useStore()
  const [modal, setModal] = useState(false)
  const [range, setRange] = useState<Range>('1M')
  const [filter, setFilter] = useState<'todos' | AssetType>('todos')

  const rows = useMemo(() => holdings(transactions, quotes).sort((a, b) => b.value - a.value), [transactions, quotes])
  const t = totals(rows)
  const alloc = allocation(rows)
  const proj = useMemo(() => projection7d(rows, quotes), [rows, quotes])
  const series = useMemo(() => portfolioSeries(rows, quotes, RANGE_DAYS[range]), [rows, quotes, range])
  const divTotal = dividends.reduce((s, d) => s + d.amount, 0)
  const classes = new Set(rows.map((r) => r.type)).size
  const now = (quotesUpdatedAt ?? new Date()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const shown = filter === 'todos' ? rows : rows.filter((r) => r.type === filter)
  const sChange = series.length ? series[series.length - 1] - series[0] : 0
  const sPct = series.length && series[0] ? (sChange / series[0]) * 100 : 0

  const newBtn = (
    <button type="button" className="btn btn-primary max-lg:w-full max-lg:h-12" onClick={() => setModal(true)}>
      <Plus size={18} aria-hidden="true" />Nova operação
    </button>
  )

  return (
    <>
      <PageHeader
        title="Minha Carteira"
        subtitle={rows.length ? `${rows.length} ativos · cotações verificadas às ${now} (B3 com atraso de até 30 min)` : 'Nenhum ativo cadastrado'}
        action={newBtn}
      />

      {!rows.length ? <EmptyState onNew={() => setModal(true)} /> : (
        <>
          <div className="grid gap-2.5 lg:gap-4 grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
            <Kpi label="Total investido" foot={<div className="text-[12px] text-tx3">{rows.length} ativos em {classes} {classes === 1 ? 'classe' : 'classes'}</div>}>
              <span className="mono text-[16px] lg:text-[22px] font-semibold">{brl(t.invested)}</span>
            </Kpi>
            <Kpi label="Valor atual" foot={<div className="text-[12px] text-tx3">cotações das {now}</div>}>
              <span className="mono text-[16px] lg:text-[22px] font-semibold">{brl(t.value)}</span>
            </Kpi>
            <Kpi label="Lucro / Prejuízo" foot={<div className="flex items-center gap-2"><span className={`mono text-[13px] font-semibold ${toneOf(t.pnl)}`}>{pctArrow(t.pnlPct)}</span><span className="text-[12px] text-tx3 max-lg:hidden">sobre o investido</span></div>}>
              <span className={`mono text-[16px] lg:text-[22px] font-semibold ${toneOf(t.pnl)}`}>{brlSigned(t.pnl)}</span>
            </Kpi>
            <Kpi label="Proventos recebidos" foot={<div className="text-[12px] text-tx3">últimos 12 meses</div>}>
              <span className="mono text-[16px] lg:text-[22px] font-semibold">{brl(divTotal)}</span>
            </Kpi>
            <Card className="p-4 lg:p-[18px] max-lg:col-span-2" style={{ borderColor: 'rgba(245,184,61,0.28)' }}>
              <div className="flex flex-col gap-3 h-full justify-between">
                <div className="flex flex-col gap-2">
                  <div className="label-caps">Estimativa 7 dias</div>
                  <span className="mono text-[16px] lg:text-[22px] font-semibold">{brl(proj.mid)}</span>
                  <div className="flex gap-4">
                    <span className="flex flex-col"><span className="mono text-[12px] font-medium text-loss">▼ {decimal(proj.low)}</span><span className="text-[11px] text-tx3">pessimista</span></span>
                    <span className="flex flex-col"><span className="mono text-[12px] font-medium text-profit">▲ {decimal(proj.high)}</span><span className="text-[11px] text-tx3">otimista</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-tx3"><Info size={13} aria-hidden="true" />estimativa, não é garantia</div>
              </div>
            </Card>
          </div>

          <div className="flex flex-wrap gap-4 items-stretch">
            <div className="flex-[2_1_520px] min-w-0">
              <Card className="p-4 lg:p-5 h-full">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <h2 className="h-card">Evolução do patrimônio</h2>
                      <div className="flex flex-wrap items-baseline gap-x-2.5">
                        <span className="mono text-[18px] font-semibold">{brl(t.value)}</span>
                        <span className={`mono text-[12.5px] font-medium ${toneOf(sChange)}`}>{sChange >= 0 ? '▲' : '▼'} {brlSigned(sChange)} ({sPct >= 0 ? '+' : '−'}{pct(Math.abs(sPct))})</span>
                        <span className="text-[12px] text-tx3">{RANGE_TEXT[range]}</span>
                      </div>
                    </div>
                    <Seg mono label="Período" value={range} onChange={setRange}
                      options={(['7D', '1M', '6M', '1A'] as Range[]).map((r) => ({ value: r, label: r }))} />
                  </div>
                  <AreaChart data={series} baseline={t.invested} label="Evolução do patrimônio" />
                  <div className="flex gap-4 text-[12px] text-tx3">
                    <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 bg-tx" />Patrimônio</span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-tx3" />Investido <span className="mono">{brl(t.invested)}</span></span>
                  </div>
                </div>
              </Card>
            </div>
            <div className="flex-[1_1_320px] min-w-0">
              <Card className="p-4 lg:p-5 h-full">
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="h-card">Alocação por tipo</h2>
                    <div className="text-[12px] text-tx3 mt-1">anel externo: atual · interno: meta</div>
                  </div>
                  <div className="flex justify-center"><AllocationDonut current={alloc} target={profile.targets} /></div>
                  <div className="flex flex-col">
                    <div className="grid grid-cols-[minmax(0,1fr)_62px_62px_74px] gap-2 pb-2 label-caps text-[10px]">
                      <span /><span className="text-right">Atual</span><span className="text-right">Meta</span><span className="text-right">Dif.</span>
                    </div>
                    {(['acao', 'fii', 'cripto'] as AssetType[]).map((k) => {
                      const diff = alloc[k] - profile.targets[k]
                      return (
                        <div key={k} className="grid grid-cols-[minmax(0,1fr)_62px_62px_74px] gap-2 items-center min-h-9 border-t border-line">
                          <span className="inline-flex items-center gap-2 text-[13px]"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: TYPE_META[k].color }} />{TYPE_META[k].plural}</span>
                          <span className="mono text-[12.5px] text-right">{pct(alloc[k], 1)}</span>
                          <span className="mono text-[12.5px] text-right text-tx2">{pct(profile.targets[k], 0)}</span>
                          <span className={`mono text-[12.5px] text-right ${Math.abs(diff) < 0.05 ? 'text-tx2' : diff > 0 ? 'text-accent' : 'text-tx2'}`}>{diff >= 0 ? '+' : '−'}{decimal(Math.abs(diff), 1)} pp</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="lg:bg-s1 lg:border lg:border-line lg:rounded-[10px] lg:overflow-hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap lg:py-3 lg:px-5 max-lg:mb-3">
              <h2 className="h-card">Ativos<span className="text-tx3 font-normal ml-1.5">{shown.length}</span></h2>
              <div className="flex gap-2 overflow-x-auto hs">
                <Chip active={filter === 'todos'} onClick={() => setFilter('todos')}>Todos</Chip>
                {(['acao', 'fii', 'cripto'] as AssetType[]).map((k) => (
                  <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{TYPE_META[k].plural}</Chip>
                ))}
              </div>
            </div>

            {/* Tabela (desktop) */}
            <div className="max-lg:hidden overflow-x-auto hs">
              <div className="min-w-[1060px]" role="table" aria-label="Ativos da carteira">
                <div role="row" className="grid gap-3 items-center h-9 px-5 bg-s0 border-t border-line" style={{ gridTemplateColumns: COLS }}>
                  {['Ativo', 'Tipo', 'Qtd.', 'Preço médio', 'Preço atual', 'Valor total', 'L/P', '% carteira'].map((h, i) => (
                    <div role="columnheader" key={h} className={`label-caps ${i > 1 ? 'text-right' : ''}`}>{h}</div>
                  ))}
                </div>
                {shown.map((h) => (
                  <div role="row" key={h.ticker} className="grid gap-3 items-center min-h-[58px] px-5 border-t border-line hover:bg-s2/50" style={{ gridTemplateColumns: COLS }}>
                    <div role="cell" className="flex items-center gap-3">
                      <AssetAvatar ticker={h.ticker} type={h.type} />
                      <div className="flex flex-col min-w-0">
                        <span className="mono text-[14px] font-semibold">{h.ticker}</span>
                        <span className="text-[12px] text-tx3 truncate">{h.name}</span>
                      </div>
                    </div>
                    <div role="cell"><TypeBadge type={h.type} /></div>
                    <div role="cell" className="text-right mono text-[13px] font-medium">{fmtQty(h.qty, h.type, h.ticker)}</div>
                    <div role="cell" className="text-right mono text-[13px] font-medium text-tx2">{brl(h.avgPrice)}</div>
                    <div role="cell" className="text-right mono text-[13px] font-medium">{brl(h.price)}</div>
                    <div role="cell" className="text-right mono text-[13px] font-medium">{brl(h.value)}</div>
                    <div role="cell" className="text-right flex flex-col gap-0.5">
                      <span className={`mono text-[13px] font-semibold ${toneOf(h.pnl)}`}>{brlSigned(h.pnl)}</span>
                      <span className={`mono text-[12px] font-medium ${toneOf(h.pnl)}`}>{pctArrow(h.pnlPct)}</span>
                    </div>
                    <div role="cell" className="text-right mono text-[13px] font-medium text-tx2">{pct(h.weight)}</div>
                  </div>
                ))}
                {filter === 'todos' && (
                  <div role="row" className="grid gap-3 items-center min-h-[52px] px-5 border-t border-line-strong bg-s2" style={{ gridTemplateColumns: COLS }}>
                    <div role="cell" className="text-[13px] font-semibold">Total</div>
                    <div role="cell" /><div role="cell" /><div role="cell" /><div role="cell" />
                    <div role="cell" className="text-right mono text-[13px] font-semibold">{brl(t.value)}</div>
                    <div role="cell" className="text-right flex flex-col gap-0.5">
                      <span className={`mono text-[13px] font-semibold ${toneOf(t.pnl)}`}>{brlSigned(t.pnl)}</span>
                      <span className={`mono text-[12px] font-medium ${toneOf(t.pnl)}`}>{pctArrow(t.pnlPct)}</span>
                    </div>
                    <div role="cell" className="text-right mono text-[13px] font-medium text-tx2">100,00%</div>
                  </div>
                )}
              </div>
            </div>

            {/* Cards (celular) */}
            <div className="lg:hidden flex flex-col gap-2.5">
              {shown.map((h) => <MobileAssetCard key={h.ticker} h={h} />)}
            </div>
          </div>
        </>
      )}

      {modal && <NovaOperacao onClose={() => setModal(false)} />}
    </>
  )
}
