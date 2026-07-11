import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { upsertCliente } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useToast } from '@/contexts/ToastContext'
import type { Cliente } from '@/types/database'

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

interface ModalNovoClienteProps {
  open: boolean
  onClose: () => void
  onSaved: (cliente: Cliente) => void
}

export function ModalNovoCliente({ open, onClose, onSaved }: ModalNovoClienteProps) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    whatsapp: '',
    cpf_cnpj: '',
    rg: '',
    email: '',
    foto_url: '',
    cep: '',
    endereco: '',
    cidade: '',
    estado: '',
    observacoes: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)

  async function buscarCep() {
    const cepLimpo = form.cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return
    setBuscandoCep(true)
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await resp.json()
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          endereco: data.logradouro ? `${data.logradouro}${data.bairro ? ', ' + data.bairro : ''}` : f.endereco,
          cidade: data.localidade || f.cidade,
          estado: data.uf || f.estado,
        }))
      }
    } catch {
      // silencioso — CEP é conveniência, não bloqueia o cadastro
    } finally {
      setBuscandoCep(false)
    }
  }

  async function salvar() {
    if (!form.nome || !form.telefone) return
    setSalvando(true)
    try {
      const cliente = await upsertCliente(form)
      showToast('Cliente cadastrado com sucesso.', 'success')
      setForm({
        nome: '', telefone: '', whatsapp: '', cpf_cnpj: '', rg: '', email: '',
        foto_url: '', cep: '', endereco: '', cidade: '', estado: '', observacoes: '',
      })
      onClose()
      onSaved(cliente)
    } catch {
      showToast('Não foi possível salvar o cliente.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title="Novo cliente" onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label-field">Nome completo *</label>
            <input className="input-field" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Telefone *</label>
            <input className="input-field" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </div>
          <div>
            <label className="label-field">WhatsApp</label>
            <input className="input-field" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="Se diferente do telefone" />
          </div>
          <div>
            <label className="label-field">CPF/CNPJ</label>
            <input className="input-field" value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} />
          </div>
          <div>
            <label className="label-field">RG</label>
            <input className="input-field" value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
          </div>
          <div>
            <label className="label-field">E-mail</label>
            <input className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Foto</label>
            <div className="flex items-center gap-2">
              <input className="input-field" value={form.foto_url} onChange={(e) => setForm({ ...form, foto_url: e.target.value })} placeholder="Cole uma URL ou envie um arquivo" />
              <ImageUpload pasta="clientes" compacto onUploaded={(url) => setForm({ ...form, foto_url: url })} label="Enviar" />
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-ink-soft uppercase mb-3">Endereço</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label-field">CEP</label>
              <div className="flex gap-1.5">
                <input
                  className="input-field"
                  value={form.cep}
                  onChange={(e) => setForm({ ...form, cep: e.target.value })}
                  onBlur={buscarCep}
                  placeholder="00000-000"
                />
                {buscandoCep && <Loader2 size={16} className="animate-spin text-ink-soft mt-2.5 shrink-0" />}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label-field">Endereço</label>
              <input className="input-field" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Cidade</label>
              <input className="input-field" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Estado</label>
              <select className="input-field" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="">UF</option>
                {ESTADOS_BR.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="label-field">Observações</label>
          <textarea className="input-field" rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>

        <Button fullWidth onClick={salvar} loading={salvando}>
          Salvar cliente
        </Button>
      </div>
    </Modal>
  )
}
