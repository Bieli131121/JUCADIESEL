import { useEffect, useState } from 'react'
import { getEmpresaConfig } from '@/lib/db'
import { gerarQRCodeDataUrl } from '@/lib/qrcode'
import { Placa } from '@/components/ui/Placa'
import type { OrdemServico, EmpresaConfig } from '@/types/database'
import { formatDate, formatMoney } from '@/lib/format'

export function ComprovanteImpressaoOS({ os }: { os: OrdemServico }) {
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  useEffect(() => {
    getEmpresaConfig().then(setEmpresa)
    const linkConsulta = `${window.location.origin}/aprovar/${os.token_aprovacao}`
    gerarQRCodeDataUrl(linkConsulta).then(setQrCodeUrl)
  }, [os.token_aprovacao])

  const servicos = (os.itens || []).filter((i) => i.tipo === 'servico')
  const pecas = (os.itens || []).filter((i) => i.tipo === 'peca')

  return (
    <div className="hidden print:block p-8 text-black bg-white text-sm">
      <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-4">
        <div className="flex items-center gap-3">
          {empresa?.logo_url && <img src={empresa.logo_url} className="h-14 object-contain" />}
          <div>
            <p className="font-bold text-lg">{empresa?.nome_fantasia || 'Oficina'}</p>
            {empresa?.razao_social && <p className="text-xs">{empresa.razao_social}</p>}
            {empresa?.cnpj && <p className="text-xs">CNPJ: {empresa.cnpj}</p>}
            <p className="text-xs">{empresa?.endereco} {empresa?.telefone && `· ${empresa.telefone}`}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-xl">OS #{os.numero}</p>
          <p className="text-xs">Emitida em {formatDate(os.data_orcamento)}</p>
          {qrCodeUrl && (
            <div className="mt-1">
              <img src={qrCodeUrl} className="w-20 h-20 ml-auto" />
              <p className="text-[9px] text-center mt-0.5">Consulte o status</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-4">
        <div>
          <p className="font-bold uppercase text-xs mb-1">Cliente</p>
          <p>{os.cliente?.nome}</p>
          <p>{os.cliente?.telefone}</p>
          <p>{os.cliente?.cpf_cnpj}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-xs mb-1">Veículo</p>
          <p>{os.veiculo && <Placa placa={os.veiculo.placa} />} {os.veiculo?.marca} {os.veiculo?.modelo} {os.veiculo?.ano}</p>
          <p>KM de entrada: {os.km_entrada?.toLocaleString('pt-BR') || '—'}</p>
        </div>
      </div>

      {os.defeito_relatado && (
        <div className="mb-4">
          <p className="font-bold uppercase text-xs mb-1">Defeito relatado</p>
          <p>{os.defeito_relatado}</p>
        </div>
      )}

      {servicos.length > 0 && (
        <div className="mb-3">
          <p className="font-bold uppercase text-xs mb-1">Serviços realizados</p>
          <table className="w-full text-xs border-collapse">
            <tbody>
              {servicos.map((item) => (
                <tr key={item.id} className="border-b border-gray-300">
                  <td className="py-1">{item.descricao}</td>
                  <td className="py-1 text-right w-24">{formatMoney(item.valor_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pecas.length > 0 && (
        <div className="mb-3">
          <p className="font-bold uppercase text-xs mb-1">Peças utilizadas</p>
          <table className="w-full text-xs border-collapse">
            <tbody>
              {pecas.map((item) => (
                <tr key={item.id} className="border-b border-gray-300">
                  <td className="py-1">{item.descricao}</td>
                  <td className="py-1 text-center w-16">{item.quantidade}x</td>
                  <td className="py-1 text-right w-24">{formatMoney(item.valor_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <table className="text-xs w-56">
          <tbody>
            {os.valor_desconto > 0 && (
              <tr>
                <td className="py-0.5">Desconto</td>
                <td className="py-0.5 text-right">-{formatMoney(os.valor_desconto)}</td>
              </tr>
            )}
            {os.valor_frete > 0 && (
              <tr>
                <td className="py-0.5">Frete</td>
                <td className="py-0.5 text-right">{formatMoney(os.valor_frete)}</td>
              </tr>
            )}
            <tr className="font-bold border-t border-black">
              <td className="py-1">Total</td>
              <td className="py-1 text-right">{formatMoney(os.valor_total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {os.garantia_dias && (
        <p className="text-xs mb-4">
          <strong>Garantia:</strong> {os.garantia_dias} dias
          {os.data_entrega &&
            ` (até ${formatDate(new Date(new Date(os.data_entrega).getTime() + os.garantia_dias * 86400000).toISOString())})`}
        </p>
      )}

      <div className="grid grid-cols-2 gap-8 mt-10 pt-4">
        <div className="text-center">
          {os.assinatura_url ? (
            <img src={os.assinatura_url} className="h-16 mx-auto object-contain" />
          ) : (
            <div className="h-16" />
          )}
          <div className="border-t border-black pt-1 mt-1">Assinatura do cliente</div>
        </div>
        <div className="text-center">
          <div className="h-16" />
          <div className="border-t border-black pt-1 mt-1">Responsável pela oficina</div>
        </div>
      </div>
    </div>
  )
}
