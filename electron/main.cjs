const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const express = require('express')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const PORT = 34568
const ARQUIVO_ESTADO_JANELA = path.join(app.getPath('userData'), 'window-state.json')

const FOCUS_NFE_BASE_URL = {
  homologacao: 'https://homologacao.focusnfe.com.br',
  producao: 'https://api.focusnfe.com.br',
}

// ---------- Instância única (evita abrir o app duas vezes e dar conflito de porta) ----------
const obteveLock = app.requestSingleInstanceLock()
if (!obteveLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const janelas = BrowserWindow.getAllWindows()
    if (janelas.length > 0) {
      const win = janelas[0]
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

// ---------- Persistência de tamanho/posição da janela ----------
function carregarEstadoJanela() {
  try {
    const raw = fs.readFileSync(ARQUIVO_ESTADO_JANELA, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { width: 1280, height: 800 }
  }
}

function salvarEstadoJanela(win) {
  if (!win || win.isDestroyed()) return
  const bounds = win.getBounds()
  try {
    fs.writeFileSync(ARQUIVO_ESTADO_JANELA, JSON.stringify(bounds))
  } catch {
    // não crítico
  }
}

function startServer() {
  const server = express()
  server.use(express.json())
  const distPath = path.join(__dirname, '..', 'dist')
  server.use(express.static(distPath))

  // Mesma rota de proxy usada na versão web (api/focus-nfe.js), replicada aqui
  // para o desktop funcionar de forma independente. O token nunca fica no
  // renderer (React) — só neste processo principal, lido de um arquivo .env
  // local que NÃO deve ser commitado no Git.
  server.post('/api/focus-nfe', async (req, res) => {
    // Mesma proteção por chave compartilhada usada na versão web (ver api/focus-nfe.js).
    // Aqui o risco já é bem menor — esse servidor só escuta em localhost, então só um
    // processo rodando na própria máquina consegue chamar essa rota — mas mantemos a
    // mesma checagem por consistência e defesa em profundidade.
    const chaveEsperada = process.env.VITE_PROXY_SHARED_KEY
    if (chaveEsperada && req.headers['x-jucax-proxy-key'] !== chaveEsperada) {
      return res.status(403).json({ erro: 'Acesso não autorizado a este proxy.' })
    }

    const { metodo, caminho, corpo, ambiente } = req.body || {}
    if (!metodo || !caminho) {
      return res.status(400).json({ erro: 'Parâmetros "metodo" e "caminho" são obrigatórios.' })
    }
    const ambienteEscolhido = ambiente === 'producao' ? 'producao' : 'homologacao'
    const token =
      ambienteEscolhido === 'producao'
        ? process.env.FOCUS_NFE_TOKEN_PRODUCAO
        : process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO

    if (!token) {
      return res.status(500).json({
        erro: `Token do Focus NFe (${ambienteEscolhido}) não configurado. Crie um arquivo .env na raiz do projeto com FOCUS_NFE_TOKEN_${ambienteEscolhido.toUpperCase()}=seu_token`,
      })
    }

    const url = `${FOCUS_NFE_BASE_URL[ambienteEscolhido]}${caminho}`
    const auth = Buffer.from(`${token}:`).toString('base64')

    try {
      const respostaFocus = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
        body: metodo === 'GET' || metodo === 'DELETE' ? undefined : JSON.stringify(corpo || {}),
      })
      const dados = await respostaFocus.json().catch(() => ({}))
      res.status(respostaFocus.status).json(dados)
    } catch (erro) {
      res.status(502).json({ erro: 'Não foi possível conectar ao Focus NFe.', detalhe: String(erro) })
    }
  })

  server.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
  return server.listen(PORT)
}

function createSplash() {
  const splash = new BrowserWindow({
    width: 340,
    height: 340,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: { contextIsolation: true },
  })
  splash.loadFile(path.join(__dirname, 'splash.html'))
  return splash
}

function createMainWindow() {
  const estado = carregarEstadoJanela()

  const win = new BrowserWindow({
    width: estado.width,
    height: estado.height,
    x: estado.x,
    y: estado.y,
    show: false,
    title: 'Sistema de Gestão - Oficina',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  win.on('resize', () => salvarEstadoJanela(win))
  win.on('move', () => salvarEstadoJanela(win))

  win.loadURL(`http://localhost:${PORT}`)
  return win
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  startServer()

  const splash = createSplash()
  const mainWindow = createMainWindow()

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      splash.close()
      mainWindow.maximize()
      mainWindow.show()
      verificarAtualizacoes()
    }, 600) // pequeno delay pra transição não parecer abrupta
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ---------- Atualizações automáticas ----------
// Preparado para publicar releases no GitHub (Bieli131121/JUCADIESEL) via
// electron-builder. Só funciona em builds empacotados (app.isPackaged) e
// nunca trava o app se não houver internet ou release publicada ainda.
function verificarAtualizacoes() {
  if (!app.isPackaged) return
  try {
    const { autoUpdater } = require('electron-updater')
    autoUpdater.checkForUpdatesAndNotify().catch(() => {
      // silencioso: sem internet ou sem release publicada ainda
    })
  } catch {
    // electron-updater não configurado ainda, sem problema
  }
}
