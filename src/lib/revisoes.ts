import type { Veiculo } from '@/types/database'

export type StatusRevisao = 'sem_config' | 'em_dia' | 'proxima' | 'atrasada'

export function calcularStatusRevisao(v: Veiculo): StatusRevisao {
  if (!v.intervalo_revisao_km && !v.intervalo_revisao_meses) return 'sem_config'

  let statusKm: StatusRevisao = 'em_dia'
  if (v.intervalo_revisao_km) {
    const rodadoDesdeRevisao = v.km_atual - (v.ultima_revisao_km ?? 0)
    const percentual = rodadoDesdeRevisao / v.intervalo_revisao_km
    statusKm = percentual >= 1 ? 'atrasada' : percentual >= 0.85 ? 'proxima' : 'em_dia'
  }

  let statusData: StatusRevisao = 'em_dia'
  if (v.intervalo_revisao_meses && v.ultima_revisao_data) {
    const mesesDesde =
      (new Date().getFullYear() - new Date(v.ultima_revisao_data).getFullYear()) * 12 +
      (new Date().getMonth() - new Date(v.ultima_revisao_data).getMonth())
    const percentual = mesesDesde / v.intervalo_revisao_meses
    statusData = percentual >= 1 ? 'atrasada' : percentual >= 0.85 ? 'proxima' : 'em_dia'
  }

  if (statusKm === 'atrasada' || statusData === 'atrasada') return 'atrasada'
  if (statusKm === 'proxima' || statusData === 'proxima') return 'proxima'
  return 'em_dia'
}
