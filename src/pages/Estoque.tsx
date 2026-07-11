import { useEffect, useState } from 'react'
import { Plus, ArrowDownToLine, ArrowUpFromLine, ClipboardList, History, AlertTriangle, FileUp, Trash2, Package } from 'lucide-react'
import {
  listPecas,
  upsertPeca,
  registrarEntradaEstoque,
  registrarSaidaEstoque,
  registrarAjusteInventario,
  listMovimentacoesPorPeca,
  deletePeca,
} from '@/lib/db'
import { ModalImportarNFeCompra } from '@/components/ModalImportarNFeCompra'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconAction } from '@/components/ui/IconAction'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { SkeletonList, SkeletonCards } from '@/components/ui/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import type { Peca, MovimentacaoEstoque } from '@/types/database'
import { formatMoney, formatDateTime } from '@/lib/format'
import { FiltroChip } from '@/components/ui/FiltroChip'

const MOV_LABELS: Record<string, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste: 'Ajuste',
  estorno: 'Estorno (cancelamento de OS)',
}

export default function Estoque() {
  const { showToast } = useToast()
  const [pecas, setPecas] = useState<Peca[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [modalNova, setModalNova] = useState(false)
  const [modalMovimento, setModalMovimento] = useState<{ peca: Peca; tipo: 'entrada' | 'saida' | 'ajuste' } | null>(null)
  const [modalHistorico, setModalHistorico] = useState<Peca | null>(null)
  const [modalImportarNFe, setModalImportarNFe] = useState(false)
  const [confirmarExcluir, setConfirmarExcluir] = useState<Peca | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  async function carregar() {
    setLoading(true)
    setPecas(await listPecas())
    setLoading(false)
  }

  async function excluirPeca() {
    if (!confirmarExcluir) return
    setExcluindo(true)
    try {
      await deletePeca(confirmarExcluir.id)
      showToast('Peça excluída.', 'success')
      setConfirmarExcluir(null)
      carregar()
    } catch (erro: any) {
      showToast(erro.message || 'Não foi possível excluir a peça.', 'error')
    } finally {
      setExcluindo(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const categorias = [...new Set(pecas.map((p) => p.categoria).filter(Boolean))] as string[]
  const filtradas = categoriaFiltro === 'todas' ? pecas : pecas.filter((p) => p.categoria === categoriaFiltro)

  const valorTotalCusto = pecas.reduce((s, p) => s + p.quantidade_estoque * p.preco_custo, 0)
  const valorTotalVenda = pecas.reduce((s, p) => s + p.quantidade_estoque * p.preco_venda, 0)
  const estoqueBaixoCount = pecas.filter((p) => p.quantidade_estoque <= p.estoque_minimo).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Estoque</h1>
          <p className="text-ink-soft text-sm mt-1">{pecas.length} peças cadastradas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<FileUp size={16} />} onClick={() => setModalImportarNFe(true)}>
            Importar NF-e
          </Button>
          <Button icon={<Plus size={16} />} onClick={() => setModalNova(true)}>
            Nova peça
          </Button>
        </div>
      </div>

      {loading ? (
        <SkeletonCards count={3} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-ink-soft font-medium">Valor em estoque (custo)</p>
            <p className="font-display text-xl font-semibold text-ink mt-1">{formatMoney(valorTotalCusto)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-ink-soft font-medium">Valor em estoque (venda)</p>
            <p className="font-display text-xl font-semibold text-steel mt-1">{formatMoney(valorTotalVenda)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-ink-soft font-medium">Peças com estoque baixo</p>
            <p className={`font-display text-xl font-semibold mt-1 ${estoqueBaixoCount > 0 ? 'text-status-cancelado' : 'text-ink'}`}>
              {estoqueBaixoCount}
            </p>
          </div>
        </div>
      )}

      {categorias.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FiltroChip label="Todas" active={categoriaFiltro === 'todas'} onClick={() => setCategoriaFiltro('todas')} shrink />
          {categorias.map((c) => (
            <FiltroChip key={c} label={c} active={categoriaFiltro === c} onClick={() => setCategoriaFiltro(c)} shrink />
          ))}
        </div>
      )}

      {loading ? (
        <SkeletonList rows={6} />
      ) : (
        <>
          {/* Desktop/tablet: tabela normal */}
          <div className="card overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-soft border-b border-border">
                  <th className="p-3 font-medium">Peça</th>
                  <th className="p-3 font-medium">Código</th>
                  <th className="p-3 font-medium">Localização</th>
                  <th className="p-3 font-medium">Estoque</th>
                  <th className="p-3 font-medium">Preço venda</th>
                  <th className="p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtradas.map((p) => {
                  const baixo = p.quantidade_estoque <= p.estoque_minimo
                  return (
                    <tr key={p.id}>
                      <td className="p-3 text-ink font-medium">
                        {p.nome}
                        {p.categoria && <span className="text-ink-soft text-xs font-normal"> · {p.categoria}</span>}
                      </td>
                      <td className="p-3 font-mono text-xs text-ink-soft">{p.codigo || '—'}</td>
                      <td className="p-3 text-xs text-ink-soft">{p.localizacao || '—'}</td>
                      <td className="p-3">
                        <span className={`font-mono text-xs font-semibold ${baixo ? 'text-status-cancelado' : 'text-ink'}`}>
                          {p.quantidade_estoque}
                        </span>
                        {baixo && <AlertTriangle size={12} className="inline ml-1 text-status-cancelado" />}
                      </td>
                      <td className="p-3 font-mono text-ink">{formatMoney(p.preco_venda)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 justify-end">
                          <IconAction title="Entrada" onClick={() => setModalMovimento({ peca: p, tipo: 'entrada' })}>
                            <ArrowDownToLine size={14} />
                          </IconAction>
                          <IconAction title="Saída" onClick={() => setModalMovimento({ peca: p, tipo: 'saida' })}>
                            <ArrowUpFromLine size={14} />
                          </IconAction>
                          <IconAction title="Ajustar inventário" onClick={() => setModalMovimento({ peca: p, tipo: 'ajuste' })}>
                            <ClipboardList size={14} />
                          </IconAction>
                          <IconAction title="Histórico" onClick={() => setModalHistorico(p)}>
                            <History size={14} />
                          </IconAction>
                          <IconAction title="Excluir" danger onClick={() => setConfirmarExcluir(p)}>
                            <Trash2 size={14} />
                          </IconAction>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState icon={Package} title="Nenhuma peça encontrada" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: lista de cards (uma tabela de 6 colunas não cabe numa tela de celular) */}
          <div className="md:hidden space-y-3">
            {filtradas.map((p) => {
              const baixo = p.quantidade_estoque <= p.estoque_minimo
              return (
                <div key={p.id} className="card p-4 space-y-3">
                  <div>
                    <p className="text-ink font-medium">
                      {p.nome}
                      {p.categoria && <span className="text-ink-soft text-xs font-normal"> · {p.categoria}</span>}
                    </p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {p.codigo && <span className="font-mono">{p.codigo}</span>}
                      {p.codigo && p.localizacao && ' · '}
                      {p.localizacao}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <span className={`font-mono font-semibold ${baixo ? 'text-status-cancelado' : 'text-ink'}`}>
                        {p.quantidade_estoque} em estoque
                      </span>
                      {baixo && <AlertTriangle size={13} className="text-status-cancelado" />}
                    </span>
                    <span className="font-mono text-ink">{formatMoney(p.preco_venda)}</span>
                  </div>
                  <div className="flex items-center gap-1 pt-2 border-t border-border">
                    <IconAction title="Entrada" onClick={() => setModalMovimento({ peca: p, tipo: 'entrada' })}>
                      <ArrowDownToLine size={16} />
                    </IconAction>
                    <IconAction title="Saída" onClick={() => setModalMovimento({ peca: p, tipo: 'saida' })}>
                      <ArrowUpFromLine size={16} />
                    </IconAction>
                    <IconAction title="Ajustar inventário" onClick={() => setModalMovimento({ peca: p, tipo: 'ajuste' })}>
                      <ClipboardList size={16} />
                    </IconAction>
                    <IconAction title="Histórico" onClick={() => setModalHistorico(p)}>
                      <History size={16} />
                    </IconAction>
                    <IconAction title="Excluir" danger onClick={() => setConfirmarExcluir(p)}>
                      <Trash2 size={16} />
                    </IconAction>
                  </div>
                </div>
              )
            })}
            {filtradas.length === 0 && <EmptyState icon={Package} title="Nenhuma peça encontrada" />}
          </div>
        </>
      )}

      <ModalNovaPeca open={modalNova} onClose={() => setModalNova(false)} onSaved={carregar} />
      {modalMovimento && (
        <ModalMovimento
          peca={modalMovimento.peca}
          tipo={modalMovimento.tipo}
          onClose={() => setModalMovimento(null)}
          onSaved={carregar}
        />
      )}
      {modalHistorico && <ModalHistorico peca={modalHistorico} onClose={() => setModalHistorico(null)} />}
      <ModalImportarNFeCompra open={modalImportarNFe} onClose={() => setModalImportarNFe(false)} onSaved={carregar} />

      <ConfirmDialog
        open={!!confirmarExcluir}
        title="Excluir peça"
        message={`Tem certeza que deseja excluir "${confirmarExcluir?.nome}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={excluirPeca}
        onCancel={() => setConfirmarExcluir(null)}
        loading={excluindo}
      />
    </div>
  )
}



function ModalNovaPeca({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    nome: '',
    codigo: '',
    codigo_barras: '',
    categoria: '',
    localizacao: '',
    quantidade_estoque: '0',
    estoque_minimo: '5',
    preco_custo: '',
    preco_venda: '',
    fornecedor: '',
  })
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!form.nome || !form.preco_venda) return
    setSalvando(true)
    try {
      await upsertPeca({
        nome: form.nome,
        codigo: form.codigo || null,
        codigo_barras: form.codigo_barras || null,
        categoria: form.categoria || null,
        localizacao: form.localizacao || null,
        quantidade_estoque: Number(form.quantidade_estoque) || 0,
        estoque_minimo: Number(form.estoque_minimo) || 5,
        preco_custo: Number(form.preco_custo) || 0,
        preco_venda: Number(form.preco_venda) || 0,
        fornecedor: form.fornecedor || null,
      })
      showToast('Peça cadastrada com sucesso.', 'success')
      onClose()
      onSaved()
    } catch {
      showToast('Não foi possível salvar a peça.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title="Nova peça" onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label-field">Nome *</label>
            <input className="input-field" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Código interno</label>
            <input className="input-field" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Código de barras</label>
            <input className="input-field" value={form.codigo_barras} onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Categoria</label>
            <input className="input-field" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="ex: Filtros, Óleos, Elétrica" />
          </div>
          <div>
            <label className="label-field">Localização</label>
            <input className="input-field" value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} placeholder="ex: Corredor A, Prateleira 3" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Estoque inicial</label>
            <input className="input-field" value={form.quantidade_estoque} onChange={(e) => setForm({ ...form, quantidade_estoque: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Estoque mínimo</label>
            <input className="input-field" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Preço custo</label>
            <input className="input-field" value={form.preco_custo} onChange={(e) => setForm({ ...form, preco_custo: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Preço venda *</label>
            <input className="input-field" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label-field">Fornecedor</label>
          <input className="input-field" value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
        </div>
        <Button fullWidth className="mt-2" onClick={salvar} loading={salvando}>
          Salvar peça
        </Button>
      </div>
    </Modal>
  )
}

function ModalMovimento({
  peca,
  tipo,
  onClose,
  onSaved,
}: {
  peca: Peca
  tipo: 'entrada' | 'saida' | 'ajuste'
  onClose: () => void
  onSaved: () => void
}) {
  const { showToast } = useToast()
  const [quantidade, setQuantidade] = useState(tipo === 'ajuste' ? String(peca.quantidade_estoque) : '1')
  const [motivo, setMotivo] = useState(tipo === 'entrada' ? 'Compra fornecedor' : tipo === 'saida' ? 'Uso interno' : 'Contagem de inventário')
  const [salvando, setSalvando] = useState(false)

  const titulos = { entrada: 'Entrada de estoque', saida: 'Saída de estoque', ajuste: 'Ajuste de inventário' }

  async function salvar() {
    const qtd = Number(quantidade)
    setSalvando(true)
    try {
      if (tipo === 'entrada') {
        if (!qtd || qtd <= 0) return
        await registrarEntradaEstoque(peca.id, qtd, motivo)
        showToast(`Entrada de ${qtd} unidade(s) registrada.`, 'success')
      } else if (tipo === 'saida') {
        if (!qtd || qtd <= 0) return
        await registrarSaidaEstoque(peca.id, qtd, motivo)
        showToast(`Saída de ${qtd} unidade(s) registrada.`, 'success')
      } else {
        await registrarAjusteInventario(peca.id, qtd, motivo)
        showToast('Inventário ajustado com sucesso.', 'success')
      }
      onClose()
      onSaved()
    } catch {
      showToast('Não foi possível registrar a movimentação.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open title={`${titulos[tipo]} · ${peca.nome}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-ink-soft">Estoque atual: {peca.quantidade_estoque} unidades</p>
        <div>
          <label className="label-field">{tipo === 'ajuste' ? 'Quantidade contada *' : 'Quantidade *'}</label>
          <input className="input-field" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
        </div>
        <div>
          <label className="label-field">Motivo</label>
          <input className="input-field" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <Button fullWidth className="mt-2" onClick={salvar} loading={salvando}>
          Confirmar
        </Button>
      </div>
    </Modal>
  )
}

function ModalHistorico({ peca, onClose }: { peca: Peca; onClose: () => void }) {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listMovimentacoesPorPeca(peca.id).then((m) => {
      setMovimentacoes(m)
      setLoading(false)
    })
  }, [peca.id])

  return (
    <Modal open title={`Histórico · ${peca.nome}`} onClose={onClose}>
      {loading ? (
        <p className="text-ink-soft text-sm">Carregando...</p>
      ) : (
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {movimentacoes.map((m) => (
            <div key={m.id} className="py-2.5 text-sm flex items-center justify-between gap-3">
              <div>
                <p className="text-ink">{MOV_LABELS[m.tipo] || m.tipo}</p>
                <p className="text-xs text-ink-soft">{m.motivo} · {formatDateTime(m.created_at)}</p>
              </div>
              <span
                className={`font-mono text-sm font-semibold ${
                  m.tipo === 'saida' || (m.tipo === 'ajuste' && m.quantidade < 0) ? 'text-status-cancelado' : 'text-status-entregue'
                }`}
              >
                {m.tipo === 'saida' ? '-' : m.quantidade >= 0 ? '+' : ''}
                {m.quantidade}
              </span>
            </div>
          ))}
          {movimentacoes.length === 0 && (
            <p className="text-ink-soft text-sm text-center py-6">Nenhuma movimentação registrada ainda.</p>
          )}
        </div>
      )}
    </Modal>
  )
}
