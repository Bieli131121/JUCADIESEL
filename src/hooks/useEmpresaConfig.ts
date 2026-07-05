import { useEffect, useState } from 'react'
import { getEmpresaConfig } from '@/lib/db'
import type { EmpresaConfig } from '@/types/database'

export function useEmpresaConfig() {
  const [config, setConfig] = useState<EmpresaConfig | null>(null)
  const [loading, setLoading] = useState(true)

  async function reload() {
    setLoading(true)
    try {
      const data = await getEmpresaConfig()
      setConfig(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  return { config, loading, reload }
}
