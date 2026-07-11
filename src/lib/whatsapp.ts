export function preencherTemplate(template: string, variaveis: Record<string, string>): string {
  let resultado = template
  Object.entries(variaveis).forEach(([chave, valor]) => {
    resultado = resultado.split(`{{${chave}}}`).join(valor)
  })
  return resultado
}

function limparTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, '')
  // Se não tem código do país, assume Brasil (55)
  if (digitos.length <= 11) return `55${digitos}`
  return digitos
}

export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  const numero = limparTelefone(telefone)
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}

export function abrirWhatsApp(telefone: string, mensagem: string): void {
  window.open(gerarLinkWhatsApp(telefone, mensagem), '_blank')
}
