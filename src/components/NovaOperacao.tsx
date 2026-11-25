import { useMemo, useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { Field, Modal, TypeBadge } from './ui'
import AssetSearch from './AssetSearch'
import { uid, useStore, type SearchResult } from '../data/store'
import { positions } from '../lib/calc'
import { brl, decimal, parseBR } from '../lib/format'

const today = () => new Date().toISOString().slice(0, 10)

export default function NovaOperacao({ onClose }: { onClose: () => void }) {
  const { transactions, addTransaction, ensureQuote, quotes } = useStore()
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [side, setSide] = useState<'compra' | 'venda'>('compra')
  const [asset, setAsset] = useState<SearchResult | null>(null)
  const [qtyS, setQtyS] = useState('')
  const [priceS, setPriceS] = useState('')
  const [feesS, setFeesS] = useState('0,00')
  const [date, setDate] = useState(today())
  const [touched, setTouched] = useState(false)

  const pos = useMemo(() => (asset ? positions(transactions).get(asset.ticker) : undefined), [asset, transactions])
  const qty = parseBR(qtyS), price = parseBR(priceS), fees = parseBR(feesS) || 0
  const subtotal = qty > 0 && price > 0 ? qty * price : 0
  const total = side === 'compra' ? subtotal + fees : subtotal - fees

  const errors = {
    asset: !asset ? 'Escolha um ativo' : '',
    qty: !(qty > 0) ? 'Informe uma quantidade maior que zero'
      : side === 'venda' && qty > (pos?.qty ?? 0) ? `Você tem ${decimal(pos?.qty ?? 0, 0)} para vender` : '',
    price: !(price > 0) ? 'Informe um valor maior que zero' : '',
  }
  const valid = !errors.asset && !errors.qty && !errors.price

  const newAvg = side === 'compra' && valid
    ? ((pos?.qty ?? 0) * (pos?.avgPrice ?? 0) + subtotal + fees) / ((pos?.qty ?? 0) + qty)
    : null

  const submit = async () => {
    setTouched(true)
    if (!valid || !asset) return
    const err = await addTransaction({ id: uid(), ticker: asset.ticker, side, qty, price, fees, date })
    if (err) return setSaveError(err)
    onClose()
  }

  const isCrypto = asset?.type === 'cripto'

  return (
    <Modal
      title="Nova operação" onClose={onClose}
      footer={<>
        <button type="button" className="btn btn-ghost max-lg:h-11" onClick={onClose}>Cancelar</button>
        <button type="button" className={`btn ${side === 'compra' ? 'btn-buy' : 'btn-sell'} max-lg:h-12`} onClick={submit}>
          <Check size={18} aria-hidden="true" />
          {side === 'compra' ? 'Registrar compra' : 'Registrar venda'}
        </button>
      </>}
    >
      {saveError && <p role="alert" className="m-0 text-[13px] text-loss">Não foi possível registrar: {saveError}</p>}
      <div role="group" aria-label="Tipo de operação" className="grid grid-cols-2 gap-1 p-1 bg-s0 border border-line rounded-[10px]">
        {(['compra', 'venda'] as const).map((s) => {
          const on = side === s
          const c = s === 'compra' ? '46,189,133' : '255,90,110'
          return (
            <button key={s} type="button" aria-pressed={on} onClick={() => setSide(s)}
              className="h-10 rounded-[7px] border text-[14px] font-semibold cursor-pointer inline-flex items-center justify-center gap-2"
              style={on
                ? { background: `rgba(${c},0.14)`, borderColor: `rgba(${c},0.45)`, color: s === 'compra' ? '#2EBD85' : '#FF5A6E' }
                : { background: 'transparent', borderColor: 'transparent', color: '#9DA9B7' }}>
              {s === 'compra' ? <Plus size={16} /> : <Minus size={16} />}
              {s === 'compra' ? 'Compra' : 'Venda'}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-2">
        <AssetSearch label="Ativo" value={asset} onSelect={async (q) => {
          setAsset(q)
          if (q.price != null && !priceS) setPriceS(decimal(q.price))
          setLoadingQuote(true)
          const full = await ensureQuote(q)
          setLoadingQuote(false)
          if (full && !priceS) setPriceS(decimal(full.price))
        }} />
        {touched && errors.asset && <span className="text-[12px] text-loss">{errors.asset}</span>}
        {asset && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-tx3">
            <TypeBadge type={asset.type} />
            <span>Cotação <span className="mono text-tx2">{loadingQuote ? 'buscando…' : (quotes.get(asset.ticker)?.price ?? asset.price) != null ? brl((quotes.get(asset.ticker)?.price ?? asset.price)!) : '—'}</span></span>
            {pos && <span>Você tem {decimal(pos.qty, isCrypto ? 4 : 0)} {isCrypto ? asset.ticker : 'cotas'} · PM <span className="mono text-tx2">{brl(pos.avgPrice)}</span></span>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantidade" error={touched ? errors.qty : ''}>
          <span className={`field-box ${touched && errors.qty ? 'error' : ''}`}>
            <input className="mono" inputMode="decimal" placeholder="0" value={qtyS} onChange={(e) => setQtyS(e.target.value)} />
          </span>
        </Field>
        <Field label="Preço unitário" error={touched ? errors.price : ''}>
          <span className={`field-box ${touched && errors.price ? 'error' : ''}`}>
            <span className="prefix">R$</span>
            <input className="mono" inputMode="decimal" placeholder="0,00" value={priceS} onChange={(e) => setPriceS(e.target.value)} />
          </span>
        </Field>
        <Field label="Taxas">
          <span className="field-box">
            <span className="prefix">R$</span>
            <input className="mono" inputMode="decimal" placeholder="0,00" value={feesS} onChange={(e) => setFeesS(e.target.value)} />
          </span>
        </Field>
        <Field label="Data">
          <span className="field-box">
            <input type="date" className="mono" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </span>
        </Field>
      </div>

      <div className="rounded-[10px] bg-s0 border border-line p-4 flex flex-col gap-2 text-[13px]">
        <div className="flex justify-between text-tx2">
          <span>Subtotal{subtotal ? ` · ${decimal(qty, isCrypto ? 4 : 0)} × ${brl(price)}` : ''}</span>
          <span className="mono">{brl(subtotal)}</span>
        </div>
        <div className="flex justify-between text-tx2"><span>Taxas</span><span className="mono">{brl(fees)}</span></div>
        <div className="flex justify-between pt-2 border-t border-line font-semibold text-tx">
          <span>Total da operação</span><span className="mono text-[15px]">{brl(Math.max(0, total))}</span>
        </div>
      </div>

      {newAvg != null && asset && (
        <div className="text-[13px] text-tx2">
          Novo preço médio de {asset.ticker}: <span className="mono font-semibold text-accent">{brl(newAvg)}</span>
          <span className="text-tx3"> · {decimal((pos?.qty ?? 0) + qty, isCrypto ? 4 : 0)} {isCrypto ? asset.ticker : 'cotas'}</span>
        </div>
      )}
    </Modal>
  )
}
