import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import {
  getOrdemCompra,
  adicionarItemOrdemCompra,
  removerItemOrdemCompra,
  mudarStatusOrdemCompra,
} from '@/lib/fornecedores'
import { listPecas } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import type { OrdemCompra, Peca, StatusOrdemCompra } from '@/types/database'
import { formatMoney } from '@/lib/format'

const STATUS_LABEL: Record<StatusOrdemCompra, string> = {
  rascunho: 'Rascunho',
  enviada: 'Enviada',
  recebida: 'Recebida',
  cancelada: 'Cancelada',
}

const TRANSICOES: Record<StatusOrdemCompra, StatusOrdemCompra[]> = {
  rascunho: ['enviada', 'cancelada'],
  enviada: ['recebida', 'cancelada'],
  recebida: [],
  cancelada: [],
}

export default function OrdemCompraDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [ordem, setOrdem] = useState<OrdemCompra | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalItem, setModalItem] = useState(false)
  const [statusAlvo, setStatusAlvo] = useState<StatusOrdemCompra | null>(null)
  const [processando, setProcessando] = useState(false)

  const carregar = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setOrdem(await getOrdemCompra(id))
    setLoading(false)
  }, [id])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function confirmarMudanca() {
    if (!ordem || !statusAlvo) return
    setProcessando(true)
    try {
      await mudarStatusOrdemCompra(ordem.id, statusAlvo)
      showToast(
        statusAlvo === 'recebida' ? 'Recebimento confirmado — estoque atualizado automaticamente.' : `Status atualizado para "${STATUS_LABEL[statusAlvo]}"`,
        'success'
      )
      setStatusAlvo(null)
      carregar()
    } catch {
      showToast('Não foi possível atualizar o status.', 'error')
    } finally {
      setProcessando(false)
    }
  }

  async function removerItem(itemId: string) {
    if (!ordem) return
    await removerItemOrdemCompra(itemId, ordem.id)
    carregar()
  }

  if (loading) return <SkeletonList rows={4} />
  if (!ordem) return <p className="text-ink-soft text-sm">Ordem de compra não encontrada.</p>

  const podeEditar = ordem.status === 'rascunho'
  const transicoes = TRANSICOES[ordem.status]

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => navigate('/ordens-compra')} className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Ordem de Compra #{ordem.numero}</h1>
          <p className="text-ink-soft text-sm mt-1">{ordem.fornecedor?.nome}</p>
        </div>
        <div className="flex gap-2">
          {transicoes.map((s) => (
            <Button key={s} variant={s === 'cancelada' ? 'danger' : 'primary'} size="sm" onClick={() => setStatusAlvo(s)}>
              {STATUS_LABEL[s]}
            </Button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-ink text-sm">Itens</h2>
          {podeEditar && (
            <button className="text-xs text-torque font-medium hover:underline flex items-center gap-1" onClick={() => setModalItem(true)}>
              <Plus size={14} /> Adicionar item
            </button>
          )}
        </div>
        <div className="divide-y divide-border">
          {(ordem.itens || []).map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="flex-1 text-ink">{item.descricao}</span>
              <span className="text-ink-soft font-mono text-xs">{item.quantidade} × {formatMoney(item.preco_unitario)}</span>
              <span className="font-mono text-ink w-24 text-right">{formatMoney(item.valor_total)}</span>
              {podeEditar && (
                <button onClick={() => removerItem(item.id)} className="text-ink-soft hover:text-status-cancelado">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {(!ordem.itens || ordem.itens.length === 0) && (
            <p className="text-ink-soft text-sm py-4 text-center">Nenhum item adicionado ainda.</p>
          )}
        </div>
        <div className="flex justify-between items-center pt-3 mt-2 border-t border-border">
          <span className="font-display font-semibold text-ink">Total</span>
          <span className="font-mono font-semibold text-lg text-ink">{formatMoney(ordem.valor_total)}</span>
        </div>
      </div>

      {modalItem && (
        <ModalAdicionarItemCompra
          ordemCompraId={ordem.id}
          onClose={() => setModalItem(false)}
          onSaved={() => {
            setModalItem(false)
            carregar()
          }}
        />
      )}

      <ConfirmDialog
        open={!!statusAlvo}
        title="Mudar status da ordem de compra"
        message={
          statusAlvo === 'recebida'
            ? 'Confirmar recebimento? Isso vai dar entrada automática no estoque de todos os itens vinculados a peças cadastradas.'
            : `Mudar status para "${statusAlvo ? STATUS_LABEL[statusAlvo] : ''}"?`
        }
        confirmLabel="Confirmar"
        variant={statusAlvo === 'cancelada' ? 'danger' : 'primary'}
        onConfirm={confirmarMudanca}
        onCancel={() => setStatusAlvo(null)}
        loading={processando}
      />
    </div>
  )
}

function ModalAdicionarItemCompra({
  ordemCompraId,
  onClose,
  onSaved,
}: {
  ordemCompraId: string
  onClose: () => void
  onSaved: () => void
}) {
  const { showToast } = useToast()
  const [pecas, setPecas] = useState<Peca[]>([])
  const [pecaId, setPecaId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [precoUnitario, setPrecoUnitario] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    listPecas().then(setPecas)
  }, [])

  function selecionarPeca(id: string) {
    setPecaId(id)
    const p = pecas.find((x) => x.id === id)
    if (p) {
      setDescricao(p.nome)
      setPrecoUnitario(String(p.preco_custo))
    }
  }

  async function salvar() {
    if (!descricao || !precoUnitario) return
    setSalvando(true)
    try {
      await adicionarItemOrdemCompra({
        ordem_compra_id: ordemCompraId,
        peca_id: pecaId || null,
        descricao,
        quantidade: Number(quantidade) || 1,
        preco_unitario: Number(precoUnitario) || 0,
      })
      showToast('Item adicionado.', 'success')
      onSaved()
    } catch {
      showToast('Não foi possível adicionar o item.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open title="Adicionar item" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Peça do estoque (opcional)</label>
          <select className="input-field" value={pecaId} onChange={(e) => selecionarPeca(e.target.value)}>
            <option value="">Descrever manualmente</option>
            {pecas.map((p) => (
              <option key={p.id} value={p.id}>{p.nome} · estoque atual: {p.quantidade_estoque}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Descrição *</label>
          <input className="input-field" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Quantidade</label>
            <input className="input-field" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Preço unitário *</label>
            <input className="input-field" value={precoUnitario} onChange={(e) => setPrecoUnitario(e.target.value)} />
          </div>
        </div>
        <Button fullWidth className="mt-2" onClick={salvar} loading={salvando}>
          Adicionar item
        </Button>
      </div>
    </Modal>
  )
}
