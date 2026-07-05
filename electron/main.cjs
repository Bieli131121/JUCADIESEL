const { app, BrowserWindow } = require('electron')
const path = require('path')
const express = require('express')

const PORT = 34568 // porta dedicada deste projeto (PlacasFlow usa 34567)

function startServer() {
  const server = express()
  const distPath = path.join(__dirname, '..', 'dist')
  server.use(express.static(distPath))
  // SPA fallback
  server.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
  return server.listen(PORT)
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Sistema de Gestão - Oficina',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  win.loadURL(`http://localhost:${PORT}`)
}

app.whenReady().then(() => {
  startServer()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
