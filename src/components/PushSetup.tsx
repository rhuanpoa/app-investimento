import { useEffect, useState } from 'react'
import { BellOff, BellRing, LoaderCircle, Send, Smartphone } from 'lucide-react'
import { useStore } from '../data/store'
import { disablePush, enablePush, pushState, sendTestPush, type PushState } from '../lib/push'

/** Ativa as notificações dos alertas neste aparelho */
export default function PushSetup() {
  const { demo } = useStore()
  const [state, setState] = useState<PushState | 'loading'>('loading')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => { pushState().then(setState).catch(() => setState('unsupported')) }, [])

  const run = async (fn: () => Promise<string | null>, okText: string) => {
    setBusy(true); setMsg(null)
    const err = await fn()
    setMsg(err ? { ok: false, text: err } : { ok: true, text: okText })
    setState(await pushState().catch(() => 'unsupported' as const))
    setBusy(false)
  }

  const text: Record<PushState | 'loading', string> = {
    loading: 'Verificando…',
    on: 'Ativas neste aparelho. O servidor confere seus alertas a cada 15 minutos, mesmo com o app fechado.',
    off: 'Receba no celular quando um alerta for atingido (no máximo 1 aviso por dia por alerta).',
    denied: 'As notificações estão bloqueadas para este site. Libere nas configurações do navegador e volte aqui.',
    'needs-install': 'No iPhone: toque em Compartilhar → "Adicionar à Tela de Início", abra o Vértice pelo ícone e ative aqui.',
    unsupported: 'Este navegador não aceita notificações. No celular, use o Chrome (Android) ou instale o app na tela inicial (iPhone).',
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-s0 p-3.5 mt-1">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-full flex-none inline-flex items-center justify-center bg-s2 border border-line-strong">
          {state === 'on' ? <BellRing size={17} className="text-profit" /> : <Smartphone size={17} className="text-tx3" />}
        </span>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-[14px] font-medium">Notificações no celular {state === 'on' && <span className="text-profit text-[12px] font-semibold ml-1">● ativas</span>}</span>
          <span className="text-[12.5px] text-tx3">{demo ? 'Disponível quando o app está conectado ao Supabase.' : text[state]}</span>
        </div>
      </div>
      {!demo && (state === 'off' || state === 'on') && (
        <div className="flex flex-wrap gap-2">
          {state === 'off' ? (
            <button type="button" className="btn btn-primary h-10" disabled={busy} onClick={() => run(async () => { const e = await enablePush(); if (!e) await sendTestPush(); return e }, 'Pronto! Enviamos uma notificação de teste.')}>
              {busy ? <LoaderCircle size={17} className="animate-spin" /> : <BellRing size={17} />}Ativar neste aparelho
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary h-10" disabled={busy} onClick={() => run(sendTestPush, 'Teste enviado. Deve chegar em alguns segundos.')}>
                {busy ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={16} />}Enviar teste
              </button>
              <button type="button" className="btn btn-ghost h-10" disabled={busy} onClick={() => run(async () => { await disablePush(); return null }, 'Notificações desativadas neste aparelho.')}>
                <BellOff size={16} />Desativar
              </button>
            </>
          )}
        </div>
      )}
      {msg && <span role="status" className={`text-[12.5px] ${msg.ok ? 'text-profit' : 'text-loss'}`}>{msg.text}</span>}
    </div>
  )
}
