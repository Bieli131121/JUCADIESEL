import { useEffect, useState } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

function getDeviceType(width: number): DeviceType {
  if (width < 640) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

export function useDevice() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280))
  const [device, setDevice] = useState<DeviceType>(() => getDeviceType(width))

  useEffect(() => {
    let raf = 0
    function handleResize() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const w = window.innerWidth
        setWidth(w)
        setDevice(getDeviceType(w))
      })
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return {
    device,
    width,
    isMobile: device === 'mobile',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop',
  }
}
