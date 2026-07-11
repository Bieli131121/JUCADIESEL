import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { listFotosVeiculo, adicionarFotoVeiculo, removerFotoVeiculo } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useToast } from '@/contexts/ToastContext'
import type { Veiculo, VeiculoFoto } from '@/types/database'

export function ModalFotosVeiculo({ veiculo, onClose }: { veiculo: Veiculo; onClose: () => void }) {
  const { showToast } = useToast()
  const [fotos, setFotos] = useState<VeiculoFoto[]>([])
  const [novaUrl, setNovaUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setLoading(true)
    setFotos(await listFotosVeiculo(veiculo.id))
    setLoading(false)
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veiculo.id])

  async function adicionarPorUrl() {
    if (!novaUrl) return
    setSalvando(true)
    try {
      await adicionarFotoVeiculo(veiculo.id, novaUrl)
      setNovaUrl('')
      carregar()
    } catch {
      showToast('Não foi possível adicionar a foto.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  async function adicionarPorUpload(url: string) {
    setSalvando(true)
    try {
      await adicionarFotoVeiculo(veiculo.id, url)
      carregar()
    } catch {
      showToast('Não foi possível salvar a foto enviada.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(fotoId: string) {
    await removerFotoVeiculo(fotoId)
    carregar()
  }

  return (
    <Modal open title={`Fotos · ${veiculo.placa}`} onClose={onClose}>
      <div className="space-y-4">
        <ImageUpload pasta="veiculos" onUploaded={adicionarPorUpload} label="Tirar foto ou escolher arquivo" />

        <div className="flex gap-2">
          <input
            className="input-field"
            placeholder="ou cole uma URL (https://...)"
            value={novaUrl}
            onChange={(e) => setNovaUrl(e.target.value)}
          />
          <Button size="sm" onClick={adicionarPorUrl} loading={salvando}>
            Adicionar
          </Button>
        </div>

        {loading ? (
          <p className="text-ink-soft text-sm">Carregando...</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((f) => (
              <div key={f.id} className="relative group">
                <img src={f.url} className="w-full h-20 object-cover rounded-lg border border-border" />
                <button
                  onClick={() => remover(f.id)}
                  className="absolute top-1 right-1 bg-graphite/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {fotos.length === 0 && (
              <p className="text-ink-soft text-sm col-span-3 text-center py-4">Nenhuma foto adicionada ainda.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
