import { useState } from 'react'
import { Upload, Package, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { parsearXmlNFe, type NFeImportada, type ItemNFeImportado } from '@/lib/nfeImport'
import { listPecas, upsertPeca, registrarEntradaEstoque, verificarNfeJaImportada, registrarNfeImportada } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import type { Peca } from '@/types/database'
import { formatMoney } from '@/lib/format'

interface ModalImportarNFeCompraProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

interface MapeamentoItem {
  acao: 'existente' | 'nova' | 'ignorar'
  pecaId: string
  quantidade: string
  precoVenda: string
}

function normalizar(texto: string) {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function ModalImportarNFeCompra({ open, onClose, onSaved }: ModalImportarNFeCompraProps) {
  const { showToast } = useToast()
  const [etapa, setEtapa] = useState<'upload' | 'revisao'>('upload')
  const [carregandoArquivo, setCarregandoArquivo] = useState(false)
  const [nfe, setNfe] = useState<NFeImportada | null>(null)
  const [pecas, setPecas] = useState<Peca[]>([])
  const [mapeamento, setMapeamento] = useState<MapeamentoItem[]>([])
  const [jaImportada, setJaImportada] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  function fecharEResetar() {
    setEtapa('upload')
    setNfe(null)
    setMapeamento([])
    setJaImportada(false)
    onClose()
  }

  async function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setCarregandoArquivo(true)
    try {
      const texto = await arquivo.text()
      const nfeParseada = parsearXmlNFe(texto)

      const jaExiste = await verificarNfeJaImportada(nfeParseada.chaveAcesso)
      setJaImportada(jaExiste)

      const listaPecas = await listPecas()
      setPecas(listaPecas)

      const mapeamentoInicial: MapeamentoItem[] = nfeParseada.itens.map((item) => {
        const encontrada = listaPecas.find(
          (p) =>
            (p.codigo && p.codigo.trim() === item.codigoFornecedor.trim()) ||
            (p.codigo_barras && item.codigoBarras && p.codigo_barras === item.codigoBarras) ||
            normalizar(p.nome) === normalizar(item.descricao)
        )
        return {
          acao: encontrada ? 'existente' : 'nova',
          pecaId: encontrada?.id || '',
          quantidade: String(item.quantidade),
          precoVenda: encontrada ? String(encontrada.preco_venda) : String((item.valorUnitario * 1.4).toFixed(2)),
        }
      })

      setNfe(nfeParseada)
      setMapeamento(mapeamentoInicial)
      setEtapa('revisao')
    } catch (erro: any) {
      showToast(erro.message || 'Não foi possível ler o arquivo XML.', 'error')
    } finally {
      setCarregandoArquivo(false)
      e.target.value = ''
    }
  }

  function atualizarItem(idx: number, campo: keyof MapeamentoItem, valor: string) {
    setMapeamento((atual) => atual.map((m, i) => (i === idx ? { ...m, [campo]: valor } : m)))
  }

  async function confirmarImportacao() {
    if (!nfe) return
    setConfirmando(true)
    let processados = 0
    try {
      for (let i = 0; i < nfe.itens.length; i++) {
        const item = nfe.itens[i]
        const map = mapeamento[i]
        if (map.acao === 'ignorar') continue

        const quantidade = Number(map.quantidade) || 0
        if (quantidade <= 0) continue

        if (map.acao === 'existente' && map.pecaId) {
          await registrarEntradaEstoque(map.pecaId, quantidade, `NF-e #${nfe.numero} - ${nfe.emitenteNome}`)
        } else if (map.acao === 'nova') {
          const novaPeca = await upsertPeca({
            nome: item.descricao,
            codigo: item.codigoFornecedor || null,
            codigo_barras: item.codigoBarras || null,
            quantidade_estoque: 0,
            estoque_minimo: 5,
            preco_custo: item.valorUnitario,
            preco_venda: Number(map.precoVenda) || item.valorUnitario,
            fornecedor: nfe.emitenteNome,
          })
          await registrarEntradaEstoque(novaPeca.id, quantidade, `NF-e #${nfe.numero} - ${nfe.emitenteNome}`)
        }
        processados++
      }

      await registrarNfeImportada({
        chave_acesso: nfe.chaveAcesso,
        numero: nfe.numero,
        serie: nfe.serie,
        emitente_nome: nfe.emitenteNome,
        emitente_cnpj: nfe.emitenteCnpj,
        valor_total: nfe.valorTotal,
        itens_importados: processados,
      })

      showToast(`${processados} peça(s) atualizadas no estoque a partir da NF-e #${nfe.numero}.`, 'success')
      fecharEResetar()
      onSaved()
    } catch (erro: any) {
      showToast(erro.message || 'Não foi possível concluir a importação.', 'error')
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <Modal open={open} title="Importar Nota Fiscal de Compra" onClose={fecharEResetar} maxWidth="max-w-3xl">
      {etapa === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            Selecione o arquivo <strong>XML</strong> da nota fiscal enviada pelo fornecedor. O sistema lê os produtos
            automaticamente e sugere a entrada no estoque — você confirma antes de qualquer alteração.
          </p>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-10 cursor-pointer hover:border-torque hover:bg-canvas transition-colors">
            <Upload size={28} className="text-ink-soft" />
            <span className="text-sm text-ink-soft">{carregandoArquivo ? 'Lendo arquivo...' : 'Clique para selecionar o XML'}</span>
            <input type="file" accept=".xml,text/xml" className="hidden" onChange={selecionarArquivo} disabled={carregandoArquivo} />
          </label>
        </div>
      )}

      {etapa === 'revisao' && nfe && (
        <div className="space-y-4">
          <div className="card p-3 bg-canvas/50 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-medium text-ink">{nfe.emitenteNome}</p>
              <p className="text-xs text-ink-soft font-mono">
                NF-e #{nfe.numero} · Série {nfe.serie} · {formatMoney(nfe.valorTotal)}
              </p>
            </div>
            {jaImportada && (
              <span className="flex items-center gap-1 text-xs text-status-cancelado font-medium">
                <AlertTriangle size={13} /> Essa NF-e já foi importada antes
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {nfe.itens.map((item, idx) => (
              <ItemLinha
                key={idx}
                item={item}
                mapeamento={mapeamento[idx]}
                pecas={pecas}
                onChange={(campo, valor) => atualizarItem(idx, campo, valor)}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEtapa('upload')}>
              Escolher outro arquivo
            </Button>
            <Button
              fullWidth
              icon={<CheckCircle2 size={16} />}
              onClick={confirmarImportacao}
              loading={confirmando}
              disabled={jaImportada}
            >
              {jaImportada ? 'Nota já importada anteriormente' : 'Confirmar entrada no estoque'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function ItemLinha({
  item,
  mapeamento,
  pecas,
  onChange,
}: {
  item: ItemNFeImportado
  mapeamento: MapeamentoItem
  pecas: Peca[]
  onChange: (campo: keyof MapeamentoItem, valor: string) => void
}) {
  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Package size={14} className="text-ink-soft shrink-0" />
        <span className="text-sm text-ink font-medium truncate">{item.descricao}</span>
        <span className="text-xs text-ink-soft font-mono ml-auto shrink-0">
          {item.quantidade} {item.unidade} × {formatMoney(item.valorUnitario)}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select
          className="input-field text-xs"
          value={mapeamento.acao}
          onChange={(e) => onChange('acao', e.target.value)}
        >
          <option value="existente">Peça já cadastrada</option>
          <option value="nova">Cadastrar como nova</option>
          <option value="ignorar">Ignorar este item</option>
        </select>

        {mapeamento.acao === 'existente' && (
          <select
            className="input-field text-xs col-span-2"
            value={mapeamento.pecaId}
            onChange={(e) => onChange('pecaId', e.target.value)}
          >
            <option value="">Selecione a peça...</option>
            {pecas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} {p.codigo ? `(${p.codigo})` : ''} — estoque atual: {p.quantidade_estoque}
              </option>
            ))}
          </select>
        )}

        {mapeamento.acao === 'nova' && (
          <div className="col-span-2 flex gap-2">
            <input
              className="input-field text-xs"
              value={mapeamento.quantidade}
              onChange={(e) => onChange('quantidade', e.target.value)}
              placeholder="Quantidade"
            />
            <input
              className="input-field text-xs"
              value={mapeamento.precoVenda}
              onChange={(e) => onChange('precoVenda', e.target.value)}
              placeholder="Preço de venda"
            />
          </div>
        )}

        {mapeamento.acao === 'existente' && (
          <input
            className="input-field text-xs col-span-3"
            value={mapeamento.quantidade}
            onChange={(e) => onChange('quantidade', e.target.value)}
            placeholder="Quantidade a dar entrada"
          />
        )}
      </div>
    </div>
  )
}
