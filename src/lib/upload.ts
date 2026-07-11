import { supabase, supabaseConfigured } from './supabase'

const BUCKET = 'oficina-uploads'

// Comprime a imagem no próprio navegador antes de enviar — reduz tamanho
// de arquivo (fotos de celular costumam vir com 3-8MB) sem precisar de
// nenhuma biblioteca externa, usando canvas nativo.
function comprimirImagem(arquivo: File, larguraMaxima = 1280, qualidade = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const leitor = new FileReader()

    leitor.onload = () => {
      img.onload = () => {
        const escala = Math.min(1, larguraMaxima / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * escala
        canvas.height = img.height * escala

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem.'))
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Não foi possível comprimir a imagem.'))
          },
          'image/jpeg',
          qualidade
        )
      }
      img.onerror = () => reject(new Error('Arquivo de imagem inválido.'))
      img.src = leitor.result as string
    }
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    leitor.readAsDataURL(arquivo)
  })
}

function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result as string)
    leitor.onerror = () => reject(new Error('Não foi possível converter a imagem.'))
    leitor.readAsDataURL(blob)
  })
}

// Faz upload de uma imagem (com compressão automática). No modo Supabase,
// sobe pro Storage e retorna a URL pública. No modo local, converte pra
// base64 e guarda direto (funciona, mas deixa o localStorage mais pesado —
// por isso a compressão é importante nos dois casos).
export async function uploadImagem(arquivo: File, pasta: string): Promise<string> {
  if (!arquivo.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem (JPG, PNG, WEBP).')
  }

  const comprimida = await comprimirImagem(arquivo)

  if (supabaseConfigured) {
    const nomeArquivo = `${pasta}/${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from(BUCKET).upload(nomeArquivo, comprimida, {
      contentType: 'image/jpeg',
      upsert: false,
    })
    if (error) {
      throw new Error(
        `Não foi possível enviar a imagem (${error.message}). Verifique se o bucket "${BUCKET}" existe no Supabase Storage e está com acesso público de leitura.`
      )
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(nomeArquivo)
    return data.publicUrl
  }

  return blobParaDataUrl(comprimida)
}
