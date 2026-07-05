import { useEffect, useState } from 'react'
import { Plus, ArrowDownToLine, AlertTriangle } from 'lucide-react'
import { listPecas, upsertPeca, registrarEntradaEstoque } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import type { Peca } from '@/types/database'

function formatMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Estoque() {
  const [pecas, setPecas] = useState<Peca[]>([])
  const [loading, setLoading] = useState(true)
  const [modalNova, setModalNova] = useState(false)
  const [modalEntrada, setModalEntrada] = useState<Peca | null>(null)

  async function carregar() {
    setLoading(true)
    setPecas(await listPecas())
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Estoque</h1>
          <p className="text-ink-soft text-sm mt-1">{pecas.length} peças cadastradas</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModalNova(true)}>
          <Plus size={16} /> Nova peça
        </button>
      </div>

      {loading ? (
        <p className="text-ink-soft text-sm">Carregando...</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-soft border-b border-border">
                <th className="p-3 font-medium">Peça</th>
                <th className="p-3 font-medium">Código</th>
                <th className="p-3 font-medium">Estoque</th>
                <th className="p-3 font-medium">Preço venda</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pecas.map((p) => {
                const baixo = p.quantidade_estoque <= p.estoque_minimo
                return (
                  <tr key={p.id}>
                    <td className="p-3 text-ink font-medium">{p.nome}</td>
                    <td className="p-3 font-mono text-xs text-ink-soft">{p.codigo || '—'}</td>
                    <td className="p-3">
                      <span className={`font-mono text-xs font-semibold ${baixo ? 'text-status-cancelado' : 'text-ink'}`}>
                        {p.quantidade_estoque}
                      </span>
                      {baixo && <AlertTriangle size={12} className="inline ml-1 text-status-cancelado" />}
                    </td>
                    <td className="p-3 font-mono text-ink">{formatMoney(p.preco_venda)}</td>
                    <td className="p-3 text-right">
                      <button
                        className="text-xs text-torque font-medium hover:underline flex items-center gap-1 ml-auto"
                        onClick={() => setModalEntrada(p)}
                      >
                        <ArrowDownToLine size={12} /> Entrada
                      </button>
                    </td>
                  </tr>
                )
              })}
              {pecas.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-ink-soft">
                    Nenhuma peça cadastrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ModalNovaPeca open={modalNova} onClose={() => setModalNova(false)} onSaved={carregar} />
      {modalEntrada && (
        <ModalEntradaEstoque peca={modalEntrada} onClose={() => setModalEntrada(null)} onSaved={carregar} />
      )}
    </div>
  )
}

function ModalNovaPeca({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: '',
    codigo: '',
    categoria: '',
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
        categoria: form.categoria || null,
        quantidade_estoque: Number(form.quantidade_estoque) || 0,
        estoque_minimo: Number(form.estoque_minimo) || 5,
        preco_custo: Number(form.preco_custo) || 0,
        preco_venda: Number(form.preco_venda) || 0,
        fornecedor: form.fornecedor || null,
      })
      onClose()
      onSaved()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title="Nova peça" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Nome *</label>
          <input className="input-field" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Código</label>
            <input className="input-field" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Categoria</label>
            <input
              className="input-field"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Estoque inicial</label>
            <input
              className="input-field"
              value={form.quantidade_estoque}
              onChange={(e) => setForm({ ...form, quantidade_estoque: e.target.value })}
            />
          </div>
          <div>
            <label className="label-field">Estoque mínimo</label>
            <input
              className="input-field"
              value={form.estoque_minimo}
              onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Preço custo</label>
            <input
              className="input-field"
              value={form.preco_custo}
              onChange={(e) => setForm({ ...form, preco_custo: e.target.value })}
            />
          </div>
          <div>
            <label className="label-field">Preço venda *</label>
            <input
              className="input-field"
              value={form.preco_venda}
              onChange={(e) => setForm({ ...form, preco_venda: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="label-field">Fornecedor</label>
          <input
            className="input-field"
            value={form.fornecedor}
            onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
          />
        </div>
        <button className="btn-primary w-full mt-2" onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar peça'}
        </button>
      </div>
    </Modal>
  )
}

function ModalEntradaEstoque({ peca, onClose, onSaved }: { peca: Peca; onClose: () => void; onSaved: () => void }) {
  const [quantidade, setQuantidade] = useState('1')
  const [motivo, setMotivo] = useState('Compra fornecedor')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    const qtd = Number(quantidade)
    if (!qtd || qtd <= 0) return
    setSalvando(true)
    try {
      await registrarEntradaEstoque(peca.id, qtd, motivo)
      onClose()
      onSaved()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open title={`Entrada de estoque · ${peca.nome}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-ink-soft">Estoque atual: {peca.quantidade_estoque} unidades</p>
        <div>
          <label className="label-field">Quantidade a adicionar *</label>
          <input className="input-field" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
        </div>
        <div>
          <label className="label-field">Motivo</label>
          <input className="input-field" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <button className="btn-primary w-full mt-2" onClick={salvar} disabled={salvando}>
          {salvando ? 'Registrando...' : 'Confirmar entrada'}
        </button>
      </div>
    </Modal>
  )
}
