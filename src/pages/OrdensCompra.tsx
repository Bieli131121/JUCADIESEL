import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ShoppingCart } from 'lucide-react'
import { listOrdensCompra, criarOrdemCompra } from '@/lib/fornecedores'
import { listFornecedores } from '@/lib/fornecedores'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/contexts/ToastContext'
import type { OrdemCompra, Fornecedor, StatusOrdemCompra } from '@/types/database'
import { formatMoney } from '@/lib/format'

const STATUS_LABEL: Record<StatusOrdemCompra, string> = {
  rascunho: 'Rascunho',
  enviada: 'Enviada',
  recebida: 'Recebida',
  cancelada: 'Cancelada',
}
const STATUS_COR: Record<StatusOrdemCompra, string> = {
  rascunho: 'bg-gray-100 text-gray-600',
  enviada: 'bg-steel-light text-steel',
  recebida: 'bg-green-50 text-green-700',
  cancelada: 'bg-red-50 text-red-700',
}

export default function OrdensCompra() {
  const [ordens, setOrdens] = useState<OrdemCompra[]>([])
  const [loading, setLoading] = useState(true)
  const [modalNova, setModalNova] = useState(false)

  async function carregar() {
    setLoading(true)
    setOrdens(await listOrdensCompra())
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Ordens de Compra</h1>
          <p className="text-ink-soft text-sm mt-1">{ordens.length} pedidos no total</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalNova(true)}>
          Nova ordem de compra
        </Button>
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : (
        <div className="card divide-y divide-border">
          {ordens.map((o) => (
            <Link key={o.id} to={`/ordens-compra/${o.id}`} className="flex items-center gap-4 p-4 hover:bg-canvas transition-colors">
              <span className="font-mono text-xs text-ink-soft w-14 shrink-0">#{o.numero}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{o.fornecedor?.nome || 'Fornecedor não informado'}</p>
              </div>
              <span className="font-mono text-sm text-ink hidden sm:block">{formatMoney(o.valor_total)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
            </Link>
          ))}
          {ordens.length === 0 && <EmptyState icon={ShoppingCart} title="Nenhuma ordem de compra ainda" />}
        </div>
      )}

      <ModalNovaOrdemCompra open={modalNova} onClose={() => setModalNova(false)} onSaved={carregar} />
    </div>
  )
}

function ModalNovaOrdemCompra({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast()
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [fornecedorId, setFornecedorId] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (open) listFornecedores().then(setFornecedores)
  }, [open])

  async function salvar() {
    if (!fornecedorId) return
    setSalvando(true)
    try {
      const nova = await criarOrdemCompra(fornecedorId, observacoes)
      showToast(`Ordem de compra #${nova.numero} criada.`, 'success')
      onClose()
      onSaved()
      window.location.href = `/ordens-compra/${nova.id}`
    } catch {
      showToast('Não foi possível criar a ordem de compra.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title="Nova ordem de compra" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Fornecedor *</label>
          <select className="input-field" value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
            <option value="">Selecione...</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
          {fornecedores.length === 0 && (
            <p className="text-[11px] text-ink-soft mt-1">
              Nenhum fornecedor cadastrado. Cadastre um em <strong>Fornecedores</strong> primeiro.
            </p>
          )}
        </div>
        <div>
          <label className="label-field">Observações</label>
          <textarea className="input-field" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>
        <Button fullWidth onClick={salvar} loading={salvando} disabled={!fornecedorId}>
          Criar ordem de compra
        </Button>
      </div>
    </Modal>
  )
}
