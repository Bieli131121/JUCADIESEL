import { useRef, useState, useEffect } from 'react'
import { Button } from './Button'

interface SignaturePadProps {
  onSave: (dataUrl: string) => void
  saving?: boolean
}

export function SignaturePad({ onSave, saving }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const desenhando = useRef(false)
  const [temTraco, setTemTraco] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#1A1D23'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function pos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function iniciar(e: React.MouseEvent | React.TouchEvent) {
    desenhando.current = true
    const { x, y } = pos(e)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function desenhar(e: React.MouseEvent | React.TouchEvent) {
    if (!desenhando.current) return
    const { x, y } = pos(e)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.lineTo(x, y)
    ctx.stroke()
    setTemTraco(true)
  }

  function parar() {
    desenhando.current = false
  }

  function limpar() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setTemTraco(false)
  }

  function salvar() {
    if (!temTraco) return
    onSave(canvasRef.current!.toDataURL('image/png'))
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={500}
        height={160}
        className="w-full bg-white border border-border rounded-lg cursor-crosshair touch-none"
        onMouseDown={iniciar}
        onMouseMove={desenhar}
        onMouseUp={parar}
        onMouseLeave={parar}
        onTouchStart={iniciar}
        onTouchMove={desenhar}
        onTouchEnd={parar}
      />
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={limpar}>
          Limpar
        </Button>
        <Button size="sm" onClick={salvar} loading={saving} disabled={!temTraco}>
          Salvar assinatura
        </Button>
      </div>
    </div>
  )
}
