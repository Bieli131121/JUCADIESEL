import { useEffect, useState } from 'react'
import { Plus, Check, X as XIcon } from 'lucide-react'
import { listAgendamentos, listClientes, listVeiculos, criarAgendamento, atualizarStatusAgendamento } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import type { Agendamento as AgendamentoType, Cliente, Veiculo } from '@/types/database'

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const STATUS_LABEL: Record<string, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  convertido: 'Convertido em OS',
  cancelado: 'Cancelado',
}

export default function Agendamento() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoType[]>([])
  const [loading, setLoading] = useState(true)
  const [modalNovo, setModalNovo] = useState(false)

  async function carregar() {
    setLoading(true)
    setAgendamentos(await listAgendamentos())
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function mudarStatus(id: string, status: AgendamentoType['status']) {
    await atualizarStatusAgendamento(id, status)
    carregar()
  }

  const futuros = agendamentos.filter((a) => a.status !== 'cancelado')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Agendamento</h1>
          <p className="text-ink-soft text-sm mt-1">{futuros.length} agendamentos ativos</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModalNovo(true)}>
          <Plus size={16} /> Novo agendamento
        </button>
      </div>

      {loading ? (
        <p className="text-ink-soft text-sm">Carregando...</p>
      ) : (
        <div className="card divide-y divide-border">
          {agendamentos.map((a) => (
            <div key={a.id} className="flex items-center gap-4 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-ink font-medium">{a.cliente?.nome || 'Cliente não vinculado'}</p>
                <p className="text-xs text-ink-soft">
                  {formatDateTime(a.data_hora)}
                  {a.veiculo && ` · ${a.veiculo.placa}`}
                  {a.descricao && ` · ${a.descricao}`}
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-canvas text-ink-soft font-medium">
                {STATUS_LABEL[a.status]}
              </span>
              {a.status === 'agendado' && (
                <div className="flex gap-1">
                  <button
                    className="p-1.5 rounded-lg bg-steel-light text-steel hover:opacity-80"
                    title="Confirmar"
                    onClick={() => mudarStatus(a.id, 'confirmado')}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    className="p-1.5 rounded-lg bg-red-50 text-status-cancelado hover:opacity-80"
                    title="Cancelar"
                    onClick={() => mudarStatus(a.id, 'cancelado')}
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {agendamentos.length === 0 && (
            <p className="text-ink-soft text-sm text-center py-8">Nenhum agendamento cadastrado.</p>
          )}
        </div>
      )}

      <ModalNovoAgendamento open={modalNovo} onClose={() => setModalNovo(false)} onSaved={carregar} />
    </div>
  )
}

function ModalNovoAgendamento({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [form, setForm] = useState({ cliente_id: '', veiculo_id: '', data: '', hora: '', descricao: '' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (open) {
      Promise.all([listClientes(), listVeiculos()]).then(([c, v]) => {
        setClientes(c)
        setVeiculos(v)
      })
    }
  }, [open])

  const veiculosDoCliente = veiculos.filter((v) => v.cliente_id === form.cliente_id)

  async function salvar() {
    if (!form.cliente_id || !form.data || !form.hora) return
    setSalvando(true)
    try {
      await criarAgendamento({
        cliente_id: form.cliente_id,
        veiculo_id: form.veiculo_id || null,
        data_hora: new Date(`${form.data}T${form.hora}`).toISOString(),
        descricao: form.descricao || null,
      })
      onClose()
      onSaved()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title="Novo agendamento" onClose={onClose}>
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
          <label className="label-field">Veículo</label>
          <select
            className="input-field"
            value={form.veiculo_id}
            onChange={(e) => setForm({ ...form, veiculo_id: e.target.value })}
            disabled={!form.cliente_id}
          >
            <option value="">Não informado</option>
            {veiculosDoCliente.map((v) => (
              <option key={v.id} value={v.id}>
                {v.placa} · {v.marca} {v.modelo}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Data *</label>
            <input
              type="date"
              className="input-field"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
            />
          </div>
          <div>
            <label className="label-field">Hora *</label>
            <input
              type="time"
              className="input-field"
              value={form.hora}
              onChange={(e) => setForm({ ...form, hora: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="label-field">Descrição</label>
          <input
            className="input-field"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Ex: Revisão dos freios"
          />
        </div>
        <button className="btn-primary w-full mt-2" onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar agendamento'}
        </button>
      </div>
    </Modal>
  )
}
