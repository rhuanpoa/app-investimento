import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing, ChartPie, Eye, EyeOff, Lock, Mail, Newspaper } from 'lucide-react'
import { Ambient, Logo } from '../components/ui'
import { useStore } from '../data/store'
import { pctArrow, toneOf } from '../lib/format'

const FEATURES = [
  { icon: ChartPie, text: 'Lucro e prejuízo de cada ativo da sua carteira' },
  { icon: BellRing, text: 'Metas de alocação e alertas de preço' },
  { icon: Newspaper, text: 'Notícias dos ativos que você acompanha' },
]

export default function Login() {
  const { login, demo, indices } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Informe um e-mail válido.')
    if (!password) return setError('Informe a senha.')
    setBusy(true)
    const err = await login(email.trim(), password) // modo demonstração: qualquer senha entra
    setBusy(false)
    if (err) return setError(err)
    navigate('/carteira')
  }

  const chips = indices.filter((i) => ['IBOV', 'BTC', 'IFIX'].includes(i.label))

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg isolate flex flex-wrap items-center justify-center gap-[72px] px-6 py-12 lg:px-14">
      <Ambient />
      <svg aria-hidden="true" viewBox="0 0 1440 360" preserveAspectRatio="none" width="100%" height="360" className="absolute inset-x-0 bottom-0 opacity-55 -z-[1]">
        {[40, 120, 200, 280].map((y) => <line key={y} x1="0" x2="1440" y1={y} y2={y} stroke="rgba(255,255,255,.06)" />)}
        <path d="M0 226 L98 284 L146 320 L244 277 L390 300 L488 251 L634 266 L732 211 L829 143 L927 117 L976 169 L1098 152 L1195 101 L1293 80 L1342 101 L1440 80"
          fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Apresentação (desktop) */}
      <div className="hi relative flex-[0_1_540px] min-w-[300px] flex-col items-start gap-7 hidden lg:flex" style={{ '--d': '100ms' } as React.CSSProperties}>
        <span className="pill"><span className="pd" />Cotações da B3 com atraso de até 30 min</span>
        <div className="font-[family-name:var(--font-display)] text-[60px] leading-[1.02] font-bold tracking-[-.045em] text-[#F4F6F9]">
          Sua carteira, suas metas e o <span className="gt">mercado</span> num só lugar
        </div>
        <div className="flex flex-col gap-3.5">
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3.5">
              <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-accent" style={{ background: 'rgba(245,184,61,.1)', border: '1px solid rgba(245,184,61,.3)' }}>
                <Icon size={19} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="text-[15px] text-[#C3CCD6]">{text}</span>
            </div>
          ))}
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {chips.map((c, i) => (
              <span key={c.label} className="hc fl" style={{ animationDuration: `${5 + i}s`, animationDelay: `-${i * 1.5}s` }}>
                <span className="mono text-[12.5px] font-semibold text-tx3">{c.label}</span>
                <span className={`mono text-[12.5px] font-semibold ${toneOf(c.change)}`}>{pctArrow(c.change)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Formulário */}
      <div className="hi relative w-[400px] max-w-full card-lg lg:pt-9 lg:px-8 lg:pb-8 flex flex-col gap-7" style={{ '--d': '250ms' } as React.CSSProperties}>
        <div className="flex flex-col gap-[18px]">
          <Logo />
          <div>
            <h1 className="m-0 text-[24px] font-semibold tracking-[-.02em]">Acesse sua <span className="gt">carteira</span></h1>
            <p className="mt-1.5 mb-0 text-[14px] text-tx2">Entre com o e-mail e a senha do seu perfil.</p>
          </div>
        </div>
        <form className="flex flex-col gap-4 m-0" onSubmit={submit} noValidate>
          <label className="field">
            <span className="field-label">E-mail</span>
            <span className="field-box h-12">
              <Mail size={18} color="#8190A0" strokeWidth={1.75} aria-hidden="true" />
              <input type="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} />
            </span>
          </label>
          <label className="field">
            <span className="field-label">Senha</span>
            <span className="field-box h-12 pr-1">
              <Lock size={18} color="#8190A0" strokeWidth={1.75} aria-hidden="true" />
              <input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} />
              <button type="button" className="btn-icon" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShow((s) => !s)}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {error && <span role="alert" className="text-[12px] text-loss -mt-2">{error}</span>}
          <button type="submit" className="btn btn-primary h-12 w-full mt-2" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <div className="flex items-center gap-2 text-[12px] text-tx3">
          <Lock size={14} strokeWidth={1.75} aria-hidden="true" />
          Acesso privado · uso individual{demo ? ' · modo demonstração' : ''}
        </div>
      </div>
    </div>
  )
}
