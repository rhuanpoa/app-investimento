import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { StoreProvider, useStore } from './data/store'
import Layout from './components/Layout'
import Login from './pages/Login'
import Carteira from './pages/Carteira'
import Painel from './pages/Painel'
import Noticias from './pages/Noticias'
import Ajuda from './pages/Ajuda'
import AjudaDetalhe from './pages/AjudaDetalhe'

function Protected() {
  const { user } = useStore()
  return user ? <Layout /> : <Navigate to="/login" replace />
}

function App() {
  const { user, ready } = useStore()
  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-[13px] text-tx3" role="status">Carregando…</div>
  }
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/carteira" replace /> : <Login />} />
      <Route element={<Protected />}>
        <Route path="/carteira" element={<Carteira />} />
        <Route path="/painel" element={<Painel />} />
        <Route path="/noticias" element={<Noticias />} />
        <Route path="/ajuda" element={<Ajuda />} />
        <Route path="/ajuda/:id" element={<AjudaDetalhe />} />
      </Route>
      <Route path="*" element={<Navigate to="/carteira" replace />} />
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      {/* HashRouter: evita 404 ao recarregar páginas internas no GitHub Pages */}
      <HashRouter>
        <App />
      </HashRouter>
    </StoreProvider>
  </StrictMode>,
)
