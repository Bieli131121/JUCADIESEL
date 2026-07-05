import { useEffect, useState } from 'react'
import { Plus, Search, Car, Phone } from 'lucide-react'
import { listClientes, listVeiculos, upsertCliente, upsertVeiculo } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import { Placa } from '@/components/ui/Placa'
import type { Cliente, Veiculo } from '@/types/database'

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalCliente, setModalCliente] = useState(false)
  const [modalVeiculo, setModalVeiculo] = useState<{ clienteId: string } | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    const [c, v] = await Promise.all([listClientes(), listVeiculos()])
    setClientes(c)
    setVeiculos(v)
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const filtrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone.includes(busca) ||
      (c.cpf_cnpj || '').includes(busca)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Clientes e Veículos</h1>
          <p className="text-ink-soft text-sm mt-1">{clientes.length} clientes cadastrados</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModalCliente(true)}>
          <Plus size={16} /> Novo cliente
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          className="input-field pl-9"
          placeholder="Buscar por nome, telefone ou CPF..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-ink-soft text-sm">Carregando...</p>
      ) : (
        <div className="space-y-3">
          {filtrados.map((cliente) => {
            const veiculosDoCliente = veiculos.filter((v) => v.cliente_id === cliente.id)
            const aberto = expandido === cliente.id
            return (
              <div key={cliente.id} className="card overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 text-left"
                  onClick={() => setExpandido(aberto ? null : cliente.id)}
                >
                  <div>
                    <p className="font-medium text-ink">{cliente.nome}</p>
                    <p className="text-xs text-ink-soft flex items-center gap-1 mt-0.5">
                      <Phone size={12} /> {cliente.telefone}
                      {cliente.cpf_cnpj && ` · ${cliente.cpf_cnpj}`}
                    </p>
                  </div>
                  <span className="text-xs text-ink-soft flex items-center gap-1">
                    <Car size={14} /> {veiculosDoCliente.length}
                  </span>
                </button>
                {aberto && (
                  <div className="border-t border-border px-4 py-3 bg-canvas/50 space-y-2">
                    {veiculosDoCliente.map((v) => (
                      <div key={v.id} className="flex items-center gap-3 text-sm">
                        <Placa placa={v.placa} />
                        <span className="text-ink">
                          {v.marca} {v.modelo} {v.ano ? `· ${v.ano}` : ''}
                        </span>
                        <span className="text-ink-soft text-xs ml-auto">{v.km_atual.toLocaleString('pt-BR')} km</span>
                      </div>
                    ))}
                    <button
                      className="text-xs text-torque font-medium hover:underline flex items-center gap-1 pt-1"
                      onClick={() => setModalVeiculo({ clienteId: cliente.id })}
                    >
                      <Plus size={12} /> Adicionar veículo
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          {filtrados.length === 0 && (
            <p className="text-ink-soft text-sm text-center py-8">Nenhum cliente encontrado.</p>
          )}
        </div>
      )}

      <ModalNovoCliente open={modalCliente} onClose={() => setModalCliente(false)} onSaved={carregar} />
      {modalVeiculo && (
        <ModalNovoVeiculo
          open
          clienteId={modalVeiculo.clienteId}
          onClose={() => setModalVeiculo(null)}
          onSaved={carregar}
        />
      )}
    </div>
  )
}

function ModalNovoCliente({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ nome: '', telefone: '', cpf_cnpj: '', email: '' })
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!form.nome || !form.telefone) return
    setSalvando(true)
    try {
      await upsertCliente(form)
      setForm({ nome: '', telefone: '', cpf_cnpj: '', email: '' })
      onClose()
      onSaved()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title="Novo cliente" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Nome completo *</label>
          <input className="input-field" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div>
          <label className="label-field">Telefone *</label>
          <input
            className="input-field"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          />
        </div>
        <div>
          <label className="label-field">CPF/CNPJ</label>
          <input
            className="input-field"
            value={form.cpf_cnpj}
            onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
          />
        </div>
        <div>
          <label className="label-field">E-mail</label>
          <input className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <button className="btn-primary w-full mt-2" onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar cliente'}
        </button>
      </div>
    </Modal>
  )
}

function ModalNovoVeiculo({
  open,
  clienteId,
  onClose,
  onSaved,
}: {
  open: boolean
  clienteId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({ placa: '', marca: '', modelo: '', ano: '', km_atual: '' })
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!form.placa || !form.modelo) return
    setSalvando(true)
    try {
      await upsertVeiculo({
        cliente_id: clienteId,
        placa: form.placa,
        marca: form.marca || null,
        modelo: form.modelo,
        ano: form.ano ? Number(form.ano) : null,
        km_atual: form.km_atual ? Number(form.km_atual) : 0,
      })
      onClose()
      onSaved()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title="Novo veículo" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Placa *</label>
            <input
              className="input-field uppercase"
              value={form.placa}
              onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <label className="label-field">Ano</label>
            <input className="input-field" value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Marca</label>
            <input className="input-field" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Modelo *</label>
            <input
              className="input-field"
              value={form.modelo}
              onChange={(e) => setForm({ ...form, modelo: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="label-field">KM atual</label>
          <input
            className="input-field"
            value={form.km_atual}
            onChange={(e) => setForm({ ...form, km_atual: e.target.value })}
          />
        </div>
        <button className="btn-primary w-full mt-2" onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar veículo'}
        </button>
      </div>
    </Modal>
  )
}
