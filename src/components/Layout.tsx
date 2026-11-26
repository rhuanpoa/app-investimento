import { NavLink, Outlet } from 'react-router-dom'
import { CircleHelp, Newspaper, SlidersHorizontal, Wallet, type LucideIcon } from 'lucide-react'
import UserMenu from './UserMenu'
import { useStore } from '../data/store'
import { Ambient, Logo } from './ui'
import { pctArrow, toneOf } from '../lib/format'

const NAV: { to: string; label: string; short: string; icon: LucideIcon }[] = [
  { to: '/carteira', label: 'Minha Carteira', short: 'Carteira', icon: Wallet },
  { to: '/painel', label: 'Painel do Investidor', short: 'Painel', icon: SlidersHorizontal },
  { to: '/noticias', label: 'Notícias e Mercado', short: 'Notícias', icon: Newspaper },
  { to: '/ajuda', label: 'Central de Ajuda', short: 'Ajuda', icon: CircleHelp },
]

function TickerStrip() {
  const { indices } = useStore()
  if (!indices.length) return <div className="sticky top-0 z-20 h-[34px] flex-none glass-bar border-b border-line max-lg:hidden" aria-hidden="true" />
  const reps = Math.max(2, Math.ceil(8 / indices.length) * 2)
  const items = Array.from({ length: reps }, () => indices).flat()
  return (
    <div aria-label="Índices de mercado" className="sticky top-0 z-20 h-[34px] flex-none glass-bar border-b border-line overflow-hidden flex items-center max-lg:hidden">
      <div className="ticker-mask w-full h-full overflow-hidden flex items-center">
      <div className="ticker-track">
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-2 mr-10 whitespace-nowrap" aria-hidden={i >= indices.length}>
            <span className="mono text-[12px] font-semibold text-tx3 tracking-[.04em]">{it.label}</span>
            <span className="mono text-[12.5px] font-medium text-tx">{it.value}</span>
            <span className={`mono text-[12px] font-medium ${toneOf(it.change)}`}>{pctArrow(it.change)}</span>
          </span>
        ))}
      </div>
      </div>
    </div>
  )
}

export default function Layout() {
  const { demo, quoteErrors } = useStore()
  const notice = demo
    ? { title: 'Modo demonstração.', long: 'Dados de exemplo até ligar o Supabase e as cotações reais.', short: 'Dados de exemplo.' }
    : quoteErrors.length
      ? { title: 'Cotações incompletas.', long: `Alguns preços não foram atualizados (${quoteErrors.slice(0, 2).join('; ')}).`, short: 'Alguns preços não atualizaram.' }
      : null

  return (
    <div className="relative min-h-screen flex flex-col bg-bg text-tx isolate">
      <Ambient />
      <TickerStrip />

      {/* Cabeçalho do celular */}
      <header className="lg:hidden sticky top-0 z-30 h-14 flex-none flex items-center justify-between pl-4 pr-2 glass-bar border-b border-line">
        <Logo />
        <UserMenu compact />
      </header>

      <div className="relative z-[1] flex flex-1">
        {/* Menu lateral (desktop) */}
        <aside className="max-lg:hidden sticky top-[34px] h-[calc(100dvh-34px)] flex-[0_0_232px] w-[232px] glass-bar border-r border-line flex flex-col pt-[18px] px-3 pb-4">
          <div className="pt-1 px-2 pb-[22px]"><Logo /></div>
          <nav aria-label="Navegação principal" className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={19} strokeWidth={1.75} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex-1" />
          {notice && (
            <div className="mx-1 mb-3 p-3 rounded-lg text-[12px] leading-[1.45] text-tx2" style={{ background: 'rgba(245,184,61,0.08)', border: '1px solid rgba(245,184,61,0.3)' }}>
              <span className="font-semibold text-accent">{notice.title}</span> {notice.long}
            </div>
          )}
          <div className="pt-2 border-t border-line">
            <UserMenu />
          </div>
        </aside>

        <main className="page-in flex-1 min-w-0 px-4 pt-4 pb-28 lg:px-10 lg:pt-7 lg:pb-16 flex flex-col gap-4 lg:gap-6">
          {notice && (
            <div className="lg:hidden p-3 rounded-lg text-[12px] text-tx2" style={{ background: 'rgba(245,184,61,0.08)', border: '1px solid rgba(245,184,61,0.3)' }}>
              <span className="font-semibold text-accent">{notice.title}</span> {notice.short}
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* Barra inferior (celular) */}
      <nav aria-label="Navegação principal" className="mnav lg:hidden fixed z-30 grid grid-cols-4">
        {NAV.map(({ to, short, icon: Icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `flex flex-col items-center justify-center gap-1 min-h-16 text-[11px] ${isActive ? 'active text-accent font-semibold' : 'text-tx2 font-medium'}`}>
            <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
            {short}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
