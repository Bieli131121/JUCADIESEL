import { useEffect, useState } from 'react'
import { Plus, Ban, CheckCircle2, Pencil, Trash2, UserCog } from 'lucide-react'
import { listTodosMecanicos, upsertMecanico, alterarStatusMecanico, deleteMecanico, listOrdensServico } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconAction } from '@/components/ui/IconAction'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import type { Mecanico, OrdemServico } from '@/types/database'
import { formatMoney } from '@/lib/format'

export default function Mecanicos() {
  const { showToast } = useToast()
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([])
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [loading, setLoading] = useState(true)
  const [modalNovo, setModalNovo] = useState(false)
  const [modalEditar, setModalEditar] = useState<Mecanico | null>(null)
  const [confirmarDesativar, setConfirmarDesativar] = useState<Mecanico | null>(null)
  const [confirmarExcluir, setConfirmarExcluir] = useState<Mecanico | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  async function carregar() {
    setLoading(true)
    const [m, o] = await Promise.all([listTodosMecanicos(), listOrdensServico()])
    setMecanicos(m)
    setOrdens(o)
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function alternarStatus(m: Mecanico) {
    if (m.ativo) {
      setConfirmarDesativar(m)
      return
    }
    await alterarStatusMecanico(m.id, true)
    showToast('Mecânico reativado.', 'info')
    carregar()
  }

  async function confirmarDesativacao() {
    if (!confirmarDesativar) return
    await alterarStatusMecanico(confirmarDesativar.id, false)
    showToast('Mecânico desativado.', 'info')
    setConfirmarDesativar(null)
    carregar()
  }

  async function excluirMecanico() {
    if (!confirmarExcluir) return
    setExcluindo(true)
    try {
      await deleteMecanico(confirmarExcluir.id)
      showToast('Mecânico excluído.', 'success')
      setConfirmarExcluir(null)
      carregar()
    } catch (erro: any) {
      showToast(erro.message || 'Não foi possível excluir o mecânico.', 'error')
    } finally {
      setExcluindo(false)
    }
  }

  const hoje = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  function estatisticasDoMecanico(mecanicoId: string) {
    const osDoMecanico = ordens.filter((o) => o.mecanico_id === mecanicoId)
    const entreguesNoMes = osDoMecanico.filter(
      (o) => o.status === 'entregue' && o.data_entrega?.slice(0, 7) === mesAtual
    )
    const faturamentoMes = entreguesNoMes.reduce((s, o) => s + o.valor_total, 0)
    return {
      totalAtendimentos: osDoMecanico.length,
      entreguesNoMes: entreguesNoMes.length,
      faturamentoMes,
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Mecânicos</h1>
          <p className="text-ink-soft text-sm mt-1">{mecanicos.filter((m) => m.ativo).length} ativos</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalNovo(true)}>
          Novo mecânico
        </Button>
      </div>

      {loading ? (
        <SkeletonList rows={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {mecanicos.map((m) => {
            const stats = estatisticasDoMecanico(m.id)
            const comissaoEstimada = stats.faturamentoMes * (m.comissao_percentual / 100)
            return (
              <div key={m.id} className="card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display font-semibold text-ink">{m.nome}</p>
                    {m.especialidade && <p className="text-xs text-ink-soft">{m.especialidade}</p>}
                    {m.telefone && <p className="text-xs text-ink-soft font-mono">{m.telefone}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {!m.ativo && <span className="text-[10px] font-semibold uppercase text-status-cancelado mr-1">Inativo</span>}
                    <IconAction title="Editar" onClick={() => setModalEditar(m)}>
                      <Pencil size={15} />
                    </IconAction>
                    <button
                      className={`p-1.5 rounded-lg hover:bg-canvas ${m.ativo ? 'text-ink-soft hover:text-status-cancelado' : 'text-status-entregue'}`}
                      onClick={() => alternarStatus(m)}
                    >
                      {m.ativo ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                    </button>
                    <IconAction title="Excluir" danger onClick={() => setConfirmarExcluir(m)}>
                      <Trash2 size={15} />
                    </IconAction>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-border">
                  <div>
                    <p className="text-[10px] text-ink-soft uppercase">Atendimentos</p>
                    <p className="font-mono text-sm text-ink font-semibold">{stats.totalAtendimentos}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-soft uppercase">Entregues (mês)</p>
                    <p className="font-mono text-sm text-ink font-semibold">{stats.entreguesNoMes}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-[10px] text-ink-soft uppercase">Faturamento (mês)</p>
                    <p className="font-mono text-sm text-ink font-semibold">{formatMoney(stats.faturamentoMes)}</p>
                  </div>
                </div>

                {m.comissao_percentual > 0 && (
                  <div className="flex justify-between items-center bg-torque-light rounded-lg px-3 py-2">
                    <span className="text-xs text-torque-dark font-medium">Comissão estimada ({m.comissao_percentual}%)</span>
                    <span className="font-mono text-sm text-torque-dark font-semibold">{formatMoney(comissaoEstimada)}</span>
                  </div>
                )}
              </div>
            )
          })}
          {mecanicos.length === 0 && (
            <div className="col-span-2">
              <EmptyState icon={UserCog} title="Nenhum mecânico cadastrado ainda" />
            </div>
          )}
        </div>
      )}

      <ModalMecanico open={modalNovo} onClose={() => setModalNovo(false)} onSaved={carregar} />
      {modalEditar && (
        <ModalMecanico
          open
          mecanico={modalEditar}
          onClose={() => setModalEditar(null)}
          onSaved={carregar}
        />
      )}

      <ConfirmDialog
        open={!!confirmarDesativar}
        title="Desativar mecânico"
        message={`Tem certeza que deseja desativar ${confirmarDesativar?.nome}? Ele deixará de aparecer nas opções ao criar novas OS.`}
        confirmLabel="Desativar"
        variant="danger"
        onConfirm={confirmarDesativacao}
        onCancel={() => setConfirmarDesativar(null)}
      />
      <ConfirmDialog
        open={!!confirmarExcluir}
        title="Excluir mecânico"
        message={`Tem certeza que deseja excluir ${confirmarExcluir?.nome}? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={excluirMecanico}
        onCancel={() => setConfirmarExcluir(null)}
        loading={excluindo}
      />
    </div>
  )
}

function ModalMecanico({
  open,
  mecanico,
  onClose,
  onSaved,
}: {
  open: boolean
  mecanico?: Mecanico
  onClose: () => void
  onSaved: () => void
}) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    nome: mecanico?.nome || '',
    telefone: mecanico?.telefone || '',
    especialidade: mecanico?.especialidade || '',
    comissao_percentual: mecanico ? String(mecanico.comissao_percentual) : '0',
  })
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!form.nome) return
    setSalvando(true)
    try {
      await upsertMecanico({
        id: mecanico?.id,
        nome: form.nome,
        telefone: form.telefone || null,
        especialidade: form.especialidade || null,
        comissao_percentual: Number(form.comissao_percentual) || 0,
      })
      showToast(mecanico ? 'Mecânico atualizado.' : 'Mecânico cadastrado.', 'success')
      onClose()
      onSaved()
    } catch {
      showToast('Não foi possível salvar.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title={mecanico ? `Editar · ${mecanico.nome}` : 'Novo mecânico'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Nome *</label>
          <input className="input-field" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div>
          <label className="label-field">Telefone</label>
          <input className="input-field" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
        </div>
        <div>
          <label className="label-field">Especialidade</label>
          <input
            className="input-field"
            value={form.especialidade}
            onChange={(e) => setForm({ ...form, especialidade: e.target.value })}
            placeholder="ex: Injeção eletrônica diesel"
          />
        </div>
        <div>
          <label className="label-field">Comissão (%)</label>
          <input
            className="input-field"
            value={form.comissao_percentual}
            onChange={(e) => setForm({ ...form, comissao_percentual: e.target.value })}
            placeholder="ex: 10"
          />
          <p className="text-[11px] text-ink-soft mt-1">
            Calculada sobre o faturamento das OS entregues atribuídas a esse mecânico. Deixe 0 se não usar comissão.
          </p>
        </div>
        <Button fullWidth onClick={salvar} loading={salvando}>
          {mecanico ? 'Salvar alterações' : 'Cadastrar mecânico'}
        </Button>
      </div>
    </Modal>
  )
}
