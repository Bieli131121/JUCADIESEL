import { useEffect, useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { listContasReceber, listContasPagar, criarContaPagar, marcarContaPaga } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import type { ContaReceber, ContaPagar } from '@/types/database'

function formatMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function Financeiro() {
  const [aba, setAba] = useState<'receber' | 'pagar'>('receber')
  const [receber, setReceber] = useState<ContaReceber[]>([])
  const [pagar, setPagar] = useState<ContaPagar[]>([])
  const [loading, setLoading] = useState(true)
  const [modalPagar, setModalPagar] = useState(false)

  async function carregar() {
    setLoading(true)
    const [r, p] = await Promise.all([listContasReceber(), listContasPagar()])
    setReceber(r)
    setPagar(p)
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const totalReceberPendente = receber.filter((c) => c.status === 'pendente').reduce((s, c) => s + c.valor, 0)
  const totalPagarPendente = pagar.filter((c) => c.status === 'pendente').reduce((s, c) => s + c.valor, 0)

  async function pagar_(tipo: 'receber' | 'pagar', id: string) {
    await marcarContaPaga(tipo, id)
    carregar()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Financeiro</h1>
        <p className="text-ink-soft text-sm mt-1">Contas a receber e a pagar</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <div className="card p-4">
          <p className="text-xs text-ink-soft font-medium">A receber (pendente)</p>
          <p className="font-display text-xl font-semibold text-steel mt-1">{formatMoney(totalReceberPendente)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-soft font-medium">A pagar (pendente)</p>
          <p className="font-display text-xl font-semibold text-status-cancelado mt-1">{formatMoney(totalPagarPendente)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <FiltroChip label="A receber" active={aba === 'receber'} onClick={() => setAba('receber')} />
          <FiltroChip label="A pagar" active={aba === 'pagar'} onClick={() => setAba('pagar')} />
        </div>
        {aba === 'pagar' && (
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={() => setModalPagar(true)}>
            <Plus size={16} /> Nova conta
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-ink-soft text-sm">Carregando...</p>
      ) : aba === 'receber' ? (
        <div className="card divide-y divide-border">
          {receber.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-ink font-medium truncate">{c.descricao}</p>
                <p className="text-xs text-ink-soft">{c.cliente?.nome} · vence {formatDate(c.data_vencimento)}</p>
              </div>
              <span className="font-mono text-ink">{formatMoney(c.valor)}</span>
              {c.status === 'pago' ? (
                <span className="text-xs text-status-entregue font-medium">Pago</span>
              ) : (
                <button
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                  onClick={() => pagar_('receber', c.id)}
                >
                  <Check size={12} /> Receber
                </button>
              )}
            </div>
          ))}
          {receber.length === 0 && <p className="text-ink-soft text-sm text-center py-8">Nenhuma conta a receber ainda.</p>}
        </div>
      ) : (
        <div className="card divide-y divide-border">
          {pagar.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-ink font-medium truncate">{c.descricao}</p>
                <p className="text-xs text-ink-soft">{c.fornecedor || 'Sem fornecedor'} · vence {formatDate(c.data_vencimento)}</p>
              </div>
              <span className="font-mono text-ink">{formatMoney(c.valor)}</span>
              {c.status === 'pago' ? (
                <span className="text-xs text-status-entregue font-medium">Pago</span>
              ) : (
                <button
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                  onClick={() => pagar_('pagar', c.id)}
                >
                  <Check size={12} /> Pagar
                </button>
              )}
            </div>
          ))}
          {pagar.length === 0 && <p className="text-ink-soft text-sm text-center py-8">Nenhuma conta a pagar cadastrada.</p>}
        </div>
      )}

      <ModalNovaContaPagar open={modalPagar} onClose={() => setModalPagar(false)} onSaved={carregar} />
    </div>
  )
}

function FiltroChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active ? 'bg-graphite text-white border-graphite' : 'bg-white text-ink-soft border-border hover:border-ink-soft'
      }`}
    >
      {label}
    </button>
  )
}

function ModalNovaContaPagar({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ descricao: '', fornecedor: '', valor: '', data_vencimento: '' })
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!form.descricao || !form.valor) return
    setSalvando(true)
    try {
      await criarContaPagar({
        descricao: form.descricao,
        fornecedor: form.fornecedor || null,
        valor: Number(form.valor),
        data_vencimento: form.data_vencimento || null,
      })
      setForm({ descricao: '', fornecedor: '', valor: '', data_vencimento: '' })
      onClose()
      onSaved()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title="Nova conta a pagar" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Descrição *</label>
          <input
            className="input-field"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />
        </div>
        <div>
          <label className="label-field">Fornecedor</label>
          <input
            className="input-field"
            value={form.fornecedor}
            onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Valor *</label>
            <input className="input-field" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Vencimento</label>
            <input
              type="date"
              className="input-field"
              value={form.data_vencimento}
              onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
            />
          </div>
        </div>
        <button className="btn-primary w-full mt-2" onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar conta'}
        </button>
      </div>
    </Modal>
  )
}
