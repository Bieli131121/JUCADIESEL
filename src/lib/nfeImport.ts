// Leitura do XML da NF-e (modelo padrão da SEFAZ, o mesmo arquivo que
// fornecedores enviam por e-mail ou disponibilizam pra download).
// Usa DOMParser nativo do navegador — não precisa de nenhuma biblioteca.

export interface ItemNFeImportado {
  codigoFornecedor: string
  descricao: string
  ncm: string
  cfop: string
  unidade: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  codigoBarras: string | null
}

export interface NFeImportada {
  chaveAcesso: string
  numero: number
  serie: string
  dataEmissao: string
  emitenteNome: string
  emitenteCnpj: string
  valorTotal: number
  itens: ItemNFeImportado[]
}

function textoTag(elemento: Element | Document, tag: string): string {
  const el = elemento.getElementsByTagName(tag)[0]
  return el?.textContent?.trim() || ''
}

function numeroTag(elemento: Element | Document, tag: string): number {
  const valor = textoTag(elemento, tag)
  return valor ? Number(valor) : 0
}

export function parsearXmlNFe(xmlTexto: string): NFeImportada {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlTexto, 'application/xml')

  const erroParser = doc.getElementsByTagName('parsererror')[0]
  if (erroParser) {
    throw new Error('Arquivo XML inválido ou corrompido.')
  }

  const infNFe = doc.getElementsByTagName('infNFe')[0]
  if (!infNFe) {
    throw new Error('Este arquivo não parece ser um XML de NF-e válido (tag infNFe não encontrada).')
  }

  // Chave de acesso vem no atributo Id="NFe44digitos"
  const idAttr = infNFe.getAttribute('Id') || ''
  const chaveAcesso = idAttr.replace(/^NFe/, '')

  const ide = infNFe.getElementsByTagName('ide')[0]
  const emit = infNFe.getElementsByTagName('emit')[0]
  const total = infNFe.getElementsByTagName('ICMSTot')[0]

  const detElements = Array.from(infNFe.getElementsByTagName('det'))
  const itens: ItemNFeImportado[] = detElements.map((det) => {
    const prod = det.getElementsByTagName('prod')[0]
    return {
      codigoFornecedor: textoTag(prod, 'cProd'),
      descricao: textoTag(prod, 'xProd'),
      ncm: textoTag(prod, 'NCM'),
      cfop: textoTag(prod, 'CFOP'),
      unidade: textoTag(prod, 'uCom'),
      quantidade: numeroTag(prod, 'qCom'),
      valorUnitario: numeroTag(prod, 'vUnCom'),
      valorTotal: numeroTag(prod, 'vProd'),
      codigoBarras: textoTag(prod, 'cEAN') || null,
    }
  })

  if (itens.length === 0) {
    throw new Error('Nenhum item (produto) encontrado nesta NF-e.')
  }

  return {
    chaveAcesso,
    numero: numeroTag(ide, 'nNF'),
    serie: textoTag(ide, 'serie'),
    dataEmissao: textoTag(ide, 'dhEmi') || textoTag(ide, 'dEmi'),
    emitenteNome: textoTag(emit, 'xNome'),
    emitenteCnpj: textoTag(emit, 'CNPJ'),
    valorTotal: numeroTag(total, 'vNF'),
    itens,
  }
}
