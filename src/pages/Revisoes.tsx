import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Settings, MessageCircle, Wrench } from 'lucide-react'
import { listVeiculos, listClientes, upsertVeiculo } from '@/lib/db'
import { obterTemplatePorTipo, registrarEnvioWhatsapp } from '@/lib/whatsappNfe'
import { preencherTemplate, abrirWhatsApp } from '@/lib/whatsapp'
import { calcularStatusRevisao, type StatusRevisao } from '@/lib/revisoes'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Placa } from '@/components/ui/Placa'
import { SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/contexts/ToastContext'
import type { Veiculo, Cliente } from '@/types/database'

const calcularStatus = calcularStatusRevisao

const STATUS_LABEL: Record<StatusRevisao, string> = {
  sem_config: 'Sem configuração',
  em_dia: 'Em dia',
  proxima: 'Próxima',
  atrasada: 'Atrasada',
}
const STATUS_COR: Record<StatusRevisao, string> = {
  sem_config: 'bg-gray-100 text-gray-500',
  em_dia: 'bg-green-50 text-green-700',
  proxima: 'bg-amber-50 text-amber-700',
  atrasada: 'bg-red-50 text-red-700',
}

export default function Revisoes() {
  const { showToast } = useToast()
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [modalConfig, setModalConfig] = useState<Veiculo | null>(null)
  const [filtro, setFiltro] = useState<StatusRevisao | 'todas'>('todas')

  async function carregar() {
    setLoading(true)
    const [v, c] = await Promise.all([listVeiculos(), listClientes()])
    setVeiculos(v)
    setClientes(c)
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const veiculosComStatus = veiculos.map((v) => ({ veiculo: v, status: calcularStatus(v) }))
  const filtrados = filtro === 'todas' ? veiculosComStatus : veiculosComStatus.filter((v) => v.status === filtro)
  const ordenados = [...filtrados].sort((a, b) => {
    const ordem = { atrasada: 0, proxima: 1, em_dia: 2, sem_config: 3 }
    return ordem[a.status] - ordem[b.status]
  })

  async function enviarLembrete(veiculo: Veiculo) {
    const cliente = clientes.find((c) => c.id === veiculo.cliente_id)
    const telefone = cliente?.whatsapp || cliente?.telefone
    if (!telefone) {
      showToast('Este cliente não tem telefone cadastrado.', 'error')
      return
    }
    try {
      const template = await obterTemplatePorTipo('lembrete_revisao')
      const mensagem = preencherTemplate(template, {
        cliente: cliente?.nome || '',
        veiculo: `${veiculo.marca || ''} ${veiculo.modelo}`.trim(),
      })
      abrirWhatsApp(telefone, mensagem)
      await registrarEnvioWhatsapp({ cliente_id: veiculo.cliente_id, tipo: 'lembrete_revisao', telefone, mensagem })
      showToast('WhatsApp aberto com o lembrete pronto.', 'success')
    } catch {
      showToast('Não foi possível preparar a mensagem.', 'error')
    }
  }

  const contagens = {
    atrasada: veiculosComStatus.filter((v) => v.status === 'atrasada').length,
    proxima: veiculosComStatus.filter((v) => v.status === 'proxima').length,
    em_dia: veiculosComStatus.filter((v) => v.status === 'em_dia').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Revisões</h1>
        <p className="text-ink-soft text-sm mt-1">Manutenção preventiva recorrente por veículo</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-ink-soft font-medium">Atrasadas</p>
          <p className="font-display text-xl font-semibold text-status-cancelado mt-1">{contagens.atrasada}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-soft font-medium">Próximas</p>
          <p className="font-display text-xl font-semibold text-status-execucao mt-1">{contagens.proxima}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-soft font-medium">Em dia</p>
          <p className="font-display text-xl font-semibold text-status-entregue mt-1">{contagens.em_dia}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['todas', 'atrasada', 'proxima', 'em_dia', 'sem_config'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filtro === f ? 'bg-graphite text-white border-graphite' : 'bg-white text-ink-soft border-border hover:border-ink-soft'
            }`}
          >
            {f === 'todas' ? 'Todas' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList rows={6} />
      ) : (
        <div className="card divide-y divide-border">
          {ordenados.map(({ veiculo, status }) => {
            const cliente = clientes.find((c) => c.id === veiculo.cliente_id)
            return (
              <div key={veiculo.id} className="flex items-center gap-3 p-4 text-sm flex-wrap">
                <Placa placa={veiculo.placa} />
                <div className="min-w-0 flex-1">
                  <p className="text-ink font-medium">{veiculo.marca} {veiculo.modelo}</p>
                  <p className="text-xs text-ink-soft">
                    {cliente?.nome} · {veiculo.km_atual.toLocaleString('pt-BR')} km
                    {veiculo.intervalo_revisao_km && ` · revisão a cada ${veiculo.intervalo_revisao_km.toLocaleString('pt-BR')} km`}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${STATUS_COR[status]}`}>
                  {status === 'atrasada' && <AlertTriangle size={11} />}
                  {status === 'em_dia' && <CheckCircle2 size={11} />}
                  {STATUS_LABEL[status]}
                </span>
                {(status === 'atrasada' || status === 'proxima') && (
                  <button onClick={() => enviarLembrete(veiculo)} className="text-status-entregue hover:opacity-70" title="Enviar lembrete via WhatsApp">
                    <MessageCircle size={16} />
                  </button>
                )}
                <button onClick={() => setModalConfig(veiculo)} className="text-ink-soft hover:text-torque" title="Configurar intervalo de revisão">
                  <Settings size={16} />
                </button>
              </div>
            )
          })}
          {ordenados.length === 0 && <EmptyState icon={Wrench} title="Nenhum veículo encontrado para esse filtro" />}
        </div>
      )}

      {modalConfig && (
        <ModalConfigurarRevisao veiculo={modalConfig} onClose={() => setModalConfig(null)} onSaved={carregar} />
      )}
    </div>
  )
}

