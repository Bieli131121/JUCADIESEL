import { useEffect, useState } from 'react'
import { Plus, Ban, CheckCircle2, Pencil, Trash2, Truck } from 'lucide-react'
import { listTodosFornecedores, upsertFornecedor, alterarStatusFornecedor, deleteFornecedor } from '@/lib/fornecedores'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconAction } from '@/components/ui/IconAction'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import type { Fornecedor } from '@/types/database'

export default function Fornecedores() {
  const { showToast } = useToast()
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [modalNovo, setModalNovo] = useState(false)
  const [modalEditar, setModalEditar] = useState<Fornecedor | null>(null)
  const [confirmarDesativar, setConfirmarDesativar] = useState<Fornecedor | null>(null)
  const [confirmarExcluir, setConfirmarExcluir] = useState<Fornecedor | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  async function carregar() {
    setLoading(true)
    setFornecedores(await listTodosFornecedores())
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function alternarStatus(f: Fornecedor) {
    if (f.ativo) {
      setConfirmarDesativar(f)
      return
    }
    await alterarStatusFornecedor(f.id, true)
    showToast('Fornecedor reativado.', 'info')
    carregar()
  }

  async function confirmarDesativacao() {
    if (!confirmarDesativar) return
    await alterarStatusFornecedor(confirmarDesativar.id, false)
    showToast('Fornecedor desativado.', 'info')
    setConfirmarDesativar(null)
    carregar()
  }

  async function excluirFornecedor() {
    if (!confirmarExcluir) return
    setExcluindo(true)
    try {
      await deleteFornecedor(confirmarExcluir.id)
      showToast('Fornecedor excluído.', 'success')
      setConfirmarExcluir(null)
      carregar()
    } catch (erro: any) {
      showToast(erro.message || 'Não foi possível excluir o fornecedor.', 'error')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Fornecedores</h1>
          <p className="text-ink-soft text-sm mt-1">{fornecedores.filter((f) => f.ativo).length} ativos</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalNovo(true)}>
          Novo fornecedor
        </Button>
      </div>

      {loading ? (
        <SkeletonList rows={4} />
      ) : (
        <div className="card divide-y divide-border">
          {fornecedores.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-ink font-medium">{f.nome}</p>
                <p className="text-xs text-ink-soft">
                  {f.cnpj && `${f.cnpj} · `}
                  {f.telefone}
                  {f.prazo_pagamento_dias ? ` · ${f.prazo_pagamento_dias} dias pra pagamento` : ''}
                </p>
              </div>
              {!f.ativo && <span className="text-[10px] font-semibold uppercase text-status-cancelado">Inativo</span>}
              <IconAction title="Editar" onClick={() => setModalEditar(f)}>
                <Pencil size={15} />
              </IconAction>
              <button
                className={`p-1.5 rounded-lg hover:bg-canvas ${f.ativo ? 'text-ink-soft hover:text-status-cancelado' : 'text-status-entregue'}`}
                onClick={() => alternarStatus(f)}
              >
                {f.ativo ? <Ban size={15} /> : <CheckCircle2 size={15} />}
              </button>
              <IconAction title="Excluir" danger onClick={() => setConfirmarExcluir(f)}>
                <Trash2 size={15} />
              </IconAction>
            </div>
          ))}
          {fornecedores.length === 0 && <EmptyState icon={Truck} title="Nenhum fornecedor cadastrado ainda" />}
        </div>
      )}

      <ModalFornecedor open={modalNovo} onClose={() => setModalNovo(false)} onSaved={carregar} />
      {modalEditar && (
        <ModalFornecedor open fornecedor={modalEditar} onClose={() => setModalEditar(null)} onSaved={carregar} />
      )}

      <ConfirmDialog
        open={!!confirmarDesativar}
        title="Desativar fornecedor"
        message={`Tem certeza que deseja desativar ${confirmarDesativar?.nome}? Ele deixará de aparecer nas opções ao criar ordens de compra.`}
        confirmLabel="Desativar"
        variant="danger"
        onConfirm={confirmarDesativacao}
        onCancel={() => setConfirmarDesativar(null)}
      />
      <ConfirmDialog
        open={!!confirmarExcluir}
        title="Excluir fornecedor"
        message={`Tem certeza que deseja excluir ${confirmarExcluir?.nome}? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={excluirFornecedor}
        onCancel={() => setConfirmarExcluir(null)}
        loading={excluindo}
      />
    </div>
  )
}

function ModalFornecedor({
  open,
  fornecedor,
  onClose,
  onSaved,
}: {
  open: boolean
  fornecedor?: Fornecedor
  onClose: () => void
  onSaved: () => void
}) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    nome: fornecedor?.nome || '',
    cnpj: fornecedor?.cnpj || '',
    telefone: fornecedor?.telefone || '',
    email: fornecedor?.email || '',
    contato: fornecedor?.contato || '',
    prazo_pagamento_dias: fornecedor?.prazo_pagamento_dias ? String(fornecedor.prazo_pagamento_dias) : '',
    observacoes: fornecedor?.observacoes || '',
  })
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!form.nome) return
    setSalvando(true)
    try {
      await upsertFornecedor({
        id: fornecedor?.id,
        nome: form.nome,
        cnpj: form.cnpj || null,
        telefone: form.telefone || null,
        email: form.email || null,
        contato: form.contato || null,
        prazo_pagamento_dias: form.prazo_pagamento_dias ? Number(form.prazo_pagamento_dias) : null,
        observacoes: form.observacoes || null,
      })
      showToast(fornecedor ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado.', 'success')
      onClose()
      onSaved()
    } catch {
      showToast('Não foi possível salvar.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title={fornecedor ? `Editar · ${fornecedor.nome}` : 'Novo fornecedor'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Nome *</label>
          <input className="input-field" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">CNPJ</label>
            <input className="input-field" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Telefone</label>
            <input className="input-field" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">E-mail</label>
            <input className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Contato (nome da pessoa)</label>
            <input className="input-field" value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label-field">Prazo de pagamento (dias)</label>
          <input
            className="input-field"
            value={form.prazo_pagamento_dias}
            onChange={(e) => setForm({ ...form, prazo_pagamento_dias: e.target.value })}
            placeholder="ex: 30"
          />
        </div>
        <div>
          <label className="label-field">Observações</label>
          <textarea className="input-field" rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>
        <Button fullWidth onClick={salvar} loading={salvando}>
          {fornecedor ? 'Salvar alterações' : 'Cadastrar fornecedor'}
        </Button>
      </div>
    </Modal>
  )
}
