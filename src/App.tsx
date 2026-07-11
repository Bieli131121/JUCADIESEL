import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/layout/Layout'
import Login from '@/pages/Login'

// Carregamento sob demanda: cada tela vira um arquivo .js separado, baixado só
// na hora que o usuário navega até ela — em vez de tudo junto num pacote único
// gigante logo na abertura do sistema. Login fica de fora (carrega direto),
// já que é a primeira coisa que qualquer pessoa vê.
const AprovarOrcamento = lazy(() => import('@/pages/AprovarOrcamento'))
const PainelInicio = lazy(() => import('@/pages/PainelInicio'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Clientes = lazy(() => import('@/pages/Clientes'))
const Veiculos = lazy(() => import('@/pages/Veiculos'))
const OrdensServico = lazy(() => import('@/pages/OrdensServico'))
const OrdemServicoDetalhe = lazy(() => import('@/pages/OrdemServicoDetalhe'))
const Estoque = lazy(() => import('@/pages/Estoque'))
const Mecanicos = lazy(() => import('@/pages/Mecanicos'))
const Fornecedores = lazy(() => import('@/pages/Fornecedores'))
const OrdensCompra = lazy(() => import('@/pages/OrdensCompra'))
const OrdemCompraDetalhe = lazy(() => import('@/pages/OrdemCompraDetalhe'))
const Revisoes = lazy(() => import('@/pages/Revisoes'))
const MensagensWhatsapp = lazy(() => import('@/pages/MensagensWhatsapp'))
const Financeiro = lazy(() => import('@/pages/Financeiro'))
const Agendamento = lazy(() => import('@/pages/Agendamento'))
const Relatorios = lazy(() => import('@/pages/Relatorios'))
const Configuracoes = lazy(() => import('@/pages/Configuracoes'))

function CarregandoTela() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="w-8 h-8 border-2 border-torque border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
    <ToastProvider>
      <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<CarregandoTela />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/aprovar/:token" element={<AprovarOrcamento />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<PainelInicio />} />
            <Route
              path="/indicadores"
              element={
                <ProtectedRoute roles={['admin', 'gerente', 'financeiro']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/clientes"
              element={
                <ProtectedRoute roles={['admin', 'recepcao', 'gerente', 'financeiro']}>
                  <Clientes />
                </ProtectedRoute>
              }
            />

            <Route
              path="/veiculos"
              element={
                <ProtectedRoute roles={['admin', 'recepcao', 'gerente', 'financeiro']}>
                  <Veiculos />
                </ProtectedRoute>
              }
            />

            <Route path="/ordens-servico" element={<OrdensServico />} />
            <Route path="/ordens-servico/:id" element={<OrdemServicoDetalhe />} />

            <Route
              path="/estoque"
              element={
                <ProtectedRoute roles={['admin', 'mecanico', 'gerente']}>
                  <Estoque />
                </ProtectedRoute>
              }
            />

            <Route
              path="/mecanicos"
              element={
                <ProtectedRoute roles={['admin', 'gerente']}>
                  <Mecanicos />
                </ProtectedRoute>
              }
            />

            <Route
              path="/fornecedores"
              element={
                <ProtectedRoute roles={['admin', 'gerente']}>
                  <Fornecedores />
                </ProtectedRoute>
              }
            />

            <Route
              path="/ordens-compra"
              element={
                <ProtectedRoute roles={['admin', 'gerente']}>
                  <OrdensCompra />
                </ProtectedRoute>
              }
            />

            <Route
              path="/ordens-compra/:id"
              element={
                <ProtectedRoute roles={['admin', 'gerente']}>
                  <OrdemCompraDetalhe />
                </ProtectedRoute>
              }
            />

            <Route
              path="/revisoes"
              element={
                <ProtectedRoute roles={['admin', 'recepcao', 'gerente']}>
                  <Revisoes />
                </ProtectedRoute>
              }
            />

            <Route
              path="/mensagens-whatsapp"
              element={
                <ProtectedRoute roles={['admin', 'recepcao', 'gerente']}>
                  <MensagensWhatsapp />
                </ProtectedRoute>
              }
            />

            <Route
              path="/financeiro"
              element={
                <ProtectedRoute roles={['admin', 'recepcao', 'gerente', 'financeiro']}>
                  <Financeiro />
                </ProtectedRoute>
              }
            />

            <Route
              path="/agendamento"
              element={
                <ProtectedRoute roles={['admin', 'recepcao', 'gerente']}>
                  <Agendamento />
                </ProtectedRoute>
              }
            />

            <Route
              path="/relatorios"
              element={
                <ProtectedRoute roles={['admin', 'gerente', 'financeiro']}>
                  <Relatorios />
                </ProtectedRoute>
              }
            />

            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Configuracoes />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NaoEncontrado />} />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </ToastProvider>
    </ThemeProvider>
  )
}

function NaoEncontrado() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-2">
      <p className="font-display text-2xl font-semibold text-ink">Página não encontrada</p>
      <p className="text-ink-soft text-sm">O endereço acessado não existe neste sistema.</p>
      <Link to="/" className="text-torque text-sm font-medium hover:underline mt-2">← Voltar para o Painel</Link>
    </div>
  )
}
