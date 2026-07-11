import { useEffect, useState } from 'react'
import { upsertVeiculo, listClientes } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import type { Veiculo, Cliente } from '@/types/database'

interface ModalNovoVeiculoProps {
  open: boolean
  clienteId?: string
  veiculo?: Veiculo
  onClose: () => void
  onSaved: (veiculo: Veiculo) => void
}

export function ModalNovoVeiculo({ open, clienteId, veiculo, onClose, onSaved }: ModalNovoVeiculoProps) {
  const { showToast } = useToast()
  const editando = !!veiculo
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState(clienteId || veiculo?.cliente_id || '')
  const [form, setForm] = useState({
    placa: veiculo?.placa || '',
    marca: veiculo?.marca || '',
    modelo: veiculo?.modelo || '',
    ano: veiculo?.ano ? String(veiculo.ano) : '',
    motor: veiculo?.motor || '',
    combustivel: veiculo?.combustivel || '',
    cor: veiculo?.cor || '',
    km_atual: veiculo ? String(veiculo.km_atual) : '',
    chassi: veiculo?.chassi || '',
    renavam: veiculo?.renavam || '',
  })
  const [salvando, setSalvando] = useState(false)

  // Só busca a lista de clientes quando não veio um clienteId pronto (ex: tela
  // dedicada de Veículos, onde o usuário escolhe o dono do veículo aqui mesmo).
  useEffect(() => {
    if (open && !clienteId) {
      listClientes().then(setClientes)
    }
  }, [open, clienteId])

  async function salvar() {
    if (!form.placa || !form.modelo || !clienteSelecionado) return
    setSalvando(true)
    try {
      const salvo = await upsertVeiculo({
        id: veiculo?.id,
        cliente_id: clienteSelecionado,
        placa: form.placa,
        marca: form.marca || null,
        modelo: form.modelo,
        ano: form.ano ? Number(form.ano) : null,
        motor: form.motor || null,
        combustivel: form.combustivel || null,
        cor: form.cor || null,
        km_atual: form.km_atual ? Number(form.km_atual) : 0,
        chassi: form.chassi || null,
        renavam: form.renavam || null,
      })
      showToast(editando ? 'Veículo atualizado com sucesso.' : 'Veículo cadastrado com sucesso.', 'success')
      onClose()
      onSaved(salvo)
    } catch {
      showToast('Não foi possível salvar o veículo.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title={editando ? `Editar veículo · ${veiculo?.placa}` : 'Novo veículo'} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-3">
        {!clienteId && (
          <div>
            <label className="label-field">Cliente *</label>
            <select className="input-field" value={clienteSelecionado} onChange={(e) => setClienteSelecionado(e.target.value)} disabled={editando}>
              <option value="">Selecione o cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="label-field">Placa *</label>
            <input className="input-field uppercase" value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <label className="label-field">Ano</label>
            <input className="input-field" value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Cor</label>
            <input className="input-field" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Marca</label>
            <input className="input-field" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="label-field">Modelo *</label>
            <input className="input-field" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Motor</label>
            <input className="input-field" value={form.motor} onChange={(e) => setForm({ ...form, motor: e.target.value })} placeholder="ex: 1.6 16V" />
          </div>
          <div>
            <label className="label-field">Combustível</label>
            <select className="input-field" value={form.combustivel} onChange={(e) => setForm({ ...form, combustivel: e.target.value })}>
              <option value="">Selecione</option>
              <option value="Diesel">Diesel</option>
              <option value="Gasolina">Gasolina</option>
              <option value="Etanol">Etanol</option>
              <option value="Flex">Flex</option>
              <option value="GNV">GNV</option>
              <option value="Elétrico">Elétrico</option>
            </select>
          </div>
          <div>
            <label className="label-field">KM atual</label>
            <input className="input-field" value={form.km_atual} onChange={(e) => setForm({ ...form, km_atual: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Chassi</label>
            <input className="input-field" value={form.chassi} onChange={(e) => setForm({ ...form, chassi: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Renavam</label>
            <input className="input-field" value={form.renavam} onChange={(e) => setForm({ ...form, renavam: e.target.value })} />
          </div>
        </div>
        <Button fullWidth className="mt-2" onClick={salvar} loading={salvando}>
          {editando ? 'Salvar alterações' : 'Salvar veículo'}
        </Button>
      </div>
    </Modal>
  )
}
