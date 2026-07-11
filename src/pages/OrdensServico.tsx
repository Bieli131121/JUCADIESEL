import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Wrench } from 'lucide-react'
import { listOrdensServico, listClientes, listVeiculos, listMecanicos, criarOrdemServico } from '@/lib/db'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Placa } from '@/components/ui/Placa'
import { Modal } from '@/components/ui/Modal'
import { ModalNovoCliente } from '@/components/ModalNovoCliente'
import { ModalNovoVeiculo } from '@/components/ModalNovoVeiculo'
import { Button } from '@/components/ui/Button'
import { SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { paginar } from '@/lib/paginar'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import type { OrdemServico, Cliente, Veiculo, Mecanico, StatusOS } from '@/types/database'
import { STATUS_OS_LABELS } from '@/types/database'
import { formatMoney } from '@/lib/format'
import { FiltroChip } from '@/components/ui/FiltroChip'

export default function OrdensServico() {
  const [os, setOs] = useState<OrdemServico[]>([])
  const [filtro, setFiltro] = useState<StatusOS | 'todas'>('todas')
  const [pagina, setPagina] = useState(1)
  const ITENS_POR_PAGINA = 15
  const [loading, setLoading] = useState(true)
  const [modalNova, setModalNova] = useState(false)

  async function carregar() {
    setLoading(true)
    setOs(await listOrdensServico())
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const filtradas = filtro === 'todas' ? os : os.filter((o) => o.status === filtro)
  const filtradasPaginadas = paginar(filtradas, pagina, ITENS_POR_PAGINA)

  function mudarFiltro(f: StatusOS | 'todas') {
    setFiltro(f)
    setPagina(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Ordens de Serviço</h1>
          <p className="text-ink-soft text-sm mt-1">{os.length} ordens no total</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalNova(true)}>
          Nova OS
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <FiltroChip label="Todas" active={filtro === 'todas'} onClick={() => mudarFiltro('todas')} shrink />
        {(Object.keys(STATUS_OS_LABELS) as StatusOS[]).map((s) => (
          <FiltroChip key={s} label={STATUS_OS_LABELS[s]} active={filtro === s} onClick={() => mudarFiltro(s)} shrink />
        ))}
      </div>

      {loading ? (
        <SkeletonList rows={6} />
      ) : (
        <div className="card divide-y divide-border">
          {filtradasPaginadas.map((o) => (
            <Link
              key={o.id}
              to={`/ordens-servico/${o.id}`}
              className="flex items-center gap-4 p-4 hover:bg-canvas transition-colors"
            >
              <span className="font-mono text-xs text-ink-soft w-14 shrink-0">#{o.numero}</span>
              {o.veiculo && <Placa placa={o.veiculo.placa} />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{o.cliente?.nome}</p>
                <p className="text-xs text-ink-soft truncate">{o.veiculo?.marca} {o.veiculo?.modelo}</p>
              </div>
              <span className="font-mono text-sm text-ink hidden sm:block">{formatMoney(o.valor_total)}</span>
              <StatusBadge status={o.status} />
            </Link>
          ))}
          {filtradas.length === 0 && (
            <EmptyState icon={Wrench} title="Nenhuma OS encontrada para esse filtro" />
          )}
        </div>
      )}
      <Pagination paginaAtual={pagina} totalItens={filtradas.length} itensPorPagina={ITENS_POR_PAGINA} onMudarPagina={setPagina} />

      <ModalNovaOS open={modalNova} onClose={() => setModalNova(false)} onSaved={carregar} />
    </div>
  )
}



function ModalNovaOS({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast()
  const { usuario } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([])
  const [form, setForm] = useState({
    cliente_id: '',
    veiculo_id: '',
    mecanico_id: '',
    km_entrada: '',
    defeito_relatado: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [modalClienteAberto, setModalClienteAberto] = useState(false)
  const [modalVeiculoAberto, setModalVeiculoAberto] = useState(false)

  useEffect(() => {
    if (open) {
      Promise.all([listClientes(), listVeiculos(), listMecanicos()]).then(([c, v, m]) => {
        setClientes(c)
        setVeiculos(v)
        setMecanicos(m)
      })
    }
  }, [open])

  function aoCriarCliente(novoCliente: Cliente) {
    setClientes((atuais) => [...atuais, novoCliente].sort((a, b) => a.nome.localeCompare(b.nome)))
    setForm((f) => ({ ...f, cliente_id: novoCliente.id, veiculo_id: '' }))
  }

  function aoCriarVeiculo(novoVeiculo: Veiculo) {
    setVeiculos((atuais) => [...atuais, novoVeiculo])
    setForm((f) => ({ ...f, veiculo_id: novoVeiculo.id }))
  }

  const veiculosDoCliente = veiculos.filter((v) => v.cliente_id === form.cliente_id)

  async function salvar() {
    if (!form.cliente_id || !form.veiculo_id) return
    setSalvando(true)
    try {
      const nova = await criarOrdemServico({
        cliente_id: form.cliente_id,
        veiculo_id: form.veiculo_id,
        mecanico_id: form.mecanico_id || null,
        km_entrada: form.km_entrada ? Number(form.km_entrada) : null,
        defeito_relatado: form.defeito_relatado || null,
        criado_por: usuario?.nome || null,
      })
      showToast(`OS #${nova.numero} criada como orçamento.`, 'success')
      onClose()
      onSaved()
      window.location.href = `/ordens-servico/${nova.id}`
    } catch {
      showToast('Não foi possível criar a OS.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title="Nova ordem de serviço" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between">
            <label className="label-field">Cliente *</label>
            <button type="button" className="text-xs text-torque font-medium hover:underline mb-1.5" onClick={() => setModalClienteAberto(true)}>
              + Novo cliente
            </button>
          </div>
          <select
            className="input-field"
            value={form.cliente_id}
            onChange={(e) => setForm({ ...form, cliente_id: e.target.value, veiculo_id: '' })}
          >
            <option value="">Selecione...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label-field">Veículo *</label>
            {form.cliente_id && (
              <button type="button" className="text-xs text-torque font-medium hover:underline mb-1.5" onClick={() => setModalVeiculoAberto(true)}>
                + Novo veículo
              </button>
            )}
          </div>
          <select
            className="input-field"
            value={form.veiculo_id}
            onChange={(e) => setForm({ ...form, veiculo_id: e.target.value })}
            disabled={!form.cliente_id}
          >
            <option value="">Selecione...</option>
            {veiculosDoCliente.map((v) => (
              <option key={v.id} value={v.id}>
                {v.placa} · {v.marca} {v.modelo}
              </option>
            ))}
          </select>
          {form.cliente_id && veiculosDoCliente.length === 0 && (
            <p className="text-[11px] text-ink-soft mt-1">Esse cliente ainda não tem veículo. Clique em "+ Novo veículo" acima.</p>
          )}
        </div>
        <div>
          <label className="label-field">Mecânico responsável</label>
          <select
            className="input-field"
            value={form.mecanico_id}
            onChange={(e) => setForm({ ...form, mecanico_id: e.target.value })}
          >
            <option value="">Não definido</option>
            {mecanicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">KM de entrada</label>
          <input
            className="input-field"
            value={form.km_entrada}
            onChange={(e) => setForm({ ...form, km_entrada: e.target.value })}
          />
        </div>
        <div>
          <label className="label-field">Defeito relatado pelo cliente</label>
          <textarea
            className="input-field"
            rows={3}
            value={form.defeito_relatado}
            onChange={(e) => setForm({ ...form, defeito_relatado: e.target.value })}
          />
        </div>
        <Button fullWidth className="mt-2" onClick={salvar} loading={salvando}>
          Criar orçamento
        </Button>
      </div>

      <ModalNovoCliente open={modalClienteAberto} onClose={() => setModalClienteAberto(false)} onSaved={aoCriarCliente} />
      {modalVeiculoAberto && (
        <ModalNovoVeiculo
          open
          clienteId={form.cliente_id}
          onClose={() => setModalVeiculoAberto(false)}
          onSaved={aoCriarVeiculo}
        />
      )}
    </Modal>
  )
}
