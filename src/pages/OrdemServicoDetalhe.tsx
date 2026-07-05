import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import {
  getOrdemServico,
  adicionarItemOS,
  removerItemOS,
  mudarStatusOS,
  listPecas,
} from '@/lib/db'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Placa } from '@/components/ui/Placa'
import { Modal } from '@/components/ui/Modal'
import { STATUS_OS_ORDER, STATUS_OS_LABELS } from '@/types/database'
import type { OrdemServico, Peca } from '@/types/database'

function formatMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function OrdemServicoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [os, setOs] = useState<OrdemServico | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalItem, setModalItem] = useState(false)

  async function carregar() {
    if (!id) return
    setLoading(true)
    setOs(await getOrdemServico(id))
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [id])

  async function avancarStatus() {
    if (!os) return
    const idx = STATUS_OS_ORDER.indexOf(os.status)
    const proximo = STATUS_OS_ORDER[idx + 1]
    if (!proximo) return
    if (!confirm(`Mudar status para "${STATUS_OS_LABELS[proximo]}"?`)) return
    await mudarStatusOS(os.id, proximo)
    carregar()
  }

  async function cancelar() {
    if (!os) return
    if (!confirm('Cancelar esta OS? Se peças já foram baixadas, o estoque será estornado.')) return
    await mudarStatusOS(os.id, 'cancelado')
    carregar()
  }

  async function removerItem(itemId: string) {
    if (!os) return
    await removerItemOS(itemId, os.id)
    carregar()
  }

  if (loading) return <p className="text-ink-soft text-sm">Carregando...</p>
  if (!os) return <p className="text-ink-soft text-sm">OS não encontrada.</p>

  const idx = STATUS_OS_ORDER.indexOf(os.status)
  const proximoStatus = STATUS_OS_ORDER[idx + 1]
  const podeEditar = !['entregue', 'cancelado'].includes(os.status)

  return (
    <div className="space-y-6 max-w-3xl">
      <button
        onClick={() => navigate('/ordens-servico')}
        className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold text-ink">OS #{os.numero}</h1>
            <StatusBadge status={os.status} />
          </div>
          <p className="text-ink-soft text-sm mt-1">
            {os.cliente?.nome} · {os.veiculo && <Placa placa={os.veiculo.placa} />}{' '}
            {os.veiculo?.marca} {os.veiculo?.modelo}
          </p>
        </div>
        <div className="flex gap-2">
          {podeEditar && proximoStatus && (
            <button className="btn-primary" onClick={avancarStatus}>
              Avançar → {STATUS_OS_LABELS[proximoStatus]}
            </button>
          )}
          {podeEditar && (
            <button className="btn-secondary text-status-cancelado border-status-cancelado/30" onClick={cancelar}>
              Cancelar OS
            </button>
          )}
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink text-sm">Diagnóstico</h2>
        <p className="text-sm text-ink-soft">
          {os.defeito_relatado || 'Nenhum defeito relatado registrado.'}
        </p>
        {os.km_entrada && <p className="text-xs text-ink-soft font-mono">KM de entrada: {os.km_entrada.toLocaleString('pt-BR')}</p>}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-ink text-sm">Itens (serviços e peças)</h2>
          {podeEditar && (
            <button
              className="text-xs text-torque font-medium hover:underline flex items-center gap-1"
              onClick={() => setModalItem(true)}
            >
              <Plus size={14} /> Adicionar item
            </button>
          )}
        </div>
        <div className="divide-y divide-border">
          {(os.itens || []).map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span
                className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                  item.tipo === 'peca' ? 'bg-steel-light text-steel' : 'bg-torque-light text-torque-dark'
                }`}
              >
                {item.tipo === 'peca' ? 'Peça' : 'Serviço'}
              </span>
              <span className="flex-1 text-ink">{item.descricao}</span>
              <span className="text-ink-soft font-mono text-xs">
                {item.quantidade} × {formatMoney(item.valor_unitario)}
              </span>
              <span className="font-mono text-ink w-24 text-right">{formatMoney(item.valor_total)}</span>
              {podeEditar && (
                <button onClick={() => removerItem(item.id)} className="text-ink-soft hover:text-status-cancelado">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {(!os.itens || os.itens.length === 0) && (
            <p className="text-ink-soft text-sm py-4 text-center">Nenhum item adicionado ainda.</p>
          )}
        </div>
        <div className="flex justify-between items-center pt-3 mt-2 border-t border-border">
          <span className="font-display font-semibold text-ink">Total</span>
          <span className="font-mono font-semibold text-lg text-ink">{formatMoney(os.valor_total)}</span>
        </div>
      </div>

      {modalItem && (
        <ModalAdicionarItem
          osId={os.id}
          onClose={() => setModalItem(false)}
          onSaved={() => {
            setModalItem(false)
            carregar()
          }}
        />
      )}
    </div>
  )
}

function ModalAdicionarItem({
  osId,
  onClose,
  onSaved,
}: {
  osId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [tipo, setTipo] = useState<'servico' | 'peca'>('servico')
  const [pecas, setPecas] = useState<Peca[]>([])
  const [pecaId, setPecaId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [valorUnitario, setValorUnitario] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    listPecas().then(setPecas)
  }, [])

  function selecionarPeca(id: string) {
    setPecaId(id)
    const p = pecas.find((x) => x.id === id)
    if (p) {
      setDescricao(p.nome)
      setValorUnitario(String(p.preco_venda))
    }
  }

  async function salvar() {
    if (!descricao || !valorUnitario) return
    setSalvando(true)
    try {
      await adicionarItemOS({
        os_id: osId,
        tipo,
        peca_id: tipo === 'peca' ? pecaId || null : null,
        descricao,
        quantidade: Number(quantidade) || 1,
        valor_unitario: Number(valorUnitario) || 0,
      })
      onSaved()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open title="Adicionar item" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
              tipo === 'servico' ? 'bg-graphite text-white border-graphite' : 'bg-white text-ink-soft border-border'
            }`}
            onClick={() => setTipo('servico')}
          >
            Serviço
          </button>
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
              tipo === 'peca' ? 'bg-graphite text-white border-graphite' : 'bg-white text-ink-soft border-border'
            }`}
            onClick={() => setTipo('peca')}
          >
            Peça (estoque)
          </button>
        </div>

        {tipo === 'peca' && (
          <div>
            <label className="label-field">Peça do estoque</label>
            <select className="input-field" value={pecaId} onChange={(e) => selecionarPeca(e.target.value)}>
              <option value="">Selecione ou descreva manualmente abaixo</option>
              {pecas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} · {p.quantidade_estoque} un. em estoque
                </option>
              ))}
            </select>
          </div>
        )}

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
            <label className="label-field">Valor unitário *</label>
            <input
              className="input-field"
              value={valorUnitario}
              onChange={(e) => setValorUnitario(e.target.value)}
            />
          </div>
        </div>
        <button className="btn-primary w-full mt-2" onClick={salvar} disabled={salvando}>
          {salvando ? 'Adicionando...' : 'Adicionar item'}
        </button>
      </div>
    </Modal>
  )
}
