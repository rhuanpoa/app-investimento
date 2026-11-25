import { useMemo, useState, type DragEvent } from 'react'
import { BellRing, Check, GripVertical, Plus, Save, TrendingUp, Trash2, X } from 'lucide-react'
import { uid, useStore } from '../data/store'
import { NEWS_SOURCES } from '../data/mock'
import type { AlertKind, AssetType, InvestorProfile, PriceAlert, RiskProfile } from '../data/types'
import type { SearchResult } from '../data/store'
import { ALERT_LABEL, alertTriggered, holdings, monthsToGoal, totals } from '../lib/calc'
import { brl, decimal, parseBR, pct } from '../lib/format'
import { Card, Delta, Field, PageHeader, SectionHead, Seg, Toggle, TYPE_META, TypeBadge } from '../components/ui'
import AssetSearch from '../components/AssetSearch'

const RISKS: { value: RiskProfile; desc: string }[] = [
  { value: 'Conservador', desc: 'Prioriza estabilidade: mais peso em FIIs e ações pagadoras de dividendos, pouca cripto.' },
  { value: 'Moderado', desc: 'Equilíbrio entre renda e crescimento, com cripto em uma fatia pequena.' },
  { value: 'Arrojado', desc: 'Aceita oscilações fortes em busca de retorno: mais peso em ações e cripto.' },
]

function alertValue(a: PriceAlert) {
  if (a.kind === 'dy_min') return pct(a.value, 0)
  if (a.kind === 'pvp_max') return decimal(a.value)
  return brl(a.value)
}

function monthsText(m: number) {
  if (!Number.isFinite(m)) return 'Meta fora de alcance com esse aporte'
  if (m === 0) return 'Meta já atingida'
  const y = Math.floor(m / 12), r = m % 12
  const parts = [y ? `${y} ${y === 1 ? 'ano' : 'anos'}` : '', r ? `${r} ${r === 1 ? 'mês' : 'meses'}` : ''].filter(Boolean)
  return `Cerca de ${parts.join(' e ')}`
}

function NovoAlerta({ onAdd, onCancel }: { onAdd: (a: PriceAlert) => void; onCancel: () => void }) {
  const { ensureQuote } = useStore()
  const [asset, setAsset] = useState<SearchResult | null>(null)
  const [kind, setKind] = useState<AlertKind>('preco_abaixo')
  const [val, setVal] = useState('')
  const v = parseBR(val)
  const ok = asset && v > 0
  return (
    <div className="flex flex-col gap-3 p-4 rounded-[10px] bg-s0 border border-line">
      <AssetSearch label="Ativo" value={asset} onSelect={(q) => { setAsset(q); void ensureQuote(q) }} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Condição">
          <span className="field-box">
            <select value={kind} onChange={(e) => setKind(e.target.value as AlertKind)}>
              {(Object.keys(ALERT_LABEL) as AlertKind[]).map((k) => <option key={k} value={k}>{ALERT_LABEL[k].kind} {ALERT_LABEL[k].verb.replace('com ', '')}</option>)}
            </select>
          </span>
        </Field>
        <Field label="Valor">
          <span className="field-box">
            {kind.startsWith('preco') && <span className="prefix">R$</span>}
            <input className="mono" inputMode="decimal" placeholder="0,00" value={val} onChange={(e) => setVal(e.target.value)} />
            {kind === 'dy_min' && <span className="prefix">%</span>}
          </span>
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn btn-primary" disabled={!ok}
          onClick={() => ok && onAdd({ id: uid(), ticker: asset.ticker, kind, value: v, active: true })}>
          <Check size={18} />Criar alerta
        </button>
      </div>
    </div>
  )
}

