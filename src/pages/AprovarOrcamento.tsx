import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { getOrdemServicoPorToken, aprovarOrcamentoPeloCliente } from '@/lib/db'
import { Button } from '@/components/ui/Button'
import { Placa } from '@/components/ui/Placa'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { OrdemServico } from '@/types/database'
import { formatMoney } from '@/lib/format'

export default function AprovarOrcamento() {
  const { token } = useParams<{ token: string }>()
  const [os, setOs] = useState<OrdemServico | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [aprovando, setAprovando] = useState(false)
  const [aprovado, setAprovado] = useState(false)

  useEffect(() => {
    if (!token) return
    getOrdemServicoPorToken(token)
      .then((resultado) => {
        if (!resultado) setErro('Orçamento não encontrado. Verifique o link recebido.')
        else setOs(resultado)
      })
      .catch(() => setErro('Não foi possível carregar este orçamento.'))
      .finally(() => setLoading(false))
  }, [token])

  async function confirmar() {
    if (!token) return
    setAprovando(true)
    try {
      await aprovarOrcamentoPeloCliente(token)
      setAprovado(true)
    } catch (e: any) {
      setErro(e.message || 'Não foi possível aprovar o orçamento.')
    } finally {
      setAprovando(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md card p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-ink-soft" />
          </div>
        ) : erro ? (
          <div className="text-center py-6 space-y-2">
            <XCircle size={32} className="text-status-cancelado mx-auto" />
            <p className="text-sm text-ink-soft">{erro}</p>
          </div>
        ) : aprovado ? (
          <div className="text-center py-6 space-y-2">
            <CheckCircle2 size={32} className="text-status-entregue mx-auto" />
            <p className="font-display font-semibold text-ink">Orçamento aprovado!</p>
            <p className="text-sm text-ink-soft">Já avisamos a oficina. Em breve o serviço será iniciado.</p>
          </div>
        ) : os ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-semibold text-ink">OS #{os.numero}</h1>
                <p className="text-sm text-ink-soft mt-1">
                  {os.veiculo && <Placa placa={os.veiculo.placa} />} {os.veiculo?.marca} {os.veiculo?.modelo}
                </p>
              </div>
              <StatusBadge status={os.status} />
            </div>

            {os.defeito_relatado && (
              <div>
                <p className="text-xs font-semibold text-ink-soft uppercase">Defeito relatado</p>
                <p className="text-sm text-ink mt-1">{os.defeito_relatado}</p>
              </div>
            )}

            <div className="divide-y divide-border border-t border-border">
              {(os.itens || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-ink">{item.descricao}</span>
                  <span className="font-mono text-ink-soft">{formatMoney(item.valor_total)}</span>
                </div>
              ))}
              {(!os.itens || os.itens.length === 0) && (
                <p className="text-sm text-ink-soft py-2">Itens ainda não lançados.</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="font-display font-semibold text-ink">Total</span>
              <span className="font-mono font-semibold text-lg text-ink">{formatMoney(os.valor_total)}</span>
            </div>

            {os.status === 'orcamento' ? (
              <Button fullWidth icon={<CheckCircle2 size={16} />} onClick={confirmar} loading={aprovando}>
                Aprovar orçamento
              </Button>
            ) : (
              <div className="bg-canvas rounded-lg p-3 text-center">
                <p className="text-sm text-ink font-medium">
                  {os.status === 'entregue'
                    ? 'Serviço entregue! Obrigado pela confiança.'
                    : os.status === 'cancelado'
                    ? 'Esta OS foi cancelada.'
                    : 'Seu veículo está sendo cuidado por nossa equipe.'}
                </p>
                {os.garantia_dias && os.data_entrega && (
                  <p className="text-xs text-ink-soft mt-1">
                    Garantia até{' '}
                    {new Date(new Date(os.data_entrega).getTime() + os.garantia_dias * 86400000).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
