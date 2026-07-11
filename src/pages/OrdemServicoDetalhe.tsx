import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Image as ImageIcon, Video, X, CheckSquare, Square, History } from 'lucide-react'
import {
  getOrdemServico,
  adicionarItemOS,
  removerItemOS,
  mudarStatusOS,
  listPecas,
  listAnexosOS,
  adicionarAnexoOS,
  removerAnexoOS,
  listChecklistOS,
  adicionarChecklistItem,
  alternarChecklistItem,
  removerChecklistItem,
  listHistoricoOS,
  atualizarValoresOS,
  atualizarAssinaturaOS,
} from '@/lib/db'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Placa } from '@/components/ui/Placa'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SkeletonList } from '@/components/ui/Skeleton'
import { SignaturePad } from '@/components/ui/SignaturePad'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { obterTemplatePorTipo, registrarEnvioWhatsapp, getNotaFiscalConfig } from '@/lib/whatsappNfe'
import { emitirNFSe, consultarStatusNota, listNotasFiscaisPorOS, notaFiscalPronta, type NotaFiscalRegistro } from '@/lib/notaFiscal'
import { preencherTemplate, abrirWhatsApp } from '@/lib/whatsapp'
import { MessageCircle, FileText, RefreshCw, Link2, ClipboardCheck, Printer } from 'lucide-react'
import { ModalChecklistEntrada } from '@/components/ModalChecklistEntrada'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { ComprovanteImpressaoOS } from '@/components/ComprovanteImpressaoOS'
import { STATUS_TRANSICOES, STATUS_OS_LABELS } from '@/types/database'
import type { OrdemServico, Peca, OSAnexo, OSChecklistItem, OSHistorico, StatusOS } from '@/types/database'
import { formatMoney, formatDateTime } from '@/lib/format'

function tipoTemplatePorStatus(status: string): 'orcamento' | 'os_aberta' | 'veiculo_pronto' | 'os_finalizada' | null {
  if (status === 'orcamento') return 'orcamento'
  if (status === 'aprovado' || status === 'em_execucao') return 'os_aberta'
  if (status === 'concluido') return 'veiculo_pronto'
  if (status === 'entregue') return 'os_finalizada'
  return null
}

function ehVideo(url: string) {
  return /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url)
}

