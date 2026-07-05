import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { listOrdensServico, listClientes, listVeiculos, listMecanicos, criarOrdemServico } from '@/lib/db'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Placa } from '@/components/ui/Placa'
import { Modal } from '@/components/ui/Modal'
import type { OrdemServico, Cliente, Veiculo, Mecanico, StatusOS } from '@/types/database'
import { STATUS_OS_LABELS } from '@/types/database'

function formatMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function OrdensServico() {
  const [os, setOs] = useState<OrdemServico[]>([])
  const [filtro, setFiltro] = useState<StatusOS | 'todas'>('todas')
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Ordens de Serviço</h1>
          <p className="text-ink-soft text-sm mt-1">{os.length} ordens no total</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModalNova(true)}>
          <Plus size={16} /> Nova OS
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <FiltroChip label="Todas" active={filtro === 'todas'} onClick={() => setFiltro('todas')} />
        {(Object.keys(STATUS_OS_LABELS) as StatusOS[]).map((s) => (
          <FiltroChip key={s} label={STATUS_OS_LABELS[s]} active={filtro === s} onClick={() => setFiltro(s)} />
        ))}
      </div>

      {loading ? (
        <p className="text-ink-soft text-sm">Carregando...</p>
      ) : (
        <div className="card divide-y divide-border">
          {filtradas.map((o) => (
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
            <p className="text-ink-soft text-sm text-center py-8">Nenhuma OS encontrada para esse filtro.</p>
          )}
        </div>
      )}

      <ModalNovaOS open={modalNova} onClose={() => setModalNova(false)} onSaved={carregar} />
    </div>
  )
}

function FiltroChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active ? 'bg-graphite text-white border-graphite' : 'bg-white text-ink-soft border-border hover:border-ink-soft'
      }`}
    >
      {label}
    </button>
  )
}

function ModalNovaOS({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
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

  useEffect(() => {
    if (open) {
      Promise.all([listClientes(), listVeiculos(), listMecanicos()]).then(([c, v, m]) => {
        setClientes(c)
        setVeiculos(v)
        setMecanicos(m)
      })
    }
  }, [open])

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
      })
      onClose()
      onSaved()
      window.location.href = `/ordens-servico/${nova.id}`
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title="Nova ordem de serviço" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Cliente *</label>
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
          <label className="label-field">Veículo *</label>
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
        <button className="btn-primary w-full mt-2" onClick={salvar} disabled={salvando}>
          {salvando ? 'Criando...' : 'Criar orçamento'}
        </button>
      </div>
    </Modal>
  )
}
