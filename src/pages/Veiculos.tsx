import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Plus, Search, Image as ImageIcon, Pencil, Trash2, Car } from 'lucide-react'
import { listVeiculos, deleteVeiculo } from '@/lib/db'
import { ModalNovoVeiculo } from '@/components/ModalNovoVeiculo'
import { ModalFotosVeiculo } from '@/components/ModalFotosVeiculo'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconAction } from '@/components/ui/IconAction'
import { SkeletonList } from '@/components/ui/Skeleton'
import { Pagination } from '@/components/ui/Pagination'
import { paginar } from '@/lib/paginar'
import { Placa } from '@/components/ui/Placa'
import { useToast } from '@/contexts/ToastContext'
import type { Veiculo } from '@/types/database'

export default function Veiculos() {
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const filtroClienteId = searchParams.get('cliente')

  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [busca, setBusca] = useState(searchParams.get('busca') || '')
  const [pagina, setPagina] = useState(1)
  const ITENS_POR_PAGINA = 12
  const [loading, setLoading] = useState(true)
  const [modalNovo, setModalNovo] = useState(false)
  const [modalEditar, setModalEditar] = useState<Veiculo | null>(null)
  const [modalFotos, setModalFotos] = useState<Veiculo | null>(null)
  const [confirmarExcluir, setConfirmarExcluir] = useState<Veiculo | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  async function carregar() {
    setLoading(true)
    setVeiculos(await listVeiculos())
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  useEffect(() => {
    setPagina(1)
  }, [busca])

  const filtrados = veiculos.filter((v) => {
    if (filtroClienteId && v.cliente_id !== filtroClienteId) return false
    const termo = busca.toLowerCase()
    return (
      v.placa.toLowerCase().includes(termo) ||
      v.modelo.toLowerCase().includes(termo) ||
      (v.marca || '').toLowerCase().includes(termo) ||
      (v.cliente?.nome || '').toLowerCase().includes(termo)
    )
  })
  const filtradosPaginados = paginar(filtrados, pagina, ITENS_POR_PAGINA)

  async function excluirVeiculo() {
    if (!confirmarExcluir) return
    setExcluindo(true)
    try {
      await deleteVeiculo(confirmarExcluir.id)
      showToast('Veículo excluído.', 'success')
      setConfirmarExcluir(null)
      carregar()
    } catch (erro: any) {
      showToast(erro.message || 'Não foi possível excluir o veículo.', 'error')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Veículos</h1>
          <p className="text-ink-soft text-sm mt-1">{veiculos.length} veículos cadastrados</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalNovo(true)}>
          Novo veículo
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          className="input-field pl-9"
          placeholder="Buscar por placa, modelo ou cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : (
        <div className="card divide-y divide-border">
          {filtradosPaginados.map((v) => (
            <div key={v.id} className="flex items-center gap-3 p-4 flex-wrap">
              <Placa placa={v.placa} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">
                  {v.marca} {v.modelo} {v.ano ? `· ${v.ano}` : ''}
                </p>
                <p className="text-xs text-ink-soft">
                  {v.cliente ? (
                    <Link to={`/clientes?destaque=${v.cliente_id}`} className="hover:underline">
                      {v.cliente.nome}
                    </Link>
                  ) : (
                    'Cliente não encontrado'
                  )}
                  {' · '}
                  {v.km_atual.toLocaleString('pt-BR')} km
                </p>
              </div>
              <IconAction title="Fotos" onClick={() => setModalFotos(v)}>
                <ImageIcon size={15} />
              </IconAction>
              <IconAction title="Editar" onClick={() => setModalEditar(v)}>
                <Pencil size={15} />
              </IconAction>
              <IconAction title="Excluir" danger onClick={() => setConfirmarExcluir(v)}>
                <Trash2 size={15} />
              </IconAction>
            </div>
          ))}
          {filtrados.length === 0 && <EmptyState icon={Car} title="Nenhum veículo encontrado" />}
        </div>
      )}
      <Pagination paginaAtual={pagina} totalItens={filtrados.length} itensPorPagina={ITENS_POR_PAGINA} onMudarPagina={setPagina} />

      <ModalNovoVeiculo open={modalNovo} onClose={() => setModalNovo(false)} onSaved={carregar} />
      {modalEditar && (
        <ModalNovoVeiculo open veiculo={modalEditar} onClose={() => setModalEditar(null)} onSaved={carregar} />
      )}
      {modalFotos && <ModalFotosVeiculo veiculo={modalFotos} onClose={() => setModalFotos(null)} />}

      <ConfirmDialog
        open={!!confirmarExcluir}
        title="Excluir veículo"
        message={`Tem certeza que deseja excluir o veículo ${confirmarExcluir?.placa}? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={excluirVeiculo}
        onCancel={() => setConfirmarExcluir(null)}
        loading={excluindo}
      />
    </div>
  )
}