export default function OrdemServicoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { usuario } = useAuth()
  const [os, setOs] = useState<OrdemServico | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalItem, setModalItem] = useState(false)
  const [statusAlvo, setStatusAlvo] = useState<StatusOS | null>(null)
  const [itemParaRemover, setItemParaRemover] = useState<string | null>(null)
  const [modalChecklistEntrada, setModalChecklistEntrada] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState(false)
  const [enviandoLink, setEnviandoLink] = useState(false)

  const carregar = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setOs(await getOrdemServico(id))
    setLoading(false)
  }, [id])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function confirmarMudancaStatus() {
    if (!os || !statusAlvo) return
    setProcessando(true)
    try {
      await mudarStatusOS(os.id, statusAlvo, usuario?.nome)
      showToast(`Status atualizado para "${STATUS_OS_LABELS[statusAlvo]}"`, 'success')
      setStatusAlvo(null)
      carregar()
    } catch {
      showToast('Não foi possível atualizar o status.', 'error')
    } finally {
      setProcessando(false)
    }
  }

  async function removerItem(itemId: string) {
    if (!os) return
    await removerItemOS(itemId, os.id)
    showToast('Item removido.', 'info')
    setItemParaRemover(null)
    carregar()
  }

  async function enviarLinkAprovacao() {
    if (!os) return
    const telefone = os.cliente?.whatsapp || os.cliente?.telefone
    if (!telefone) {
      showToast('Este cliente não tem telefone cadastrado.', 'error')
      return
    }
    setEnviandoLink(true)
    try {
      const link = `${window.location.origin}/aprovar/${os.token_aprovacao}`
      const template = await obterTemplatePorTipo('orcamento')
      const mensagem =
        preencherTemplate(template, {
          cliente: os.cliente?.nome || '',
          numero_os: String(os.numero),
          veiculo: `${os.veiculo?.marca || ''} ${os.veiculo?.modelo || ''}`.trim(),
          valor: formatMoney(os.valor_total),
        }) + `\n\nAprove aqui: ${link}`
      abrirWhatsApp(telefone, mensagem)
      await registrarEnvioWhatsapp({ cliente_id: os.cliente_id, os_id: os.id, tipo: 'orcamento', telefone, mensagem })
      showToast('WhatsApp aberto com o link de aprovação.', 'success')
    } catch {
      showToast('Não foi possível preparar o link.', 'error')
    } finally {
      setEnviandoLink(false)
    }
  }

  async function enviarWhatsapp() {
    if (!os) return
    const tipo = tipoTemplatePorStatus(os.status)
    if (!tipo) return
    const telefone = os.cliente?.whatsapp || os.cliente?.telefone
    if (!telefone) {
      showToast('Este cliente não tem telefone cadastrado.', 'error')
      return
    }
    setEnviandoWhatsapp(true)
    try {
      const template = await obterTemplatePorTipo(tipo)
      const mensagem = preencherTemplate(template, {
        cliente: os.cliente?.nome || '',
        numero_os: String(os.numero),
        veiculo: `${os.veiculo?.marca || ''} ${os.veiculo?.modelo || ''}`.trim(),
        valor: formatMoney(os.valor_total),
      })
      abrirWhatsApp(telefone, mensagem)
      await registrarEnvioWhatsapp({ cliente_id: os.cliente_id, os_id: os.id, tipo, telefone, mensagem })
      showToast('WhatsApp aberto com a mensagem pronta.', 'success')
    } catch {
      showToast('Não foi possível preparar a mensagem.', 'error')
    } finally {
      setEnviandoWhatsapp(false)
    }
  }

  if (loading) return <SkeletonList rows={4} />
  if (!os) return <p className="text-ink-soft text-sm">OS não encontrada.</p>

  const podeEditar = !['entregue', 'cancelado'].includes(os.status)
  const transicoesPermitidas = STATUS_TRANSICOES[os.status] || []
  const subtotalItens = (os.itens || []).reduce((s, i) => s + i.valor_total, 0)
  const saldo = os.valor_total - (os.valor_pago || 0)

  return (
    <>
    <div className="space-y-6 max-w-3xl animate-fade-in print:hidden">
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
          {os.criado_por && <p className="text-xs text-ink-soft mt-1">Aberta por {os.criado_por}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>
            Imprimir OS
          </Button>
          {os.status === 'orcamento' && (
            <Button variant="secondary" size="sm" icon={<Link2 size={14} />} onClick={enviarLinkAprovacao} loading={enviandoLink}>
              Enviar link de aprovação
            </Button>
          )}
          {tipoTemplatePorStatus(os.status) && (
            <Button variant="secondary" size="sm" icon={<MessageCircle size={14} />} onClick={enviarWhatsapp} loading={enviandoWhatsapp}>
              Enviar WhatsApp
            </Button>
          )}
          {podeEditar &&
            transicoesPermitidas.map((s) => (
              <Button key={s} variant={s === 'cancelado' ? 'danger' : 'primary'} size="sm" onClick={() => setStatusAlvo(s)}>
                {STATUS_OS_LABELS[s]}
              </Button>
            ))}
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="font-display font-semibold text-ink text-sm">Diagnóstico</h2>
        <p className="text-sm text-ink-soft">{os.defeito_relatado || 'Nenhum defeito relatado registrado.'}</p>
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
              <span className="flex-1 text-ink">
                {item.descricao}
                {item.tempo_minutos ? <span className="text-ink-soft text-xs"> · {item.tempo_minutos} min</span> : null}
              </span>
              <span className="text-ink-soft font-mono text-xs">
                {item.quantidade} × {formatMoney(item.valor_unitario)}
              </span>
              <span className="font-mono text-ink w-24 text-right">{formatMoney(item.valor_total)}</span>
              {podeEditar && (
                <button onClick={() => setItemParaRemover(item.id)} className="text-ink-soft hover:text-status-cancelado">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {(!os.itens || os.itens.length === 0) && (
            <p className="text-ink-soft text-sm py-4 text-center">Nenhum item adicionado ainda.</p>
          )}
        </div>
      </div>

      <SecaoValores os={os} subtotalItens={subtotalItens} saldo={saldo} podeEditar={podeEditar} onSaved={carregar} />

      <div className="card p-5 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink text-sm">Vistoria de entrada</h2>
          <Button variant="secondary" size="sm" icon={<ClipboardCheck size={14} />} onClick={() => setModalChecklistEntrada(true)}>
            Abrir checklist de entrada
          </Button>
        </div>
        <p className="text-xs text-ink-soft">
          Vistoria estruturada do veículo (pintura, faróis, pneus, riscos, amassados...) com assinatura do cliente.
        </p>
      </div>

      <SecaoChecklist osId={os.id} podeEditar={podeEditar} />

      <SecaoAnexos osId={os.id} podeEditar={podeEditar} />

      <SecaoAssinatura os={os} podeEditar={podeEditar} onSaved={carregar} />

      <SecaoNotaFiscal os={os} />

      <SecaoHistorico osId={os.id} />

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

      <ModalChecklistEntrada open={modalChecklistEntrada} osId={os.id} onClose={() => setModalChecklistEntrada(false)} />

      <ConfirmDialog
        open={!!statusAlvo}
        title="Mudar status da OS"
        message={statusAlvo ? `Mudar status para "${STATUS_OS_LABELS[statusAlvo]}"? Essa ação pode afetar estoque e financeiro.` : ''}
        confirmLabel="Confirmar"
        variant={statusAlvo === 'cancelado' ? 'danger' : 'primary'}
        onConfirm={confirmarMudancaStatus}
        onCancel={() => setStatusAlvo(null)}
        loading={processando}
      />

      <ConfirmDialog
        open={!!itemParaRemover}
        title="Remover item"
        message="Tem certeza que deseja remover este item da OS? O valor total será recalculado."
        confirmLabel="Remover"
        variant="danger"
        onConfirm={() => itemParaRemover && removerItem(itemParaRemover)}
        onCancel={() => setItemParaRemover(null)}
      />
    </div>
    <ComprovanteImpressaoOS os={os} />
    </>
  )
}

function SecaoValores({
  os,
  subtotalItens,
  saldo,
  podeEditar,
  onSaved,
}: {
  os: OrdemServico
  subtotalItens: number
  saldo: number
  podeEditar: boolean
  onSaved: () => void
}) {
  const { showToast } = useToast()
  const [desconto, setDesconto] = useState(String(os.valor_desconto || 0))
  const [frete, setFrete] = useState(String(os.valor_frete || 0))
  const [pago, setPago] = useState(String(os.valor_pago || 0))
  const [garantia, setGarantia] = useState(os.garantia_dias ? String(os.garantia_dias) : '')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      await atualizarValoresOS(os.id, {
        valor_desconto: Number(desconto) || 0,
        valor_frete: Number(frete) || 0,
        valor_pago: Number(pago) || 0,
        garantia_dias: garantia ? Number(garantia) : null,
      })
      showToast('Valores atualizados.', 'success')
      onSaved()
    } catch {
      showToast('Não foi possível atualizar os valores.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const garantiaValidaAte =
    os.garantia_dias && os.data_entrega
      ? new Date(new Date(os.data_entrega).getTime() + os.garantia_dias * 86400000).toLocaleDateString('pt-BR')
      : null

  return (
    <div className="card p-5 space-y-4">
      <h2 className="font-display font-semibold text-ink text-sm">Valores e garantia</h2>

      <div className="flex justify-between text-sm text-ink-soft">
        <span>Subtotal dos itens</span>
        <span className="font-mono">{formatMoney(subtotalItens)}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="label-field">Desconto</label>
          <input className="input-field" value={desconto} onChange={(e) => setDesconto(e.target.value)} disabled={!podeEditar} />
        </div>
        <div>
          <label className="label-field">Frete</label>
          <input className="input-field" value={frete} onChange={(e) => setFrete(e.target.value)} disabled={!podeEditar} />
        </div>
        <div>
          <label className="label-field">Valor pago</label>
          <input className="input-field" value={pago} onChange={(e) => setPago(e.target.value)} />
        </div>
        <div>
          <label className="label-field">Garantia (dias)</label>
          <input className="input-field" value={garantia} onChange={(e) => setGarantia(e.target.value)} placeholder="ex: 90" />
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-border">
        <span className="font-display font-semibold text-ink">Total</span>
        <span className="font-mono font-semibold text-lg text-ink">{formatMoney(os.valor_total)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-ink-soft">Saldo devedor</span>
        <span className={`font-mono font-medium ${saldo > 0 ? 'text-status-cancelado' : 'text-status-entregue'}`}>
          {formatMoney(saldo)}
        </span>
      </div>
      {garantiaValidaAte && <p className="text-xs text-ink-soft">Garantia válida até {garantiaValidaAte}</p>}

      <Button size="sm" onClick={salvar} loading={salvando}>
        Salvar valores
      </Button>
    </div>
  )
}

function SecaoChecklist({ osId, podeEditar }: { osId: string; podeEditar: boolean }) {
  const [itens, setItens] = useState<OSChecklistItem[]>([])
  const [novo, setNovo] = useState('')
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    setItens(await listChecklistOS(osId))
    setLoading(false)
  }, [osId])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function adicionar() {
    if (!novo.trim()) return
    await adicionarChecklistItem(osId, novo.trim())
    setNovo('')
    carregar()
  }

  async function alternar(item: OSChecklistItem) {
    await alternarChecklistItem(item.id, !item.concluido)
    carregar()
  }

  async function remover(itemId: string) {
    await removerChecklistItem(itemId)
    carregar()
  }

  return (
    <div className="card p-5 space-y-3">
      <h2 className="font-display font-semibold text-ink text-sm">Checklist</h2>
      {loading ? (
        <p className="text-ink-soft text-sm">Carregando...</p>
      ) : (
        <div className="space-y-1.5">
          {itens.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm group">
              <button onClick={() => alternar(item)} className="text-ink-soft hover:text-torque shrink-0">
                {item.concluido ? <CheckSquare size={16} className="text-status-entregue" /> : <Square size={16} />}
              </button>
              <span className={`flex-1 ${item.concluido ? 'text-ink-soft line-through' : 'text-ink'}`}>{item.descricao}</span>
              <button
                onClick={() => remover(item.id)}
                className="text-ink-soft hover:text-status-cancelado opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={13} />
              </button>
            </div>
          ))}
          {itens.length === 0 && <p className="text-ink-soft text-sm py-2">Nenhum item de checklist ainda.</p>}
        </div>
      )}
      {podeEditar && (
        <div className="flex gap-2 pt-1">
          <input
            className="input-field"
            placeholder="ex: Verificar nível de óleo"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && adicionar()}
          />
          <Button size="sm" onClick={adicionar}>
            Adicionar
          </Button>
        </div>
      )}
    </div>
  )
}