export default function Painel() {
  const store = useStore()
  const { quotes, transactions, savePanel, ensureQuote } = store
  const [p, setP] = useState<InvestorProfile>(store.profile)
  const [goalS, setGoalS] = useState(decimal(store.profile.goal))
  const [monthlyS, setMonthlyS] = useState(decimal(store.profile.monthly))
  const [watch, setWatch] = useState<string[]>(store.watchlist)
  const [alerts, setAlerts] = useState<PriceAlert[]>(store.alerts)
  const [adding, setAdding] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)

  const patrimony = useMemo(() => totals(holdings(transactions, quotes)).value, [transactions, quotes])
  const sum = p.targets.acao + p.targets.fii + p.targets.cripto
  const goal = parseBR(goalS) || 0
  const monthly = parseBR(monthlyS) || 0
  const progress = goal ? Math.min(100, (patrimony / goal) * 100) : 0
  const months = monthsToGoal(patrimony, monthly, goal)
  const eta = Number.isFinite(months) && months > 0
    ? (() => { const d = new Date(); d.setMonth(d.getMonth() + months); return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('. de ', '/').replace(' de ', '/') })()
    : ''

  const dirty = JSON.stringify({ ...p, goal, monthly }) !== JSON.stringify(store.profile)
    || JSON.stringify(watch) !== JSON.stringify(store.watchlist)
    || JSON.stringify(alerts) !== JSON.stringify(store.alerts)

  const [saveError, setSaveError] = useState('')
  const save = async () => {
    if (sum !== 100) return
    const err = await savePanel({ profile: { ...p, goal, monthly }, watchlist: watch, alerts })
    setSaveError(err ?? '')
    if (err) return
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const setTarget = (k: AssetType, v: number) => setP((s) => ({ ...s, targets: { ...s.targets, [k]: v } }))

  const onDrop = (e: DragEvent, to: number) => {
    e.preventDefault()
    if (dragIdx == null || dragIdx === to) return
    const list = [...watch]
    const [m] = list.splice(dragIdx, 1)
    list.splice(to, 0, m)
    setWatch(list)
    setDragIdx(null)
  }
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= watch.length) return
    const list = [...watch];[list[i], list[j]] = [list[j], list[i]]; setWatch(list)
  }

  return (
    <>
      <PageHeader
        title="Painel do Investidor"
        subtitle="Perfil, metas, lista de acompanhamento e alertas"
        action={
          <button type="button" className="btn btn-primary max-lg:w-full max-lg:h-12" onClick={save} disabled={sum !== 100 || (!dirty && !saved)}>
            {saved ? <Check size={18} /> : <Save size={18} />}{saved ? 'Salvo' : 'Salvar alterações'}
          </button>
        }
      />

      {saveError && <p role="alert" className="m-0 text-[13px] text-loss">Não foi possível salvar: {saveError}</p>}
      <div className="flex flex-wrap gap-4 items-start">
        {/* Coluna esquerda */}
        <div className="flex-[1_1_520px] min-w-0 flex flex-col gap-4">
          <Card className="p-4 lg:p-5">
            <div className="flex flex-col gap-4">
              <SectionHead n={1} title="Perfil de risco" />
              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Perfil de risco">
                {RISKS.map((r) => {
                  const on = p.risk === r.value
                  return (
                    <label key={r.value} className="flex-[1_1_150px] min-w-0 flex flex-col gap-2 p-3.5 rounded-[10px] cursor-pointer border"
                      style={on ? { background: 'rgba(245,184,61,0.07)', borderColor: 'rgba(245,184,61,0.6)' } : { background: '#181D24', borderColor: '#313A45' }}>
                      <span className="flex items-center gap-2.5 text-[14px] font-semibold">
                        <input type="radio" name="risk" value={r.value} checked={on} onChange={() => setP((s) => ({ ...s, risk: r.value }))}
                          className="m-0 w-[18px] h-[18px]" style={{ accentColor: '#F5B83D' }} />
                        {r.value}
                      </span>
                      <span className="text-[12.5px] leading-[1.5] text-tx2">{r.desc}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </Card>

          <Card className="p-4 lg:p-5">
            <div className="flex flex-col gap-3">
              <SectionHead n={2} title="Metas de alocação" desc="Arraste para ajustar. A soma precisa fechar em 100%." />
              {(['acao', 'fii', 'cripto'] as AssetType[]).map((k) => (
                <div key={k} className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2"><TypeBadge type={k} /><span className="text-[13px]">{TYPE_META[k].plural}</span></span>
                    <span className="mono text-[13px] font-semibold">{p.targets[k]}%</span>
                  </div>
                  <input type="range" min={0} max={100} step={5} className="rng" aria-label={`Meta de ${TYPE_META[k].plural}`}
                    value={p.targets[k]} onChange={(e) => setTarget(k, +e.target.value)}
                    style={{ ['--p' as string]: `${p.targets[k]}%`, ['--c' as string]: TYPE_META[k].color }} />
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t border-line">
                <span className="text-[13px] text-tx2">Total das metas</span>
                <span className="flex items-center gap-2.5">
                  <span className="mono text-[14px] font-semibold">{sum}%</span>
                  {sum === 100 ? (
                    <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-[5px] text-[11px] font-semibold text-profit" style={{ background: 'rgba(46,189,133,0.12)', border: '1px solid rgba(46,189,133,0.35)' }}>
                      <Check size={12} strokeWidth={2.4} />soma 100%
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-[5px] text-[11px] font-semibold text-loss" style={{ background: 'rgba(255,90,110,0.1)', border: '1px solid rgba(255,90,110,0.45)' }}>
                      <X size={12} strokeWidth={2.4} />{sum > 100 ? `sobram ${sum - 100} pp` : `faltam ${100 - sum} pp`}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4 lg:p-5">
            <div className="flex flex-col gap-4">
              <SectionHead n={3} title="Meta de patrimônio e aporte mensal" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Meta de patrimônio">
                  <span className="field-box"><span className="prefix">R$</span><input className="mono" inputMode="decimal" value={goalS} onChange={(e) => setGoalS(e.target.value)} /></span>
                </Field>
                <Field label="Aporte mensal">
                  <span className="field-box"><span className="prefix">R$</span><input className="mono" inputMode="decimal" value={monthlyS} onChange={(e) => setMonthlyS(e.target.value)} /></span>
                </Field>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-baseline">
                  <span className="mono text-[20px] font-semibold text-accent">{pct(progress)}</span>
                  <span className="text-[12px] text-tx3">faltam <span className="mono text-tx2">{brl(Math.max(0, goal - patrimony))}</span></span>
                </div>
                <div className="h-2 rounded-full bg-s3 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between mono text-[11.5px] text-tx3"><span>{brl(patrimony)}</span><span>{brl(goal)}</span></div>
              </div>
              <div className="flex gap-3 items-start p-3.5 rounded-[10px] bg-s2 border border-line">
                <TrendingUp size={20} className="text-accent flex-none mt-0.5" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                  <span className="text-[14px] font-semibold">{monthsText(months)} {eta && <span className="mono text-tx2 font-medium">({eta})</span>}</span>
                  <span className="text-[12px] text-tx3">Retorno de 8,0% ao ano, constante. Projeção, não garantia.</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Coluna direita */}
        <div className="flex-[1_1_440px] min-w-0 flex flex-col gap-4">
          <Card className="p-4 lg:p-5">
            <div className="flex flex-col gap-3">
              <SectionHead n={4} title="Ativos acompanhados" desc="Aparecem em Notícias e Mercado. Arraste para reordenar." />
              <AssetSearch label="Adicionar à lista" placeholder="Buscar ticker (ex.: VALE3)" exclude={watch}
                onSelect={(q) => { setWatch((w) => [...w, q.ticker]); void ensureQuote(q) }} />
              <div>
                {watch.map((t, i) => {
                  const q = quotes.get(t)
                  return (
                    <div key={t} draggable onDragStart={() => setDragIdx(i)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, i)}
                      className={`flex items-center gap-2 min-h-14 pl-1 border-t border-line ${dragIdx === i ? 'opacity-50' : ''}`}>
                      <button type="button" aria-label={`Mover ${t} (setas para reordenar)`} className="w-7 h-11 inline-flex items-center justify-center text-tx3 cursor-grab bg-transparent border-0 p-0"
                        onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); move(i, -1) } if (e.key === 'ArrowDown') { e.preventDefault(); move(i, 1) } }}>
                        <GripVertical size={18} />
                      </button>
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="mono text-[14px] font-semibold">{t}</span>
                        {q && <TypeBadge type={q.type} />}
                        <span className="text-[12px] text-tx3 truncate max-sm:hidden">{q?.name ?? 'buscando cotação…'}</span>
                      </div>
                      <span className="w-[112px] text-right mono text-[13px] font-medium whitespace-nowrap">{q ? brl(q.price) : '—'}</span>
                      <span className="w-[72px] text-right">{q && <Delta value={q.changeDay} />}</span>
                      <button type="button" className="btn-icon" aria-label={`Remover ${t}`} onClick={() => setWatch((w) => w.filter((x) => x !== t))}><Trash2 size={18} /></button>
                    </div>
                  )
                })}
                {!watch.length && <p className="text-[13px] text-tx3 m-0 py-4 border-t border-line">Nenhum ativo na lista.</p>}
              </div>
            </div>
          </Card>

          <Card className="p-4 lg:p-5">
            <div className="flex flex-col gap-3">
              <SectionHead n={5} title="Alertas" desc="Avisos quando uma condição for atingida."
                action={!adding && <button type="button" className="btn btn-secondary h-10" onClick={() => setAdding(true)}><Plus size={18} />Novo alerta</button>} />
              {adding && <NovoAlerta onCancel={() => setAdding(false)} onAdd={(a) => { setAlerts((s) => [...s, a]); setAdding(false) }} />}
              <div>
                {alerts.map((a) => {
                  const fired = alertTriggered(a, quotes.get(a.ticker))
                  return (
                    <div key={a.id} className="flex items-center gap-3 min-h-16 border-t border-line">
                      <span className="w-9 h-9 rounded-full flex-none inline-flex items-center justify-center"
                        style={fired ? { background: 'rgba(245,184,61,0.12)', border: '1px solid rgba(245,184,61,0.35)' } : { background: '#181D24', border: '1px solid #313A45' }}>
                        <BellRing size={17} className={fired ? 'text-accent' : 'text-tx3'} aria-hidden="true" />
                      </span>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="text-[14px]">
                          <span className="mono font-semibold">{a.ticker}</span> {ALERT_LABEL[a.kind].verb} <span className="mono font-semibold">{alertValue(a)}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[12px] text-tx3">{ALERT_LABEL[a.kind].kind} · avisa uma vez por dia</span>
                          {fired && (
                            <span className="inline-flex items-center gap-1 h-5 px-[7px] rounded text-[10.5px] font-semibold text-accent" style={{ background: 'rgba(245,184,61,0.14)', border: '1px solid rgba(245,184,61,0.4)' }}>
                              <BellRing size={11} />disparado hoje
                            </span>
                          )}
                        </div>
                      </div>
                      <Toggle label={`Alerta ${a.ticker}`} on={a.active} onChange={(v) => setAlerts((s) => s.map((x) => (x.id === a.id ? { ...x, active: v } : x)))} />
                      <button type="button" className="btn-icon max-sm:hidden" aria-label={`Excluir alerta ${a.ticker}`} onClick={() => setAlerts((s) => s.filter((x) => x.id !== a.id))}><Trash2 size={18} /></button>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          <Card className="p-4 lg:p-5">
            <div className="flex flex-col gap-4">
              <SectionHead n={6} title="Preferências" />
              <div className="flex flex-col gap-2">
                <span className="text-[13px] text-tx2">Atualizar cotações a cada</span>
                <div><Seg mono label="Intervalo de atualização" value={String(p.refreshSeconds)} onChange={(v) => setP((s) => ({ ...s, refreshSeconds: +v }))}
                  options={[{ value: '30', label: '30 s' }, { value: '60', label: '1 min' }, { value: '300', label: '5 min' }, { value: '900', label: '15 min' }]} /></div>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] text-tx2 mb-1">Fontes de notícias ativas</span>
                {NEWS_SOURCES.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 min-h-14 border-t border-line">
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className="text-[14px] font-medium">{s.name}</span>
                      <span className="text-[12px] text-tx3">{s.desc}</span>
                    </div>
                    <Toggle label={s.name} on={!!p.sources[s.id]} onChange={(v) => setP((x) => ({ ...x, sources: { ...x.sources, [s.id]: v } }))} />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
