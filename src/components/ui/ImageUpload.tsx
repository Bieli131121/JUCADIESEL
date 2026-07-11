import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { uploadImagem } from '@/lib/upload'
import { useToast } from '@/contexts/ToastContext'

interface ImageUploadProps {
  pasta: string
  onUploaded: (url: string) => void
  label?: string
  compacto?: boolean
}

export function ImageUpload({ pasta, onUploaded, label = 'Adicionar foto', compacto = false }: ImageUploadProps) {
  const { showToast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)

  async function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setEnviando(true)
    try {
      const url = await uploadImagem(arquivo, pasta)
      onUploaded(url)
    } catch (erro: any) {
      showToast(erro.message || 'Não foi possível enviar a foto.', 'error')
    } finally {
      setEnviando(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={selecionarArquivo} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={enviando}
        className={
          compacto
            ? 'flex items-center gap-1.5 text-xs text-torque font-medium hover:underline disabled:opacity-50'
            : 'flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-6 w-full cursor-pointer hover:border-torque hover:bg-canvas transition-colors disabled:opacity-50'
        }
      >
        {enviando ? (
          <Loader2 size={compacto ? 13 : 22} className="animate-spin text-ink-soft" />
        ) : (
          <Camera size={compacto ? 13 : 22} className={compacto ? '' : 'text-ink-soft'} />
        )}
        <span className={compacto ? '' : 'text-sm text-ink-soft'}>{enviando ? 'Enviando...' : label}</span>
      </button>
    </>
  )
}