function SecaoAnexos({ osId, podeEditar }: { osId: string; podeEditar: boolean }) {
  const { showToast } = useToast()
  const [anexos, setAnexos] = useState<OSAnexo[]>([])
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    setAnexos(await listAnexosOS(osId))
    setLoading(false)
  }, [osId])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function adicionar() {
    if (!url.trim()) return
    setSalvando(true)
    try {
      await adicionarAnexoOS(osId, url.trim(), ehVideo(url) ? 'video' : 'foto')
      setUrl('')
      carregar()
    } catch {
      showToast('Não foi possível adicionar o anexo.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  async function adicionarPorUpload(fotoUrl: string) {
    setSalvando(true)
    try {
      await adicionarAnexoOS(osId, fotoUrl, 'foto')
      carregar()
    } catch {
      showToast('Não foi possível salvar a foto enviada.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(anexoId: string) {
    await removerAnexoOS(anexoId)
    carregar()
  }

  return (
    <div className="card p-5 space-y-3">
      <h2 className="font-display font-semibold text-ink text-sm">Fotos e vídeos</h2>
      {loading ? (
        <p className="text-ink-soft text-sm">Carregando...</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {anexos.map((a) => (
            <div key={a.id} className="relative group">
              {a.tipo === 'video' ? (
                <div className="w-full h-20 rounded-lg border border-border bg-graphite flex items-center justify-center">
                  <Video size={20} className="text-white/70" />
                </div>
              ) : (
                <img src={a.url} className="w-full h-20 object-cover rounded-lg border border-border" />
              )}
              {podeEditar && (
                <button
                  onClick={() => remover(a.id)}
                  className="absolute top-1 right-1 bg-graphite/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          {anexos.length === 0 && (
            <p className="text-ink-soft text-sm col-span-full py-2">Nenhum anexo adicionado ainda.</p>
          )}
        </div>
      )}
      {podeEditar && (
        <div className="space-y-2 pt-1">
          <ImageUpload pasta="ordens-servico" onUploaded={adicionarPorUpload} label="Tirar foto ou escolher arquivo" compacto />
          <div className="flex gap-2">
            <input
              className="input-field"
              placeholder="ou cole a URL de uma foto/vídeo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button size="sm" icon={<ImageIcon size={14} />} onClick={adicionar} loading={salvando}>
              Adicionar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function SecaoAssinatura({ os, podeEditar, onSaved }: { os: OrdemServico; podeEditar: boolean; onSaved: () => void }) {
  const { showToast } = useToast()
  const [salvando, setSalvando] = useState(false)
  const [refazendo, setRefazendo] = useState(false)

  async function salvar(dataUrl: string) {
    setSalvando(true)
    try {
      await atualizarAssinaturaOS(os.id, dataUrl)
      showToast('Assinatura salva.', 'success')
      setRefazendo(false)
      onSaved()
    } catch {
      showToast('Não foi possível salvar a assinatura.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <h2 className="font-display font-semibold text-ink text-sm">Assinatura do cliente</h2>
      {os.assinatura_url && !refazendo ? (
        <div className="space-y-2">
          <img src={os.assinatura_url} className="border border-border rounded-lg bg-white h-32 object-contain" />
          {podeEditar && (
            <Button variant="secondary" size="sm" onClick={() => setRefazendo(true)}>
              Refazer assinatura
            </Button>
          )}
        </div>
      ) : podeEditar ? (
        <SignaturePad onSave={salvar} saving={salvando} />
      ) : (
        <p className="text-ink-soft text-sm">Nenhuma assinatura registrada.</p>
      )}
    </div>
  )
}

function SecaoNotaFiscal({ os }: { os: OrdemServico }) {
  const { showToast } = useToast()
  const [notas, setNotas] = useState<NotaFiscalRegistro[]>([])
  const [config, setConfig] = useState<Awaited<ReturnType<typeof getNotaFiscalConfig>>>(null)
  const [loading, setLoading] = useState(true)
  const [emitindo, setEmitindo] = useState(false)
  const [consultando, setConsultando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [n, c] = await Promise.all([listNotasFiscaisPorOS(os.id), getNotaFiscalConfig()])
    setNotas(n)
    setConfig(c)
    setLoading(false)
  }, [os.id])

  useEffect(() => {
    carregar()
  }, [carregar])

  const status = notaFiscalPronta(config)

  async function emitir() {
    setEmitindo(true)
    try {
      await emitirNFSe({
        osId: os.id,
        numeroOS: os.numero,
        valorServicos: os.valor_total,
        discriminacao: `Serviços de mecânica diesel referentes à OS #${os.numero} — veículo ${os.veiculo?.marca || ''} ${os.veiculo?.modelo || ''}`,
        tomador: {
          nome: os.cliente?.nome || '',
          cpf_cnpj: os.cliente?.cpf_cnpj || undefined,
          email: os.cliente?.email || undefined,
          telefone: os.cliente?.telefone,
        },
      })
      showToast('Nota enviada para processamento. Acompanhe o status abaixo.', 'success')
      carregar()
    } catch (e: any) {
      showToast(e.message || 'Não foi possível emitir a nota.', 'error')
    } finally {
      setEmitindo(false)
    }
  }

  async function atualizarStatus(nota: NotaFiscalRegistro) {
    setConsultando(nota.id)
    try {
      await consultarStatusNota(nota)
      carregar()
    } catch (e: any) {
      showToast(e.message || 'Não foi possível consultar o status.', 'error')
    } finally {
      setConsultando(null)
    }
  }

  const STATUS_LABEL: Record<string, string> = {
    pendente: 'Pendente',
    processando: 'Processando',
    emitida: 'Emitida',
    cancelada: 'Cancelada',
    erro: 'Erro',
  }
  const STATUS_COR: Record<string, string> = {
    pendente: 'bg-gray-100 text-gray-600',
    processando: 'bg-amber-50 text-amber-700',
    emitida: 'bg-green-50 text-green-700',
    cancelada: 'bg-red-50 text-red-700',
    erro: 'bg-red-50 text-red-700',
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-ink text-sm">Nota Fiscal</h2>
        {status.pronta && os.status === 'entregue' && (
          <Button size="sm" icon={<FileText size={14} />} onClick={emitir} loading={emitindo}>
            Emitir NFS-e
          </Button>
        )}
      </div>

      {!status.pronta && (
        <p className="text-xs text-ink-soft">
          {status.motivo} Configure em <strong>Configurações → Nota Fiscal</strong>.
        </p>
      )}
      {status.pronta && os.status !== 'entregue' && (
        <p className="text-xs text-ink-soft">A emissão fica disponível quando a OS estiver marcada como "Entregue".</p>
      )}

      {loading ? (
        <p className="text-ink-soft text-sm">Carregando...</p>
      ) : (
        <div className="divide-y divide-border">
          {notas.map((n) => (
            <div key={n.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="font-mono text-xs text-ink-soft">{n.tipo.toUpperCase()}</span>
              {n.numero && <span className="text-ink">Nº {n.numero}</span>}
              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${STATUS_COR[n.status]}`}>
                {STATUS_LABEL[n.status]}
              </span>
              {n.mensagem_erro && <span className="text-xs text-status-cancelado truncate">{n.mensagem_erro}</span>}
              {n.link_pdf && (
                <a href={n.link_pdf} target="_blank" rel="noreferrer" className="text-xs text-torque font-medium hover:underline">
                  PDF
                </a>
              )}
              {(n.status === 'processando' || n.status === 'pendente') && (
                <button onClick={() => atualizarStatus(n)} className="text-ink-soft hover:text-ink ml-auto" title="Atualizar status">
                  <RefreshCw size={14} className={consultando === n.id ? 'animate-spin' : ''} />
                </button>
              )}
            </div>
          ))}
          {notas.length === 0 && <p className="text-ink-soft text-sm py-2">Nenhuma nota emitida para esta OS ainda.</p>}
        </div>
      )}
    </div>
  )
}

function SecaoHistorico({ osId }: { osId: string }) {
  const [historico, setHistorico] = useState<OSHistorico[]>([])
  const [loading, setLoading] = useState(true)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    if (aberto) {
      listHistoricoOS(osId).then((h) => {
        setHistorico(h)
        setLoading(false)
      })
    }
  }, [aberto, osId])

  return (
    <div className="card p-5">
      <button className="flex items-center gap-2 text-sm font-semibold text-ink w-full" onClick={() => setAberto(!aberto)}>
        <History size={15} />
        Histórico de alterações
      </button>
      {aberto && (
        <div className="mt-3 space-y-2.5">
          {loading ? (
            <p className="text-ink-soft text-sm">Carregando...</p>
          ) : historico.length === 0 ? (
            <p className="text-ink-soft text-sm">Nenhum registro de alteração ainda.</p>
          ) : (
            historico.map((h) => (
              <div key={h.id} className="text-sm border-l-2 border-border pl-3">
                <p className="text-ink">
                  {h.acao} {h.detalhe && <span className="text-ink-soft">— {h.detalhe}</span>}
                </p>
                <p className="text-xs text-ink-soft">
                  {h.usuario_nome || 'Sistema'} · {formatDateTime(h.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
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
  const { showToast } = useToast()
  const [tipo, setTipo] = useState<'servico' | 'peca'>('servico')
  const [pecas, setPecas] = useState<Peca[]>([])
  const [pecaId, setPecaId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [valorUnitario, setValorUnitario] = useState('')
  const [tempoMinutos, setTempoMinutos] = useState('')
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
        tempo_minutos: tipo === 'servico' && tempoMinutos ? Number(tempoMinutos) : null,
      })
      showToast('Item adicionado à OS.', 'success')
      onSaved()
    } catch {
      showToast('Não foi possível adicionar o item.', 'error')
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
            <input className="input-field" value={valorUnitario} onChange={(e) => setValorUnitario(e.target.value)} />
          </div>
        </div>
        {tipo === 'servico' && (
          <div>
            <label className="label-field">Tempo de mão de obra (minutos)</label>
            <input className="input-field" value={tempoMinutos} onChange={(e) => setTempoMinutos(e.target.value)} placeholder="ex: 60" />
          </div>
        )}
        <Button fullWidth className="mt-2" onClick={salvar} loading={salvando}>
          Adicionar item
        </Button>
      </div>
    </Modal>
  )
}
