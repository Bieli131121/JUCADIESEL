import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { OrdemServico, Cliente, Veiculo, Peca, ContaReceber, ContaPagar } from '@/types/database'
import { formatDate, formatMoney } from '@/lib/format'

interface DadosRelatorio {
  nomeEmpresa: string
  os: OrdemServico[]
  clientes: Cliente[]
  veiculos: Veiculo[]
  pecas: Peca[]
  contasReceber: ContaReceber[]
  contasPagar: ContaPagar[]
  faturamentoTotal: number
  ticketMedio: number
  taxaConversao: number
  lucroEstimado: number
}

export function exportarRelatorioPDF(dados: DadosRelatorio) {
  const doc = new jsPDF()
  const dataGeracao = new Date().toLocaleString('pt-BR')

  doc.setFontSize(16)
  doc.text(dados.nomeEmpresa, 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Relatório gerado em ${dataGeracao}`, 14, 24)

  doc.setFontSize(12)
  doc.setTextColor(20)
  doc.text('Resumo geral', 14, 34)

  autoTable(doc, {
    startY: 38,
    head: [['Indicador', 'Valor']],
    body: [
      ['Total de clientes', String(dados.clientes.length)],
      ['Total de veículos', String(dados.veiculos.length)],
      ['Total de ordens de serviço', String(dados.os.length)],
      ['Faturamento total (OS entregues)', formatMoney(dados.faturamentoTotal)],
      ['Ticket médio', formatMoney(dados.ticketMedio)],
      ['Taxa de conversão (orçamento → aprovado)', `${dados.taxaConversao}%`],
      ['Lucro estimado (faturamento - custo peças - despesas)', formatMoney(dados.lucroEstimado)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [242, 96, 12] },
    styles: { fontSize: 9 },
  })

  let y = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.text('Ordens de serviço recentes', 14, y)
  autoTable(doc, {
    startY: y + 4,
    head: [['#', 'Cliente', 'Veículo', 'Status', 'Valor']],
    body: dados.os
      .slice(0, 20)
      .map((o) => [`#${o.numero}`, o.cliente?.nome || '—', `${o.veiculo?.marca || ''} ${o.veiculo?.modelo || ''}`, o.status, formatMoney(o.valor_total)]),
    theme: 'grid',
    headStyles: { fillColor: [45, 110, 142] },
    styles: { fontSize: 8 },
  })

  y = (doc as any).lastAutoTable.finalY + 10
  if (y > 250) {
    doc.addPage()
    y = 20
  }
  doc.setFontSize(12)
  doc.text('Financeiro — contas pendentes', 14, y)
  autoTable(doc, {
    startY: y + 4,
    head: [['Tipo', 'Descrição', 'Vencimento', 'Valor']],
    body: [
      ...dados.contasReceber
        .filter((c) => c.status === 'pendente')
        .map((c) => ['A receber', c.descricao, formatDate(c.data_vencimento), formatMoney(c.valor)]),
      ...dados.contasPagar
        .filter((c) => c.status === 'pendente')
        .map((c) => ['A pagar', c.descricao, formatDate(c.data_vencimento), formatMoney(c.valor)]),
    ],
    theme: 'grid',
    headStyles: { fillColor: [45, 110, 142] },
    styles: { fontSize: 8 },
  })

  y = (doc as any).lastAutoTable.finalY + 10
  if (y > 250) {
    doc.addPage()
    y = 20
  }
  doc.setFontSize(12)
  doc.text('Estoque — peças abaixo do mínimo', 14, y)
  autoTable(doc, {
    startY: y + 4,
    head: [['Peça', 'Código', 'Estoque', 'Mínimo']],
    body: dados.pecas
      .filter((p) => p.quantidade_estoque <= p.estoque_minimo)
      .map((p) => [p.nome, p.codigo || '—', String(p.quantidade_estoque), String(p.estoque_minimo)]),
    theme: 'grid',
    headStyles: { fillColor: [212, 68, 68] },
    styles: { fontSize: 8 },
  })

  doc.save(`relatorio-${new Date().toISOString().slice(0, 10)}.pdf`)
}

export function exportarRelatorioExcel(dados: DadosRelatorio) {
  const wb = XLSX.utils.book_new()

  const resumo = XLSX.utils.json_to_sheet([
    { Indicador: 'Total de clientes', Valor: dados.clientes.length },
    { Indicador: 'Total de veículos', Valor: dados.veiculos.length },
    { Indicador: 'Total de OS', Valor: dados.os.length },
    { Indicador: 'Faturamento total', Valor: dados.faturamentoTotal },
    { Indicador: 'Ticket médio', Valor: dados.ticketMedio },
    { Indicador: 'Taxa de conversão (%)', Valor: dados.taxaConversao },
    { Indicador: 'Lucro estimado', Valor: dados.lucroEstimado },
  ])
  XLSX.utils.book_append_sheet(wb, resumo, 'Resumo')

  const osSheet = XLSX.utils.json_to_sheet(
    dados.os.map((o) => ({
      Numero: o.numero,
      Cliente: o.cliente?.nome || '',
      Veiculo: `${o.veiculo?.marca || ''} ${o.veiculo?.modelo || ''}`.trim(),
      Placa: o.veiculo?.placa || '',
      Status: o.status,
      Valor: o.valor_total,
      DataOrcamento: formatDate(o.data_orcamento),
      DataEntrega: formatDate(o.data_entrega),
    }))
  )
  XLSX.utils.book_append_sheet(wb, osSheet, 'Ordens de Servico')

  const clientesSheet = XLSX.utils.json_to_sheet(
    dados.clientes.map((c) => ({
      Nome: c.nome,
      Telefone: c.telefone,
      Email: c.email || '',
      CPF_CNPJ: c.cpf_cnpj || '',
      Cidade: c.cidade || '',
      Estado: c.estado || '',
    }))
  )
  XLSX.utils.book_append_sheet(wb, clientesSheet, 'Clientes')

  const veiculosSheet = XLSX.utils.json_to_sheet(
    dados.veiculos.map((v) => ({
      Placa: v.placa,
      Marca: v.marca || '',
      Modelo: v.modelo,
      Ano: v.ano || '',
      KM: v.km_atual,
    }))
  )
  XLSX.utils.book_append_sheet(wb, veiculosSheet, 'Veiculos')

  const financeiroSheet = XLSX.utils.json_to_sheet([
    ...dados.contasReceber.map((c) => ({
      Tipo: 'A receber',
      Descricao: c.descricao,
      Valor: c.valor,
      Status: c.status,
      Vencimento: formatDate(c.data_vencimento),
    })),
    ...dados.contasPagar.map((c) => ({
      Tipo: 'A pagar',
      Descricao: c.descricao,
      Valor: c.valor,
      Status: c.status,
      Vencimento: formatDate(c.data_vencimento),
    })),
  ])
  XLSX.utils.book_append_sheet(wb, financeiroSheet, 'Financeiro')

  const estoqueSheet = XLSX.utils.json_to_sheet(
    dados.pecas.map((p) => ({
      Nome: p.nome,
      Codigo: p.codigo || '',
      Categoria: p.categoria || '',
      Estoque: p.quantidade_estoque,
      Minimo: p.estoque_minimo,
      PrecoCusto: p.preco_custo,
      PrecoVenda: p.preco_venda,
    }))
  )
  XLSX.utils.book_append_sheet(wb, estoqueSheet, 'Estoque')

  XLSX.writeFile(wb, `relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
