import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronUp, Download, LoaderCircle, LogOut, RefreshCw } from 'lucide-react'
import { useStore } from '../data/store'

type VersionState = 'idle' | 'checking' | 'latest' | 'available' | 'error'

function initials(email: string) {
  return (email.split('@')[0].replace(/[^a-z]/gi, '').slice(0, 2) || 'IV').toUpperCase()
}

function hhmm(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function buildLabel(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** Nome/iniciais do usuário que abre o menu: atualizar cotações, buscar nova versão do app e sair */
export default function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user, logout, refreshQuotes, quotesUpdatedAt, demo } = useStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [quoting, setQuoting] = useState(false)
  const [version, setVersion] = useState<VersionState>('idle')
  const ref = useRef<HTMLDivElement>(null)
  const email = user?.email ?? ''

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const updateQuotes = async () => {
    setQuoting(true)
    await refreshQuotes()
    setQuoting(false)
  }

  const checkVersion = async () => {
    setVersion('checking')
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
      if (!r.ok) throw new Error(String(r.status))
      const { build } = await r.json()
      setVersion(build && build !== __BUILD_ID__ ? 'available' : 'latest')
    } catch {
      setVersion('error')
    }
  }

  const reload = () => {
    // Recarrega ignorando o cache, já na mesma tela
    const url = new URL(window.location.href)
    url.searchParams.set('v', Date.now().toString())
    window.location.replace(url.toString())
  }

  const signOut = async () => { await logout(); navigate('/login') }

  const avatar = (size: number) => (
    <span className="rounded-full bg-s3 border border-line-strong inline-flex items-center justify-center flex-none" style={{ width: size, height: size }}>
      <span className="mono text-[12px] font-semibold text-tx">{initials(email)}</span>
    </span>
  )

  const item = 'w-full flex items-center gap-2.5 min-h-11 px-3 rounded-md text-left text-[13.5px] bg-transparent border-0 cursor-pointer text-tx hover:bg-s3 disabled:opacity-60 disabled:cursor-default'

  return (
    <div ref={ref} className="relative">
      <button
        type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        aria-label={compact ? `Conta de ${email}` : undefined}
        className={compact
          ? 'w-11 h-11 inline-flex items-center justify-center rounded-lg bg-transparent border-0 cursor-pointer hover:bg-s2'
          : 'w-full flex items-center gap-2.5 py-2 px-1 rounded-lg bg-transparent border-0 cursor-pointer text-left hover:bg-s2'}
      >
        {avatar(compact ? 34 : 36)}
        {!compact && (
          <>
            <span className="flex flex-col min-w-0 flex-1">
              <span className="text-[13px] font-semibold text-tx">Investidor</span>
              <span className="text-[12px] text-tx3 overflow-hidden text-ellipsis whitespace-nowrap">{email}</span>
            </span>
            <ChevronUp size={16} className={`text-tx3 transition-transform ${open ? '' : 'rotate-180'}`} aria-hidden="true" />
          </>
        )}
      </button>

      {open && (
        <div role="menu" aria-label="Menu da conta"
          className={`absolute z-40 w-[260px] p-1.5 bg-s1 border border-line-strong rounded-[10px] shadow-[0_16px_48px_rgba(0,0,0,.55)] ${compact ? 'right-0 top-full mt-1' : 'left-0 bottom-full mb-2'}`}>
          <div className="px-3 pt-2 pb-2.5 border-b border-line mb-1">
            <div className="text-[13px] font-semibold">Investidor</div>
            <div className="text-[12px] text-tx3 truncate">{email}</div>
          </div>

          {!demo && (
            <button type="button" role="menuitem" className={item} onClick={updateQuotes} disabled={quoting}>
              {quoting ? <LoaderCircle size={17} className="animate-spin text-tx3" /> : <RefreshCw size={17} className="text-tx3" />}
              <span className="flex flex-col">
                <span>Atualizar cotações agora</span>
                <span className="text-[11.5px] text-tx3">{quoting ? 'buscando…' : quotesUpdatedAt ? `última verificação às ${hhmm(quotesUpdatedAt)}` : 'ainda não verificado'}</span>
              </span>
            </button>
          )}

          {version === 'available' ? (
            <button type="button" role="menuitem" className={`${item} text-accent`} onClick={reload}>
              <Download size={17} />
              <span className="flex flex-col">
                <span className="font-semibold">Nova versão disponível</span>
                <span className="text-[11.5px] text-tx3">Clique para recarregar o app</span>
              </span>
            </button>
          ) : (
            <button type="button" role="menuitem" className={item} onClick={checkVersion} disabled={version === 'checking'}>
              {version === 'checking' ? <LoaderCircle size={17} className="animate-spin text-tx3" />
                : version === 'latest' ? <Check size={17} className="text-profit" />
                  : <Download size={17} className="text-tx3" />}
              <span className="flex flex-col">
                <span>Buscar atualização do app</span>
                <span className={`text-[11.5px] ${version === 'error' ? 'text-loss' : 'text-tx3'}`}>
                  {version === 'latest' ? 'Você já está na versão mais recente'
                    : version === 'error' ? 'Não foi possível verificar agora'
                      : `versão de ${buildLabel(__BUILD_ID__)}`}
                </span>
              </span>
            </button>
          )}

          <div className="h-px bg-line my-1" />
          <button type="button" role="menuitem" className={item} onClick={signOut}>
            <LogOut size={17} className="text-tx3" />Sair
          </button>
        </div>
      )}
    </div>
  )
}
