import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, MinusCircle, Camera } from 'lucide-react'
import {
  garantirChecklistEntrada,
  getChecklistEntrada,
  listChecklistEntradaItens,
  atualizarItemChecklistEntrada,
  salvarObservacoesGeraisChecklist,
  salvarAssinaturaChecklist,
} from '@/lib/checklistEntrada'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SignaturePad } from '@/components/ui/SignaturePad'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useToast } from '@/contexts/ToastContext'
import type { ChecklistEntrada, ChecklistEntradaItem, StatusItemChecklistEntrada } from '@/types/database'

interface ModalChecklistEntradaProps {
  open: boolean
  osId: string
  onClose: () => void
}

export function ModalChecklistEntrada({ open, osId, onClose }: ModalChecklistEntradaProps) {
  const { showToast } = useToast()
  const [cabecalho, setCabecalho] = useState<ChecklistEntrada | null>(null)
  const [itens, setItens] = useState<ChecklistEntradaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [observacoesGerais, setObservacoesGerais] = useState('')
  const [refazendoAssinatura, setRefazendoAssinatura] = useState(false)
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false)
  const [itemExpandido, setItemExpandido] = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    await garantirChecklistEntrada(osId)
    const [c, i] = await Promise.all([getChecklistEntrada(osId), listChecklistEntradaItens(osId)])
    setCabecalho(c)
    setItens(i)
    setObservacoesGerais(c?.observacoes_gerais || '')
    setLoading(false)
  }

  useEffect(() => {
    if (open) carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, osId])

  async function marcarStatus(item: ChecklistEntradaItem, status: StatusItemChecklistEntrada) {
    await atualizarItemChecklistEntrada(item.id, { status })
    setItens((atual) => atual.map((i) => (i.id === item.id ? { ...i, status } : i)))
    if (status === 'nao_ok') setItemExpandido(item.id)
  }

  async function salvarDetalheItem(itemId: string, campo: 'observacao' | 'foto_url', valor: string) {
    await atualizarItemChecklistEntrada(itemId, { [campo]: valor })
    setItens((atual) => atual.map((i) => (i.id === itemId ? { ...i, [campo]: valor } : i)))
  }

  async function salvarObservacoesGerais() {
    await salvarObservacoesGeraisChecklist(osId, observacoesGerais)
    showToast('Observações salvas.', 'success')
  }

  async function salvarAssinatura(dataUrl: string) {
    setSalvandoAssinatura(true)
    try {
      await salvarAssinaturaChecklist(osId, dataUrl)
      showToast('Vistoria concluída e assinada.', 'success')
      setRefazendoAssinatura(false)
      carregar()
    } catch {
      showToast('Não foi possível salvar a assinatura.', 'error')
    } finally {
      setSalvandoAssinatura(false)
    }
  }

  const verificados = itens.filter((i) => i.status !== null).length

  return (
    <Modal open={open} title="Checklist de Entrada · Vistoria do Veículo" onClose={onClose} maxWidth="max-w-2xl">
      {loading ? (
        <p className="text-ink-soft text-sm">Carregando...</p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-ink-soft">{verificados} de {itens.length} itens verificados</p>

          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {itens.map((item) => (
              <div key={item.id} className="border border-border rounded-lg p-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink flex-1">{item.item}</span>
                  <BotaoStatus
                    ativo={item.status === 'ok'}
                    cor="text-status-entregue"
                    icone={<CheckCircle2 size={16} />}
                    onClick={() => marcarStatus(item, 'ok')}
                    titulo="OK"
                  />
                  <BotaoStatus
                    ativo={item.status === 'nao_ok'}
                    cor="text-status-cancelado"
                    icone={<XCircle size={16} />}
                    onClick={() => marcarStatus(item, 'nao_ok')}
                    titulo="Não OK"
                  />
                  <BotaoStatus
                    ativo={item.status === 'na'}
                    cor="text-ink-soft"
                    icone={<MinusCircle size={16} />}
                    onClick={() => marcarStatus(item, 'na')}
                    titulo="N/A"
                  />
                </div>
                {(item.status === 'nao_ok' || itemExpandido === item.id) && (
                  <div className="mt-2 pt-2 border-t border-border space-y-2">
                    <input
                      className="input-field text-xs"
                      placeholder="Descreva o problema (ex: risco na porta dianteira)"
                      defaultValue={item.observacao || ''}
                      onBlur={(e) => salvarDetalheItem(item.id, 'observacao', e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <Camera size={14} className="text-ink-soft shrink-0" />
                      <input
                        className="input-field text-xs"
                        placeholder="URL da foto (opcional)"
                        defaultValue={item.foto_url || ''}
                        onBlur={(e) => salvarDetalheItem(item.id, 'foto_url', e.target.value)}
                      />
                      <ImageUpload
                        pasta="checklist-entrada"
                        compacto
                        label="Enviar"
                        onUploaded={(url) => salvarDetalheItem(item.id, 'foto_url', url)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="label-field">Observações gerais da vistoria</label>
            <textarea
              className="input-field"
              rows={2}
              value={observacoesGerais}
              onChange={(e) => setObservacoesGerais(e.target.value)}
              onBlur={salvarObservacoesGerais}
            />
          </div>

          <div className="border-t border-border pt-3">
            <p className="label-field mb-2">Assinatura do cliente (vistoria)</p>
            {cabecalho?.assinatura_url && !refazendoAssinatura ? (
              <div className="space-y-2">
                <img src={cabecalho.assinatura_url} className="border border-border rounded-lg bg-white h-24 object-contain" />
                <Button variant="secondary" size="sm" onClick={() => setRefazendoAssinatura(true)}>
                  Refazer assinatura
                </Button>
              </div>
            ) : (
              <SignaturePad onSave={salvarAssinatura} saving={salvandoAssinatura} />
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

function BotaoStatus({
  ativo,
  cor,
  icone,
  onClick,
  titulo,
}: {
  ativo: boolean
  cor: string
  icone: React.ReactNode
  onClick: () => void
  titulo: string
}) {
  return (
    <button
      title={titulo}
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors ${ativo ? `${cor} bg-canvas` : 'text-ink-soft/40 hover:text-ink-soft'}`}
    >
      {icone}
    </button>
  )
}
