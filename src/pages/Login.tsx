import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Logo } from '../components/ui'
import { useStore } from '../data/store'

export default function Login() {
  const { login, demo } = useStore()
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg flex items-center justify-center px-6 py-12">
      <svg aria-hidden="true" viewBox="0 0 1440 360" preserveAspectRatio="none" width="100%" height="360" className="absolute inset-x-0 bottom-0 opacity-55">
        {[40, 120, 200, 280].map((y) => <line key={y} x1="0" x2="1440" y1={y} y2={y} stroke="#242B34" strokeOpacity=".5" />)}
        <path d="M0 226 L98 284 L146 320 L244 277 L390 300 L488 251 L634 266 L732 211 L829 143 L927 117 L976 169 L1098 152 L1195 101 L1293 80 L1342 101 L1440 80"
          fill="none" stroke="#313A45" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="relative w-[400px] max-w-full lg:bg-s1 lg:border lg:border-line lg:rounded-[14px] lg:pt-9 lg:px-8 lg:pb-8 flex flex-col gap-7 lg:shadow-[0_24px_80px_rgba(0,0,0,.45)]">
        <div className="flex flex-col gap-[18px]">
          <Logo />
          <div>
            <h1 className="m-0 text-[22px] max-lg:text-[24px] font-semibold tracking-[-.01em]">Acesse sua carteira</h1>
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
