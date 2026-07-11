// Vercel Serverless Function — proxy seguro para a API do Focus NFe.
//
// O token de acesso NUNCA fica no app (nem web, nem desktop). Ele fica só
// aqui, como variável de ambiente do servidor. O cliente (React) manda
// { metodo, caminho, corpo }, essa função repassa pro Focus NFe usando o
// token, e devolve a resposta. Assim o token nunca aparece no navegador,
// no DevTools, nem no código do Electron.
//
// Configuração necessária no painel da Vercel (Project Settings > Environment
// Variables):
//   FOCUS_NFE_TOKEN_HOMOLOGACAO = token gerado no Focus NFe (ambiente de testes)
//   FOCUS_NFE_TOKEN_PRODUCAO    = token gerado no Focus NFe (ambiente real)
//   VITE_PROXY_SHARED_KEY        = uma chave qualquer, escolhida por você (ex: gerada em
//                                  https://generate-secret.vercel.app/32), usada só pra
//                                  dificultar chamadas diretas de fora do próprio sistema.
//                                  Mesma variável usada tanto no servidor quanto no cliente
//                                  (o prefixo VITE_ é o que faz o Vite embutir o valor no
//                                  app React na hora do build — por isso só uma variável)
//   ALLOWED_ORIGIN               = URL onde o sistema está publicado (ex: https://sua-oficina.vercel.app)
//
// IMPORTANTE — limite real desta proteção: como o sistema não tem um login com sessão
// validada por servidor (o PIN é validado só no navegador/app), não existe como o
// servidor saber com certeza "qual usuário" está chamando. As duas checagens abaixo
// (chave compartilhada + origem) elevam bastante a barreira contra abuso oportunista
// (bots, scanners, gente que descobre a URL por acaso) — mas não substituem uma
// autenticação de verdade. Isso está documentado no manual do sistema, seção 8.2.

const BASE_URL = {
  homologacao: 'https://homologacao.focusnfe.com.br',
  producao: 'https://api.focusnfe.com.br',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido. Use POST.' })
    return
  }

  // Camada 1: chave compartilhada — o cliente precisa enviar o mesmo valor
  // configurado em PROXY_SHARED_KEY no servidor.
  const chaveEsperada = process.env.VITE_PROXY_SHARED_KEY
  if (chaveEsperada) {
    const chaveRecebida = req.headers['x-jucax-proxy-key']
    if (chaveRecebida !== chaveEsperada) {
      res.status(403).json({ erro: 'Acesso não autorizado a este proxy.' })
      return
    }
  }

  // Camada 2: origem da requisição — só aceita se vier do próprio domínio do sistema.
  const origemPermitida = process.env.ALLOWED_ORIGIN
  if (origemPermitida) {
    const origemRecebida = req.headers.origin || req.headers.referer || ''
    if (!origemRecebida.startsWith(origemPermitida)) {
      res.status(403).json({ erro: 'Origem não autorizada.' })
      return
    }
  }

  const { metodo, caminho, corpo, ambiente } = req.body || {}

  if (!metodo || !caminho) {
    res.status(400).json({ erro: 'Parâmetros "metodo" e "caminho" são obrigatórios.' })
    return
  }

  const ambienteEscolhido = ambiente === 'producao' ? 'producao' : 'homologacao'
  const token =
    ambienteEscolhido === 'producao'
      ? process.env.FOCUS_NFE_TOKEN_PRODUCAO
      : process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO

  if (!token) {
    res.status(500).json({
      erro: `Token do Focus NFe (${ambienteEscolhido}) não configurado no servidor. Configure a variável de ambiente na Vercel.`,
    })
    return
  }

  const url = `${BASE_URL[ambienteEscolhido]}${caminho}`
  const auth = Buffer.from(`${token}:`).toString('base64')

  try {
    const respostaFocus = await fetch(url, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: metodo === 'GET' || metodo === 'DELETE' ? undefined : JSON.stringify(corpo || {}),
    })

    const dados = await respostaFocus.json().catch(() => ({}))
    res.status(respostaFocus.status).json(dados)
  } catch (erro) {
    res.status(502).json({ erro: 'Não foi possível conectar ao Focus NFe.', detalhe: String(erro) })
  }
}
