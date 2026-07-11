// Separado de components/ui/Pagination.tsx de propósito: misturar uma função
// utilitária no mesmo arquivo de um componente React atrapalha o Fast Refresh
// (o hot-reload some/reseta o estado da tela toda vez que o arquivo muda).
export function paginar<T>(itens: T[], paginaAtual: number, itensPorPagina: number): T[] {
  const inicio = (paginaAtual - 1) * itensPorPagina
  return itens.slice(inicio, inicio + itensPorPagina)
}
