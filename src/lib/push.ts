import { supabase } from './supabase'

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on'

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
}

export async function pushState(): Promise<PushState> {
  // No iPhone, o push só existe com o app instalado na tela inicial
  if (isIOS() && !isStandalone()) return 'needs-install'
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

function keyBytes(b64: string) {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

/** Pede permissão, inscreve este aparelho e salva a inscrição. Retorna erro ou null. */
export async function enablePush(): Promise<string | null> {
  if (!supabase) return 'Disponível só com o Supabase configurado.'
  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return 'Permissão de notificação negada.'
    const { data, error } = await supabase.functions.invoke('quotes', { body: { action: 'push-key' } })
    if (error || !data?.key) return 'Não foi possível obter a chave de notificações.'
    const reg = await registration()
    await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(data.key) })
    const j = sub.toJSON()
    const { error: e2 } = await supabase.from('push_subscriptions').upsert({
      endpoint: sub.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth, user_agent: navigator.userAgent.slice(0, 200),
    })
    return e2 ? `Erro ao salvar: ${e2.message}` : null
  } catch (e) {
    return `Não foi possível ativar: ${String((e as Error)?.message ?? e)}`
  }
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await supabase?.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

export async function sendTestPush(): Promise<string | null> {
  if (!supabase) return 'Disponível só com o Supabase configurado.'
  const { data, error } = await supabase.functions.invoke('quotes', { body: { action: 'push-test' } })
  if (error) return 'Falha ao enviar o teste.'
  if (!data?.devices) return 'Nenhum aparelho inscrito.'
  return data.sent ? null : `Não entregue (${(data.errors ?? []).join('; ') || 'erro desconhecido'})`
}
