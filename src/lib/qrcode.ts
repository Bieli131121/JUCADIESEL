import QRCode from 'qrcode'

export async function gerarQRCodeDataUrl(texto: string): Promise<string> {
  return QRCode.toDataURL(texto, {
    width: 160,
    margin: 1,
    color: { dark: '#14161A', light: '#FFFFFF' },
  })
}
