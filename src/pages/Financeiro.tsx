import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Check, CircleCheck, Circle, MessageCircle, Wallet } from 'lucide-react'
import {
  listContasReceber,
  listContasPagar,
  listCaixaMovimentacoes,
  criarContaPagarParcelada,
  marcarContaPaga,
  alternarConciliacao,
  criarMovimentacaoCaixaManual,
} from '@/lib/db'
import { obterTemplatePorTipo, registrarEnvioWhatsapp } from '@/lib/whatsappNfe'
import { preencherTemplate, abrirWhatsApp } from '@/lib/whatsapp'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SkeletonList, SkeletonCards } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/contexts/ToastContext'
import { FORMAS_PAGAMENTO } from '@/types/database'
import type { ContaReceber, ContaPagar, CaixaMovimentacao } from '@/types/database'
import { formatDate, formatMoney } from '@/lib/format'
import { FiltroChip } from '@/components/ui/FiltroChip'

export default function Financeiro() {
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const abaInicial = searchParams.get('aba')
  const [aba, setAba] = useState<'receber' | 'pagar' | 'caixa' | 'dre'>(
    abaInicial === 'dre' || abaInicial === 'pagar' || abaInicial === 'caixa' ? abaInicial : 'receber'
  )
  const [receber, setReceber] = useState<ContaReceber[]>([])
  const [pagar, setPagar] = useState<ContaPagar[]>([])
  const [caixa, setCaixa] = useState<CaixaMovimentacao[]>([])
  const [loading, setLoading] = useState(true)
  const [modalPagar, setModalPagar] = useState(false)
  const [modalCaixa, setModalCaixa] = useState(false)
  const [modalPagamento, setModalPagamento] = useState<{ tipo: 'receber' | 'pagar'; id: string } | null>(null)

  async function carregar() {
    setLoading(true)
    const [r, p, c] = await Promise.all([listContasReceber(), listContasPagar(), listCaixaMovimentacoes()])
    setReceber(r)
    setPagar(p)
    setCaixa(c)
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const totalReceberPendente = receber.filter((c) => c.status === 'pendente').reduce((s, c) => s + c.valor, 0)
  const totalPagarPendente = pagar.filter((c) => c.status === 'pendente').reduce((s, c) => s + c.valor, 0)
  const totalEntradasCaixa = caixa.filter((c) => c.tipo === 'entrada').reduce((s, c) => s + c.valor, 0)
  const totalSaidasCaixa = caixa.filter((c) => c.tipo === 'saida').reduce((s, c) => s + c.valor, 0)
  const saldoCaixa = totalEntradasCaixa - totalSaidasCaixa

  async function alternarConciliado(tabela: 'contas_receber' | 'contas_pagar' | 'caixa_movimentacoes', id: string, atual: boolean) {
    await alternarConciliacao(tabela, id, !atual)
    carregar()
  }

  async function cobrarViaWhatsapp(c: ContaReceber) {
    const telefone = c.cliente?.whatsapp || c.cliente?.telefone
    if (!telefone) {
      showToast('Este cliente não tem telefone cadastrado.', 'error')
      return
    }
    try {
      const template = await obterTemplatePorTipo('cobranca')
      const mensagem = preencherTemplate(template, {
        cliente: c.cliente?.nome || '',
        valor: formatMoney(c.valor),
        vencimento: formatDate(c.data_vencimento),
        numero_os: '',
      })
      abrirWhatsApp(telefone, mensagem)
      await registrarEnvioWhatsapp({ cliente_id: c.cliente_id, tipo: 'cobranca', telefone, mensagem })
      showToast('WhatsApp aberto com a cobrança pronta.', 'success')
    } catch {
      showToast('Não foi possível preparar a mensagem.', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Financeiro</h1>
        <p className="text-ink-soft text-sm mt-1">Contas, fluxo de caixa e conciliação</p>
      </div>

      {loading ? (
        <SkeletonCards count={3} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-ink-soft font-medium">A receber (pendente)</p>
            <p className="font-display text-xl font-semibold text-steel mt-1">{formatMoney(totalReceberPendente)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-ink-soft font-medium">A pagar (pendente)</p>
            <p className="font-display text-xl font-semibold text-status-cancelado mt-1">{formatMoney(totalPagarPendente)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-ink-soft font-medium">Saldo em caixa</p>
            <p className={`font-display text-xl font-semibold mt-1 ${saldoCaixa >= 0 ? 'text-status-entregue' : 'text-status-cancelado'}`}>
              {formatMoney(saldoCaixa)}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <FiltroChip
            label={`A receber${receber.filter((c) => c.status === 'pendente').length ? ` (${receber.filter((c) => c.status === 'pendente').length})` : ''}`}
            active={aba === 'receber'}
            onClick={() => setAba('receber')}
          />
          <FiltroChip
            label={`A pagar${pagar.filter((c) => c.status === 'pendente').length ? ` (${pagar.filter((c) => c.status === 'pendente').length})` : ''}`}
            active={aba === 'pagar'}
            onClick={() => setAba('pagar')}
          />
          <FiltroChip label="Fluxo de caixa" active={aba === 'caixa'} onClick={() => setAba('caixa')} />
          <FiltroChip label="DRE" active={aba === 'dre'} onClick={() => setAba('dre')} />
        </div>
        {aba === 'pagar' && (
          <Button size="sm" icon={<Plus size={16} />} onClick={() => setModalPagar(true)}>
            Nova conta
          </Button>
        )}
        {aba === 'caixa' && (
          <Button size="sm" icon={<Plus size={16} />} onClick={() => setModalCaixa(true)}>
            Lançamento manual
          </Button>
        )}
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : aba === 'receber' ? (
        <div className="card divide-y divide-border">
          {receber.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-ink font-medium truncate">{c.descricao}</p>
                <p className="text-xs text-ink-soft">
                  {c.cliente?.nome} · vence {formatDate(c.data_vencimento)}
                  {c.categoria && ` · ${c.categoria}`}
                </p>
              </div>
              <span className="font-mono text-ink">{formatMoney(c.valor)}</span>
              {c.status === 'pago' ? (
                <>
                  <span className="text-xs text-status-entregue font-medium">Pago</span>
                  <button
                    title={c.conciliado ? 'Conciliado' : 'Marcar como conciliado'}
                    onClick={() => alternarConciliado('contas_receber', c.id, c.conciliado)}
                    className={c.conciliado ? 'text-status-entregue' : 'text-ink-soft hover:text-ink'}
                  >
                    {c.conciliado ? <CircleCheck size={16} /> : <Circle size={16} />}
                  </button>
                </>
              ) : (
                <>
                  <button title="Cobrar via WhatsApp" onClick={() => cobrarViaWhatsapp(c)} className="text-status-entregue hover:opacity-70">
                    <MessageCircle size={16} />
                  </button>
                  <Button variant="secondary" size="sm" icon={<Check size={12} />} onClick={() => setModalPagamento({ tipo: 'receber', id: c.id })}>
                    Receber
                  </Button>
                </>
              )}
            </div>
          ))}
          {receber.length === 0 && <EmptyState icon={Wallet} title="Nenhuma conta a receber ainda" />}
        </div>
      ) : aba === 'pagar' ? (
        <div className="card divide-y divide-border">
          {pagar.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-ink font-medium truncate">{c.descricao}</p>
                <p className="text-xs text-ink-soft">
                  {c.fornecedor || 'Sem fornecedor'} · vence {formatDate(c.data_vencimento)}
                  {c.parcela_numero && c.parcela_total && ` · Parcela ${c.parcela_numero}/${c.parcela_total}`}
                  {c.categoria && ` · ${c.categoria}`}
                </p>
              </div>
              <span className="font-mono text-ink">{formatMoney(c.valor)}</span>
              {c.status === 'pago' ? (
                <>
                  <span className="text-xs text-status-entregue font-medium">Pago</span>
                  <button
                    title={c.conciliado ? 'Conciliado' : 'Marcar como conciliado'}
                    onClick={() => alternarConciliado('contas_pagar', c.id, c.conciliado)}
                    className={c.conciliado ? 'text-status-entregue' : 'text-ink-soft hover:text-ink'}
                  >
                    {c.conciliado ? <CircleCheck size={16} /> : <Circle size={16} />}
                  </button>
                </>
              ) : (
                <Button variant="secondary" size="sm" icon={<Check size={12} />} onClick={() => setModalPagamento({ tipo: 'pagar', id: c.id })}>
                  Pagar
                </Button>
              )}
            </div>
          ))}
          {pagar.length === 0 && <p className="text-ink-soft text-sm text-center py-8">Nenhuma conta a pagar cadastrada.</p>}
        </div>
      ) : aba === 'caixa' ? (
        <div className="card divide-y divide-border">
          {caixa.map((m) => (
            <div key={m.id} className="flex items-center gap-4 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-ink font-medium truncate">{m.descricao}</p>
                <p className="text-xs text-ink-soft">
                  {formatDate(m.data_movimentacao)} · {m.categoria}
                  {m.forma_pagamento && ` · ${m.forma_pagamento}`}
                  {m.centro_custo && ` · CC: ${m.centro_custo}`}
                </p>
              </div>
              <span className={`font-mono font-medium ${m.tipo === 'entrada' ? 'text-status-entregue' : 'text-status-cancelado'}`}>
                {m.tipo === 'entrada' ? '+' : '-'} {formatMoney(m.valor)}
              </span>
              <button
                title={m.conciliado ? 'Conciliado' : 'Marcar como conciliado'}
                onClick={() => alternarConciliado('caixa_movimentacoes', m.id, m.conciliado)}
                className={m.conciliado ? 'text-status-entregue' : 'text-ink-soft hover:text-ink'}
              >
                {m.conciliado ? <CircleCheck size={16} /> : <Circle size={16} />}
              </button>
            </div>
          ))}
          {caixa.length === 0 && <EmptyState icon={Wallet} title="Nenhuma movimentação de caixa ainda" />}
        </div>
      ) : (
        <SecaoDRE caixa={caixa} />
      )}

      <ModalNovaContaPagar open={modalPagar} onClose={() => setModalPagar(false)} onSaved={carregar} />
      <ModalNovaMovimentacaoCaixa open={modalCaixa} onClose={() => setModalCaixa(false)} onSaved={carregar} />
      {modalPagamento && (
        <ModalConfirmarPagamento
          tipo={modalPagamento.tipo}
          id={modalPagamento.id}
          onClose={() => setModalPagamento(null)}
          onSaved={() => {
            setModalPagamento(null)
            carregar()
          }}
        />
      )}
    </div>
  )
}

function SecaoDRE({ caixa }: { caixa: CaixaMovimentacao[] }) {
  const hoje = new Date()
  const [mesReferencia, setMesReferencia] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`)

  const doMes = caixa.filter((m) => m.data_movimentacao.slice(0, 7) === mesReferencia)
  const receitas = doMes.filter((m) => m.tipo === 'entrada')
  const despesas = doMes.filter((m) => m.tipo === 'saida')

  const totalReceitas = receitas.reduce((s, m) => s + m.valor, 0)
  const totalDespesas = despesas.reduce((s, m) => s + m.valor, 0)
  const resultado = totalReceitas - totalDespesas

  const despesasPorCategoria = new Map<string, number>()
  despesas.forEach((m) => {
    const cat = m.categoria || 'Sem categoria'
    despesasPorCategoria.set(cat, (despesasPorCategoria.get(cat) || 0) + m.valor)
  })
  const categoriasOrdenadas = [...despesasPorCategoria.entries()].sort((a, b) => b[1] - a[1])

  return (
    <div className="card p-5 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display font-semibold text-ink">DRE Simplificada</h2>
        <input
          type="month"
          className="input-field w-auto"
          value={mesReferencia}
          onChange={(e) => setMesReferencia(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-ink">Receita bruta</span>
          <span className="font-mono text-status-entregue font-medium">{formatMoney(totalReceitas)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink">(-) Despesas totais</span>
          <span className="font-mono text-status-cancelado font-medium">-{formatMoney(totalDespesas)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-border">
          <span className="font-display font-semibold text-ink">Resultado do período</span>
          <span className={`font-mono font-semibold text-lg ${resultado >= 0 ? 'text-status-entregue' : 'text-status-cancelado'}`}>
            {formatMoney(resultado)}
          </span>
        </div>
      </div>

      {categoriasOrdenadas.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-ink-soft uppercase mb-2">Despesas por categoria</p>
          <div className="space-y-2">
            {categoriasOrdenadas.map(([categoria, valor]) => {
              const max = categoriasOrdenadas[0][1]
              return (
                <div key={categoria} className="flex items-center gap-3 text-sm">
                  <span className="text-ink w-32 truncate">{categoria}</span>
                  <div className="flex-1 bg-canvas rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-status-cancelado rounded-full" style={{ width: `${(valor / max) * 100}%` }} />
                  </div>
                  <span className="font-mono text-xs text-ink-soft w-20 text-right">{formatMoney(valor)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {doMes.length === 0 && (
        <p className="text-ink-soft text-sm text-center py-4">Nenhuma movimentação de caixa neste mês.</p>
      )}

      <p className="text-[11px] text-ink-soft border-t border-border pt-3">
        DRE simplificada baseada no fluxo de caixa (regime de caixa, não de competência). Não substitui a apuração
        contábil oficial — consulte seu contador para relatórios fiscais formais.
      </p>
    </div>
  )
}



function ModalConfirmarPagamento({
  tipo,
  id,
  onClose,
  onSaved,
}: {
  tipo: 'receber' | 'pagar'
  id: string
  onClose: () => void
  onSaved: () => void
}) {
  const { showToast } = useToast()
  const [forma, setForma] = useState<string>(FORMAS_PAGAMENTO[0])
  const [salvando, setSalvando] = useState(false)

  async function confirmar() {
    setSalvando(true)
    try {
      await marcarContaPaga(tipo, id, forma)
      showToast(tipo === 'receber' ? 'Pagamento recebido com sucesso.' : 'Conta paga com sucesso.', 'success')
      onSaved()
    } catch {
      showToast('Não foi possível confirmar o pagamento.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open title={tipo === 'receber' ? 'Confirmar recebimento' : 'Confirmar pagamento'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Forma de pagamento</label>
          <select className="input-field" value={forma} onChange={(e) => setForma(e.target.value)}>
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <Button fullWidth onClick={confirmar} loading={salvando}>
          Confirmar
        </Button>
      </div>
    </Modal>
  )
}

function ModalNovaContaPagar({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    descricao: '',
    fornecedor: '',
    valor: '',
    data_vencimento: '',
    categoria: '',
    centro_custo: '',
    parcelas: '1',
  })
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!form.descricao || !form.valor || !form.data_vencimento) return
    setSalvando(true)
    try {
      const numeroParcelas = Math.max(1, Number(form.parcelas) || 1)
      const criadas = await criarContaPagarParcelada({
        descricao: form.descricao,
        fornecedor: form.fornecedor || null,
        valorTotal: Number(form.valor),
        numeroParcelas,
        categoria: form.categoria || null,
        centro_custo: form.centro_custo || null,
        primeiroVencimento: form.data_vencimento,
      })
      showToast(
        numeroParcelas > 1 ? `${criadas.length} parcelas cadastradas.` : 'Conta a pagar cadastrada.',
        'success'
      )
      setForm({ descricao: '', fornecedor: '', valor: '', data_vencimento: '', categoria: '', centro_custo: '', parcelas: '1' })
      onClose()
      onSaved()
    } catch {
      showToast('Não foi possível salvar a conta.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title="Nova conta a pagar" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Descrição *</label>
          <input className="input-field" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </div>
        <div>
          <label className="label-field">Fornecedor</label>
          <input className="input-field" value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Categoria</label>
            <input className="input-field" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="ex: Peças, Aluguel" />
          </div>
          <div>
            <label className="label-field">Centro de custo</label>
            <input className="input-field" value={form.centro_custo} onChange={(e) => setForm({ ...form, centro_custo: e.target.value })} placeholder="ex: Oficina, Administrativo" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label-field">Valor total *</label>
            <input className="input-field" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </div>
          <div>
            <label className="label-field">1º vencimento *</label>
            <input type="date" className="input-field" value={form.data_vencimento} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Parcelas</label>
            <input className="input-field" value={form.parcelas} onChange={(e) => setForm({ ...form, parcelas: e.target.value })} placeholder="1" />
          </div>
        </div>
        {Number(form.parcelas) > 1 && form.valor && (
          <p className="text-[11px] text-ink-soft">
            {form.parcelas}x de aproximadamente {formatMoney(Number(form.valor) / Number(form.parcelas))}, vencendo mensalmente a partir da data escolhida.
          </p>
        )}
        <Button fullWidth className="mt-2" onClick={salvar} loading={salvando}>
          Salvar conta
        </Button>
      </div>
    </Modal>
  )
}

function ModalNovaMovimentacaoCaixa({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    descricao: '',
    valor: '',
    categoria: '',
    centro_custo: '',
    forma_pagamento: FORMAS_PAGAMENTO[0] as string,
  })
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!form.descricao || !form.valor || !form.categoria) return
    setSalvando(true)
    try {
      await criarMovimentacaoCaixaManual({
        tipo: form.tipo,
        categoria: form.categoria,
        centro_custo: form.centro_custo || null,
        forma_pagamento: form.forma_pagamento || null,
        descricao: form.descricao,
        valor: Number(form.valor),
      })
      showToast('Lançamento registrado no caixa.', 'success')
      setForm({ tipo: 'entrada', descricao: '', valor: '', categoria: '', centro_custo: '', forma_pagamento: FORMAS_PAGAMENTO[0] })
      onClose()
      onSaved()
    } catch {
      showToast('Não foi possível registrar o lançamento.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title="Lançamento manual de caixa" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
              form.tipo === 'entrada' ? 'bg-graphite text-white border-graphite' : 'bg-white text-ink-soft border-border'
            }`}
            onClick={() => setForm({ ...form, tipo: 'entrada' })}
          >
            Receita
          </button>
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
              form.tipo === 'saida' ? 'bg-graphite text-white border-graphite' : 'bg-white text-ink-soft border-border'
            }`}
            onClick={() => setForm({ ...form, tipo: 'saida' })}
          >
            Despesa
          </button>
        </div>
        <div>
          <label className="label-field">Descrição *</label>
          <input className="input-field" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Categoria *</label>
            <input className="input-field" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="ex: Despesas fixas" />
          </div>
          <div>
            <label className="label-field">Centro de custo</label>
            <input className="input-field" value={form.centro_custo} onChange={(e) => setForm({ ...form, centro_custo: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Valor *</label>
            <input className="input-field" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Forma de pagamento</label>
            <select className="input-field" value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })}>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
        <Button fullWidth className="mt-2" onClick={salvar} loading={salvando}>
          Salvar lançamento
        </Button>
      </div>
    </Modal>
  )
}
