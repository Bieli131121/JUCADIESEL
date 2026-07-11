// Sanitização defensiva de campos de texto livre antes de persistir.
// O React já escapa conteúdo na renderização (proteção contra XSS na tela),
// mas isso evita que tags/scripts fiquem armazenados no banco e possam
// causar problemas em outros contextos (exportação PDF/Excel, impressão,
// integrações futuras como WhatsApp/NF-e).

export function limparTexto(valor: string | null | undefined): string {
  if (!valor) return ''
  return valor
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
}

export function limparTextoOuNull(valor: string | null | undefined): string | null {
  const limpo = limparTexto(valor)
  return limpo.length > 0 ? limpo : null
}
