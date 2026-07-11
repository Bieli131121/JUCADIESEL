import { useEffect, useMemo, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Check, X as XIcon, MessageCircle } from 'lucide-react'
import { listAgendamentos, listClientes, listVeiculos, criarAgendamento, atualizarStatusAgendamento, reagendar } from '@/lib/db'
import { obterTemplatePorTipo, registrarEnvioWhatsapp } from '@/lib/whatsappNfe'
import { preencherTemplate, abrirWhatsApp } from '@/lib/whatsapp'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import type { Agendamento as AgendamentoType, Cliente, Veiculo } from '@/types/database'

const STATUS_LABEL: Record<string, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  convertido: 'Convertido em OS',
  cancelado: 'Cancelado',
}

const STATUS_COR: Record<string, string> = {
  agendado: 'bg-gray-100 text-gray-700 border-gray-300',
  confirmado: 'bg-steel-light text-steel border-steel/30',
  convertido: 'bg-green-50 text-green-700 border-green-300',
  cancelado: 'bg-red-50 text-red-700 border-red-300',
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function mesmoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function chaveDia(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Agendamento() {
  const { showToast } = useToast()
  const [agendamentos, setAgendamentos] = useState<AgendamentoType[]>([])
  const [loading, setLoading] = useState(true)
  const [modalNovo, setModalNovo] = useState(false)
  const [visao, setVisao] = useState<'mes' | 'semana' | 'dia'>('mes')
  const [cursor, setCursor] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    setAgendamentos(await listAgendamentos())
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  // Lembretes: avisa sobre agendamentos dentro da próxima hora (uma vez por sessão)
  useEffect(() => {
    if (agendamentos.length === 0) return
    const avisados = JSON.parse(sessionStorage.getItem('lembretes_avisados') || '[]') as string[]
    const agora = new Date()
    const em1hora = new Date(agora.getTime() + 60 * 60000)
    agendamentos
      .filter((a) => a.status === 'agendado' || a.status === 'confirmado')
      .forEach((a) => {
        const dataAg = new Date(a.data_hora)
        if (dataAg >= agora && dataAg <= em1hora && !avisados.includes(a.id)) {
          showToast(`Agendamento em breve: ${a.cliente?.nome || 'Cliente'} às ${dataAg.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 'info')
          avisados.push(a.id)
        }
      })
    sessionStorage.setItem('lembretes_avisados', JSON.stringify(avisados))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendamentos])

  async function mudarStatus(id: string, status: AgendamentoType['status']) {
    await atualizarStatusAgendamento(id, status)
    showToast(status === 'confirmado' ? 'Agendamento confirmado.' : 'Agendamento cancelado.', 'info')
    carregar()
  }

  async function confirmarViaWhatsapp(a: AgendamentoType) {
    const telefone = a.cliente?.whatsapp || a.cliente?.telefone
    if (!telefone) {
      showToast('Este cliente não tem telefone cadastrado.', 'error')
      return
    }
    try {
      const dataAg = new Date(a.data_hora)
      const template = await obterTemplatePorTipo('confirmacao_agendamento')
      const mensagem = preencherTemplate(template, {
        cliente: a.cliente?.nome || '',
        data: dataAg.toLocaleDateString('pt-BR'),
        hora: dataAg.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      })
      abrirWhatsApp(telefone, mensagem)
      await registrarEnvioWhatsapp({ cliente_id: a.cliente_id, tipo: 'confirmacao_agendamento', telefone, mensagem })
      showToast('WhatsApp aberto com a confirmação pronta.', 'success')
    } catch {
      showToast('Não foi possível preparar a mensagem.', 'error')
    }
  }

  async function onDrop(dia: Date) {
    if (!arrastando) return
    const ag = agendamentos.find((a) => a.id === arrastando)
    if (!ag) return
    const dataOriginal = new Date(ag.data_hora)
    const novaData = new Date(dia)
    novaData.setHours(dataOriginal.getHours(), dataOriginal.getMinutes())
    try {
      await reagendar(arrastando, novaData.toISOString())
      showToast('Agendamento movido com sucesso.', 'success')
      carregar()
    } catch {
      showToast('Não foi possível mover o agendamento.', 'error')
    } finally {
      setArrastando(null)
    }
  }

  function navegar(direcao: 1 | -1) {
    const nova = new Date(cursor)
    if (visao === 'mes') nova.setMonth(nova.getMonth() + direcao)
    else if (visao === 'semana') nova.setDate(nova.getDate() + direcao * 7)
    else nova.setDate(nova.getDate() + direcao)
    setCursor(nova)
  }

  const diasDoMes = useMemo(() => {
    const primeiroDiaMes = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const inicioGrade = new Date(primeiroDiaMes)
    inicioGrade.setDate(inicioGrade.getDate() - primeiroDiaMes.getDay())
    const dias: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(inicioGrade)
      d.setDate(inicioGrade.getDate() + i)
      dias.push(d)
    }
    return dias
  }, [cursor])

  const diasDaSemana = useMemo(() => {
    const inicio = new Date(cursor)
    inicio.setDate(inicio.getDate() - inicio.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicio)
      d.setDate(inicio.getDate() + i)
      return d
    })
  }, [cursor])

  function agendamentosDoDia(dia: Date) {
    return agendamentos
      .filter((a) => mesmoDia(new Date(a.data_hora), dia))
      .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
  }

  const tituloTopo =
    visao === 'mes'
      ? `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`
      : visao === 'semana'
      ? `${diasDaSemana[0].getDate()}/${diasDaSemana[0].getMonth() + 1} — ${diasDaSemana[6].getDate()}/${diasDaSemana[6].getMonth() + 1}`
      : cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) return <SkeletonList rows={5} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Agendamento</h1>
          <p className="text-ink-soft text-sm mt-1">{agendamentos.filter((a) => a.status !== 'cancelado').length} agendamentos ativos</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalNovo(true)}>
          Novo agendamento
        </Button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navegar(-1)} className="p-1.5 rounded-lg hover:bg-canvas text-ink-soft">
            <ChevronLeft size={18} />
          </button>
          <span className="font-display font-semibold text-ink capitalize min-w-[180px] text-center">{tituloTopo}</span>
          <button onClick={() => navegar(1)} className="p-1.5 rounded-lg hover:bg-canvas text-ink-soft">
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setCursor(new Date())} className="text-xs text-torque font-medium hover:underline ml-1">
            Hoje
          </button>
        </div>
        <div className="flex gap-1">
          <VisaoChip label="Mês" active={visao === 'mes'} onClick={() => setVisao('mes')} />
          <VisaoChip label="Semana" active={visao === 'semana'} onClick={() => setVisao('semana')} />
          <VisaoChip label="Dia" active={visao === 'dia'} onClick={() => setVisao('dia')} />
        </div>
      </div>

      {visao === 'mes' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-7 border-b border-border">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="text-xs font-medium text-ink-soft text-center py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {diasDoMes.map((dia) => {
                  const doMesAtual = dia.getMonth() === cursor.getMonth()
                  const eHoje = mesmoDia(dia, new Date())
                  const eventos = agendamentosDoDia(dia)
                  return (
                    <div
                      key={chaveDia(dia)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onDrop(dia)}
                      onClick={() => {
                        setDiaSelecionado(dia)
                        setVisao('dia')
                        setCursor(dia)
                      }}
                      className={`min-h-[92px] border-b border-r border-border p-1.5 cursor-pointer hover:bg-canvas/50 transition-colors ${
                        !doMesAtual ? 'bg-canvas/30' : ''
                      }`}
                    >
                      <span
                        className={`text-xs font-mono inline-flex items-center justify-center w-5 h-5 rounded-full ${
                          eHoje ? 'bg-torque text-white' : doMesAtual ? 'text-ink' : 'text-ink-soft/50'
                        }`}
                      >
                        {dia.getDate()}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {eventos.slice(0, 3).map((ev) => (
                          <div
                            key={ev.id}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation()
                              setArrastando(ev.id)
                            }}
                            className={`text-[10px] px-1 py-0.5 rounded border truncate cursor-grab ${STATUS_COR[ev.status]}`}
                            title={`${ev.cliente?.nome || ''} · ${new Date(ev.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                          >
                            {new Date(ev.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {ev.cliente?.nome}
                          </div>
                        ))}
                        {eventos.length > 3 && <p className="text-[10px] text-ink-soft pl-1">+{eventos.length - 3} mais</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {visao === 'semana' && (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-3 min-w-[820px]">
            {diasDaSemana.map((dia) => (
              <div
                key={chaveDia(dia)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(dia)}
                className={`card p-3 min-h-[160px] ${mesmoDia(dia, new Date()) ? 'ring-2 ring-torque/40' : ''}`}
              >
                <p className="text-xs font-medium text-ink-soft mb-2">
                  {DIAS_SEMANA[dia.getDay()]} <span className="font-mono">{dia.getDate()}</span>
                </p>
                <div className="space-y-1">
                  {agendamentosDoDia(dia).map((ev) => (
                    <div
                      key={ev.id}
                      draggable
                      onDragStart={() => setArrastando(ev.id)}
                      className={`text-[11px] px-1.5 py-1 rounded border cursor-grab ${STATUS_COR[ev.status]}`}
                    >
                      <p className="font-mono">{new Date(ev.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="truncate">{ev.cliente?.nome}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {visao === 'dia' && (
        <div className="card divide-y divide-border">
          {agendamentosDoDia(diaSelecionado || cursor).map((a) => (
            <div key={a.id} className="flex items-center gap-4 p-4 text-sm">
              <span className="font-mono text-ink w-14">
                {new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-ink font-medium">{a.cliente?.nome || 'Cliente não vinculado'}</p>
                <p className="text-xs text-ink-soft">
                  {a.veiculo && `${a.veiculo.placa} · `}
                  {a.descricao}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COR[a.status]}`}>{STATUS_LABEL[a.status]}</span>
              <button title="Confirmar via WhatsApp" onClick={() => confirmarViaWhatsapp(a)} className="text-status-entregue hover:opacity-70">
                <MessageCircle size={16} />
              </button>
              {a.status === 'agendado' && (
                <div className="flex gap-1">
                  <button className="p-1.5 rounded-lg bg-steel-light text-steel hover:opacity-80" onClick={() => mudarStatus(a.id, 'confirmado')}>
                    <Check size={14} />
                  </button>
                  <button className="p-1.5 rounded-lg bg-red-50 text-status-cancelado hover:opacity-80" onClick={() => mudarStatus(a.id, 'cancelado')}>
                    <XIcon size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {agendamentosDoDia(diaSelecionado || cursor).length === 0 && (
            <p className="text-ink-soft text-sm text-center py-8">Nenhum agendamento neste dia.</p>
          )}
        </div>
      )}

      <ModalNovoAgendamento open={modalNovo} onClose={() => setModalNovo(false)} onSaved={carregar} />
    </div>
  )
}

function VisaoChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active ? 'bg-graphite text-white' : 'text-ink-soft hover:bg-canvas'
      }`}
    >
      {label}
    </button>
  )
}

function ModalNovoAgendamento({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [form, setForm] = useState({ cliente_id: '', veiculo_id: '', data: '', hora: '', descricao: '' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (open) {
      Promise.all([listClientes(), listVeiculos()]).then(([c, v]) => {
        setClientes(c)
        setVeiculos(v)
      })
    }
  }, [open])

  const veiculosDoCliente = veiculos.filter((v) => v.cliente_id === form.cliente_id)

  async function salvar() {
    if (!form.cliente_id || !form.data || !form.hora) return
    setSalvando(true)
    try {
      await criarAgendamento({
        cliente_id: form.cliente_id,
        veiculo_id: form.veiculo_id || null,
        data_hora: new Date(`${form.data}T${form.hora}`).toISOString(),
        descricao: form.descricao || null,
      })
      showToast('Agendamento criado com sucesso.', 'success')
      onClose()
      onSaved()
    } catch {
      showToast('Não foi possível criar o agendamento.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title="Novo agendamento" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Cliente *</label>
          <select className="input-field" value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value, veiculo_id: '' })}>
            <option value="">Selecione...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Veículo</label>
          <select className="input-field" value={form.veiculo_id} onChange={(e) => setForm({ ...form, veiculo_id: e.target.value })} disabled={!form.cliente_id}>
            <option value="">Não informado</option>
            {veiculosDoCliente.map((v) => (
              <option key={v.id} value={v.id}>{v.placa} · {v.marca} {v.modelo}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Data *</label>
            <input type="date" className="input-field" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Hora *</label>
            <input type="time" className="input-field" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label-field">Descrição</label>
          <input className="input-field" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Revisão dos freios" />
        </div>
        <Button fullWidth className="mt-2" onClick={salvar} loading={salvando}>
          Salvar agendamento
        </Button>
      </div>
    </Modal>
  )
}
