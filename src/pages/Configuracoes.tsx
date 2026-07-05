import { useEffect, useState } from 'react'
import { Plus, KeyRound, Ban, CheckCircle2 } from 'lucide-react'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { salvarEmpresaConfig } from '@/lib/db'
import { listUsuarios, criarUsuario, redefinirPin, alterarStatusUsuario } from '@/lib/auth'
import { Modal } from '@/components/ui/Modal'
import type { Usuario, Role } from '@/types/database'
import { ROLE_LABELS } from '@/types/database'

export default function Configuracoes() {
  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Configurações</h1>
        <p className="text-ink-soft text-sm mt-1">Marca do sistema e controle de usuários</p>
      </div>
      <EmpresaSection />
      <UsuariosSection />
    </div>
  )
}

function EmpresaSection() {
  const { config, loading, reload } = useEmpresaConfig()
  const [form, setForm] = useState({
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
    telefone: '',
    endereco: '',
    logo_url: '',
    cor_primaria: '#F2600C',
  })
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    if (config) {
      setForm({
        nome_fantasia: config.nome_fantasia || '',
        razao_social: config.razao_social || '',
        cnpj: config.cnpj || '',
        telefone: config.telefone || '',
        endereco: config.endereco || '',
        logo_url: config.logo_url || '',
        cor_primaria: config.cor_primaria || '#F2600C',
      })
    }
  }, [config])

  async function salvar() {
    setSalvando(true)
    setSalvo(false)
    try {
      await salvarEmpresaConfig(form)
      await reload()
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2500)
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <p className="text-ink-soft text-sm">Carregando...</p>

  return (
    <section className="card p-5 space-y-4">
      <h2 className="font-display font-semibold text-ink">Marca do sistema</h2>
      <div className="flex items-center gap-4">
        <img
          src={form.logo_url || '/branding/logo-jucax.png'}
          className="w-20 object-contain border border-border rounded-lg p-1 bg-white"
        />
        <div className="flex-1">
          <label className="label-field">URL da logo</label>
          <input
            className="input-field"
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            placeholder="Deixe vazio para usar a logo padrão da JUCAX"
          />
        </div>
      </div>

      <div>
        <label className="label-field">Nome da oficina (aparece no menu) *</label>
        <input
          className="input-field"
          value={form.nome_fantasia}
          onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
        />
      </div>

      <div>
        <label className="label-field">Razão social</label>
        <input
          className="input-field"
          value={form.razao_social}
          onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">CNPJ</label>
          <input className="input-field" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
        </div>
        <div>
          <label className="label-field">Telefone</label>
          <input
            className="input-field"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="label-field">Endereço</label>
        <input
          className="input-field"
          value={form.endereco}
          onChange={(e) => setForm({ ...form, endereco: e.target.value })}
        />
      </div>

      <button className="btn-primary w-full mt-2" onClick={salvar} disabled={salvando}>
        {salvando ? 'Salvando...' : salvo ? 'Salvo ✓' : 'Salvar configurações'}
      </button>
    </section>
  )
}

function UsuariosSection() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [modalNovo, setModalNovo] = useState(false)
  const [modalPin, setModalPin] = useState<Usuario | null>(null)

  async function carregar() {
    setLoading(true)
    setUsuarios(await listUsuarios())
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function alternarStatus(u: Usuario) {
    await alterarStatusUsuario(u.id, !u.ativo)
    carregar()
  }

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-ink">Usuários do sistema</h2>
        <button className="text-xs text-torque font-medium hover:underline flex items-center gap-1" onClick={() => setModalNovo(true)}>
          <Plus size={14} /> Novo usuário
        </button>
      </div>

      {loading ? (
        <p className="text-ink-soft text-sm">Carregando...</p>
      ) : (
        <div className="divide-y divide-border">
          {usuarios.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-ink font-medium">{u.nome}</p>
                <p className="text-xs text-ink-soft font-mono">
                  @{u.usuario} · {ROLE_LABELS[u.role]}
                </p>
              </div>
              {!u.ativo && <span className="text-[10px] font-semibold uppercase text-status-cancelado">Inativo</span>}
              <button
                className="text-ink-soft hover:text-torque p-1.5 rounded-lg hover:bg-canvas"
                title="Redefinir PIN"
                onClick={() => setModalPin(u)}
              >
                <KeyRound size={15} />
              </button>
              <button
                className={`p-1.5 rounded-lg hover:bg-canvas ${u.ativo ? 'text-ink-soft hover:text-status-cancelado' : 'text-status-entregue'}`}
                title={u.ativo ? 'Desativar' : 'Reativar'}
                onClick={() => alternarStatus(u)}
              >
                {u.ativo ? <Ban size={15} /> : <CheckCircle2 size={15} />}
              </button>
            </div>
          ))}
          {usuarios.length === 0 && <p className="text-ink-soft text-sm text-center py-4">Nenhum usuário cadastrado.</p>}
        </div>
      )}

      <ModalNovoUsuario open={modalNovo} onClose={() => setModalNovo(false)} onSaved={carregar} />
      {modalPin && <ModalRedefinirPin usuario={modalPin} onClose={() => setModalPin(null)} onSaved={carregar} />}
    </section>
  )
}

function ModalNovoUsuario({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ nome: '', usuario: '', pin: '', role: 'recepcao' as Role })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar() {
    setErro('')
    if (!form.nome || !form.usuario || form.pin.length < 4) {
      setErro('Preencha nome, usuário e um PIN de pelo menos 4 dígitos.')
      return
    }
    setSalvando(true)
    try {
      await criarUsuario(form)
      setForm({ nome: '', usuario: '', pin: '', role: 'recepcao' })
      onClose()
      onSaved()
    } catch {
      setErro('Não foi possível criar. O nome de usuário já pode estar em uso.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title="Novo usuário" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Nome completo *</label>
          <input className="input-field" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div>
          <label className="label-field">Usuário (login) *</label>
          <input
            className="input-field"
            value={form.usuario}
            onChange={(e) => setForm({ ...form, usuario: e.target.value.toLowerCase().replace(/\s/g, '') })}
            placeholder="ex: joao"
          />
        </div>
        <div>
          <label className="label-field">PIN (4 a 6 dígitos) *</label>
          <input
            className="input-field font-mono"
            value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
          />
        </div>
        <div>
          <label className="label-field">Nível de acesso *</label>
          <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="recepcao">Recepção</option>
            <option value="mecanico">Mecânico</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        {erro && <p className="text-status-cancelado text-xs font-medium">{erro}</p>}
        <button className="btn-primary w-full mt-2" onClick={salvar} disabled={salvando}>
          {salvando ? 'Criando...' : 'Criar usuário'}
        </button>
      </div>
    </Modal>
  )
}

function ModalRedefinirPin({ usuario, onClose, onSaved }: { usuario: Usuario; onClose: () => void; onSaved: () => void }) {
  const [pin, setPin] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (pin.length < 4) return
    setSalvando(true)
    try {
      await redefinirPin(usuario.id, pin)
      onClose()
      onSaved()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open title={`Redefinir PIN · ${usuario.nome}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Novo PIN (4 a 6 dígitos)</label>
          <input
            className="input-field font-mono"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </div>
        <button className="btn-primary w-full mt-2" onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Confirmar novo PIN'}
        </button>
      </div>
    </Modal>
  )
}