function ModalConfigurarRevisao({ veiculo, onClose, onSaved }: { veiculo: Veiculo; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast()
  const [intervaloKm, setIntervaloKm] = useState(veiculo.intervalo_revisao_km ? String(veiculo.intervalo_revisao_km) : '')
  const [intervaloMeses, setIntervaloMeses] = useState(veiculo.intervalo_revisao_meses ? String(veiculo.intervalo_revisao_meses) : '')
  const [ultimaRevisaoKm, setUltimaRevisaoKm] = useState(veiculo.ultima_revisao_km ? String(veiculo.ultima_revisao_km) : '')
  const [ultimaRevisaoData, setUltimaRevisaoData] = useState(veiculo.ultima_revisao_data || '')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      await upsertVeiculo({
        id: veiculo.id,
        intervalo_revisao_km: intervaloKm ? Number(intervaloKm) : null,
        intervalo_revisao_meses: intervaloMeses ? Number(intervaloMeses) : null,
        ultima_revisao_km: ultimaRevisaoKm ? Number(ultimaRevisaoKm) : null,
        ultima_revisao_data: ultimaRevisaoData || null,
      })
      showToast('Configuração de revisão salva.', 'success')
      onClose()
      onSaved()
    } catch {
      showToast('Não foi possível salvar.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open title={`Configurar revisão · ${veiculo.placa}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Revisar a cada (km)</label>
            <input className="input-field" value={intervaloKm} onChange={(e) => setIntervaloKm(e.target.value)} placeholder="ex: 10000" />
          </div>
          <div>
            <label className="label-field">Revisar a cada (meses)</label>
            <input className="input-field" value={intervaloMeses} onChange={(e) => setIntervaloMeses(e.target.value)} placeholder="ex: 6" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">KM da última revisão</label>
            <input className="input-field" value={ultimaRevisaoKm} onChange={(e) => setUltimaRevisaoKm(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Data da última revisão</label>
            <input type="date" className="input-field" value={ultimaRevisaoData} onChange={(e) => setUltimaRevisaoData(e.target.value)} />
          </div>
        </div>
        <p className="text-[11px] text-ink-soft">
          Esses campos são atualizados automaticamente toda vez que uma OS desse veículo é entregue.
        </p>
        <Button fullWidth onClick={salvar} loading={salvando}>
          Salvar configuração
        </Button>
      </div>
    </Modal>
  )
}
