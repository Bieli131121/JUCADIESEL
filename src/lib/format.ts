// Utilitários de formatação usados em todo o sistema.
// Centralizado aqui pra evitar a mesma função repetida em várias telas —
// se um dia precisar mudar o formato de moeda/data, muda só neste arquivo.

export function formatMoney(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatDateShort(d: string | null | undefined): string {
  if (!d) return '—'
  const data = new Date(d)
  return `${data.getDate()}/${data.getMonth() + 1}`
}
