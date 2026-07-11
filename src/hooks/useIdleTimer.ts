import { useEffect, useRef } from 'react'

const EVENTOS_ATIVIDADE = ['mousedown', 'keydown', 'touchstart', 'scroll']

export function useIdleTimer(minutosParaLogout: number, onIdle: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function resetar() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(onIdle, minutosParaLogout * 60 * 1000)
    }

    resetar()
    EVENTOS_ATIVIDADE.forEach((ev) => window.addEventListener(ev, resetar))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      EVENTOS_ATIVIDADE.forEach((ev) => window.removeEventListener(ev, resetar))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutosParaLogout])
}
