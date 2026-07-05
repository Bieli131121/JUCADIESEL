import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
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
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/ordens-servico" element={<OrdensServico />} />
          <Route path="/ordens-servico/:id" element={<OrdemServicoDetalhe />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/agendamento" element={<Agendamento />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
