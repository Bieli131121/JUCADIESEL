import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, Car, Phone, Trash2, Users } from 'lucide-react'
import { listClientes, listVeiculos, listOrdensServico, listContasReceber, deleteCliente } from '@/lib/db'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { ModalNovoCliente } from '@/components/ModalNovoCliente'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SkeletonList } from '@/components/ui/Skeleton'
import { Pagination } from '@/components/ui/Pagination'
import { paginar } from '@/lib/paginar'
import { useToast } from '@/contexts/ToastContext'
import type { Cliente, Veiculo, OrdemServico, ContaReceber } from '@/types/database'
import { formatMoney } from '@/lib/format'

export default function Clientes() {
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [contas, setContas] = useState<ContaReceber[]>([])
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const ITENS_POR_PAGINA = 12
  const [loading, setLoading] = useState(true)
  const [modalCliente, setModalCliente] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [aba, setAba] = useState<'historico' | 'financeiro'>('historico')
  const [confirmarExcluirCliente, setConfirmarExcluirCliente] = useState<Cliente | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  async function carregar() {
    setLoading(true)
    const [c, v, o, cr] = await Promise.all([listClientes(), listVeiculos(), listOrdensServico(), listContasReceber()])
    setClientes(c)
    setVeiculos(v)
    setOrdens(o)
    setContas(cr)
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  // Se veio de "N veículos →" na tela de Veículos, já abre o cliente certo direto.
  useEffect(() => {
    const destaque = searchParams.get('destaque')
    if (destaque) {
      setExpandido(destaque)
      setAba('historico')
    }
  }, [searchParams])

  const filtrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone.includes(busca) ||
      (c.cpf_cnpj || '').includes(busca)
  )
  const filtradosPaginados = paginar(filtrados, pagina, ITENS_POR_PAGINA)

  useEffect(() => {
    setPagina(1)
  }, [busca])

  function alternarExpandir(clienteId: string) {
    if (expandido === clienteId) {
      setExpandido(null)
    } else {
      setExpandido(clienteId)
      setAba('historico')
    }
  }

  async function excluirCliente() {
    if (!confirmarExcluirCliente) return
    setExcluindo(true)
    try {
      await deleteCliente(confirmarExcluirCliente.id)
      showToast('Cliente excluído.', 'success')
      setConfirmarExcluirCliente(null)
      carregar()
    } catch (erro: any) {
      showToast(erro.message || 'Não foi possível excluir o cliente.', 'error')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Clientes</h1>
          <p className="text-ink-soft text-sm mt-1">{clientes.length} clientes cadastrados</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalCliente(true)}>
          Novo cliente
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          className="input-field pl-9"
          placeholder="Buscar por nome, telefone ou CPF..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : (
        <div className="space-y-3">
          {filtradosPaginados.map((cliente) => {
            const veiculosDoCliente = veiculos.filter((v) => v.cliente_id === cliente.id)
            const osDoCliente = ordens.filter((o) => o.cliente_id === cliente.id).sort((a, b) => b.numero - a.numero)
            const contasDoCliente = contas.filter((c) => c.cliente_id === cliente.id)
            const aberto = expandido === cliente.id
            return (
              <div key={cliente.id} className="card overflow-hidden">
                <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => alternarExpandir(cliente.id)}>
                  {cliente.foto_url ? (
                    <img src={cliente.foto_url} className="w-10 h-10 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-canvas flex items-center justify-center text-ink-soft font-display font-semibold">
                      {cliente.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-ink">{cliente.nome}</p>
                    <p className="text-xs text-ink-soft flex items-center gap-1 mt-0.5">
                      <Phone size={12} /> {cliente.telefone}
                      {cliente.cpf_cnpj && ` · ${cliente.cpf_cnpj}`}
                    </p>
                  </div>
                  <Link
                    to={`/veiculos?cliente=${cliente.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-ink-soft hover:text-torque flex items-center gap-1 hover:underline"
                  >
                    <Car size={14} /> {veiculosDoCliente.length} veículo{veiculosDoCliente.length === 1 ? '' : 's'}
                  </Link>
                </button>
                {aberto && (
                  <div className="border-t border-border">
                    <div className="flex gap-1 px-4 pt-3 items-center">
                      <AbaBtn label={`Histórico de OS (${osDoCliente.length})`} ativa={aba === 'historico'} onClick={() => setAba('historico')} />
                      <AbaBtn label="Financeiro" ativa={aba === 'financeiro'} onClick={() => setAba('financeiro')} />
                      <button
                        className="text-xs text-status-cancelado font-medium hover:underline flex items-center gap-1 ml-auto shrink-0"
                        onClick={() => setConfirmarExcluirCliente(cliente)}
                      >
                        <Trash2 size={12} /> Excluir cliente
                      </button>
                    </div>

                    <div className="px-4 py-3 bg-canvas/50 space-y-2">
                      {aba === 'historico' && (
                        <>
                          {osDoCliente.map((o) => (
                            <Link
                              key={o.id}
                              to={`/ordens-servico/${o.id}`}
                              className="flex items-center gap-3 text-sm hover:bg-white -mx-1 px-1 py-1 rounded"
                            >
                              <span className="font-mono text-xs text-ink-soft">#{o.numero}</span>
                              <span className="text-ink flex-1 truncate">
                                {o.veiculo?.marca} {o.veiculo?.modelo}
                              </span>
                              <span className="font-mono text-xs text-ink">{formatMoney(o.valor_total)}</span>
                              <StatusBadge status={o.status} />
                            </Link>
                          ))}
                          {osDoCliente.length === 0 && <p className="text-ink-soft text-sm py-2">Nenhuma OS registrada.</p>}
                        </>
                      )}

                      {aba === 'financeiro' && (
                        <>
                          {contasDoCliente.map((c) => (
                            <div key={c.id} className="flex items-center gap-3 text-sm">
                              <span className="text-ink flex-1 truncate">{c.descricao}</span>
                              <span className="font-mono text-xs text-ink">{formatMoney(c.valor)}</span>
                              <span
                                className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                  c.status === 'pago' ? 'text-status-entregue bg-green-50' : 'text-status-execucao bg-amber-50'
                                }`}
                              >
                                {c.status === 'pago' ? 'Pago' : 'Pendente'}
                              </span>
                            </div>
                          ))}
                          {contasDoCliente.length === 0 && (
                            <p className="text-ink-soft text-sm py-2">Nenhum lançamento financeiro.</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {filtrados.length === 0 && (
            <EmptyState icon={Users} title="Nenhum cliente encontrado" description="Tente buscar por outro nome, telefone ou CPF." />
          )}
        </div>
      )}
      <Pagination paginaAtual={pagina} totalItens={filtrados.length} itensPorPagina={ITENS_POR_PAGINA} onMudarPagina={setPagina} />

      <ModalNovoCliente open={modalCliente} onClose={() => setModalCliente(false)} onSaved={carregar} />

      <ConfirmDialog
        open={!!confirmarExcluirCliente}
        title="Excluir cliente"
        message={`Tem certeza que deseja excluir ${confirmarExcluirCliente?.nome}? Isso também exclui os veículos e fotos vinculados a ele. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={excluirCliente}
        onCancel={() => setConfirmarExcluirCliente(null)}
        loading={excluindo}
      />
    </div>
  )
}

function AbaBtn({ label, ativa, onClick }: { label: string; ativa: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        ativa ? 'bg-graphite text-white' : 'text-ink-soft hover:bg-canvas'
      }`}
    >
      {label}
    </button>
  )
}
