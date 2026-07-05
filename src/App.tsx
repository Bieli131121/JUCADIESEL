import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Clientes from '@/pages/Clientes'
import OrdensServico from '@/pages/OrdensServico'
import OrdemServicoDetalhe from '@/pages/OrdemServicoDetalhe'
import Estoque from '@/pages/Estoque'
import Financeiro from '@/pages/Financeiro'
import Agendamento from '@/pages/Agendamento'
import Relatorios from '@/pages/Relatorios'
import Configuracoes from '@/pages/Configuracoes'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />

            <Route
              path="/clientes"
              element={
                <ProtectedRoute roles={['admin', 'recepcao']}>
                  <Clientes />
                </ProtectedRoute>
              }
            />

            <Route path="/ordens-servico" element={<OrdensServico />} />
            <Route path="/ordens-servico/:id" element={<OrdemServicoDetalhe />} />

            <Route
              path="/estoque"
              element={
                <ProtectedRoute roles={['admin', 'mecanico']}>
                  <Estoque />
                </ProtectedRoute>
              }
            />

            <Route
              path="/financeiro"
              element={
                <ProtectedRoute roles={['admin', 'recepcao']}>
                  <Financeiro />
                </ProtectedRoute>
              }
            />

            <Route
              path="/agendamento"
              element={
                <ProtectedRoute roles={['admin', 'recepcao']}>
                  <Agendamento />
                </ProtectedRoute>
              }
            />

            <Route
              path="/relatorios"
              element={
                <ProtectedRoute roles={['admin']}>
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
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
