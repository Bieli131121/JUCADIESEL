// Roda automaticamente após "npm install" (hook "postinstall" no package.json).
// Cria o arquivo .bat que abre o sistema e o atalho na área de trabalho,
// sem precisar de nenhum comando manual no PowerShell.
//
// Só faz algo no Windows. Em outros sistemas, não faz nada (sai em silêncio).

const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

if (process.platform !== 'win32') {
  process.exit(0)
}

const RAIZ_PROJETO = path.resolve(__dirname, '..')
const CAMINHO_BAT = path.join(RAIZ_PROJETO, 'abrir-sistema.bat')
const CAMINHO_ICONE = path.join(RAIZ_PROJETO, 'build', 'icon.ico')
const NOME_ATALHO = 'Sistema Oficina.lnk'

function criarBat() {
  const conteudo = [
    '@echo off',
    'cd /d %~dp0',
    '.\\node_modules\\.bin\\electron.cmd .\\electron\\main.cjs',
    '',
  ].join('\r\n')
  fs.writeFileSync(CAMINHO_BAT, conteudo, 'utf-8')
}

function criarAtalhoDesktop() {
  // Gera um script VBS temporário que cria o atalho (.lnk), e roda ele com
  // cscript. Importante: perguntamos a pasta Desktop ao próprio Windows via
  // oWS.SpecialFolders("Desktop") em vez de montar o caminho manualmente —
  // isso resolve corretamente o caso de o Desktop estar redirecionado pelo
  // OneDrive (comum em contas corporativas/pessoais com sincronização ativa).
  const vbsTemp = path.join(os.tmpdir(), `criar-atalho-oficina-${Date.now()}.vbs`)
  const iconeExiste = fs.existsSync(CAMINHO_ICONE)

  const linhasVbs = [
    'Set oWS = WScript.CreateObject("WScript.Shell")',
    'strDesktop = oWS.SpecialFolders("Desktop")',
    `Set oLink = oWS.CreateShortcut(strDesktop & "\\${NOME_ATALHO}")`,
    `oLink.TargetPath = "${CAMINHO_BAT.replace(/\\/g, '\\\\')}"`,
    `oLink.WorkingDirectory = "${RAIZ_PROJETO.replace(/\\/g, '\\\\')}"`,
    iconeExiste ? `oLink.IconLocation = "${CAMINHO_ICONE.replace(/\\/g, '\\\\')}"` : '',
    'oLink.WindowStyle = 7',
    'oLink.Save',
    'WScript.Echo strDesktop',
  ].filter(Boolean)

  fs.writeFileSync(vbsTemp, linhasVbs.join('\r\n'), 'utf-8')

  try {
    const saida = execSync(`cscript //nologo "${vbsTemp}"`).toString().trim()
    fs.unlinkSync(vbsTemp)
    return saida
  } catch (erro) {
    fs.unlinkSync(vbsTemp)
    throw erro
  }
}

try {
  criarBat()
  const pastaUsada = criarAtalhoDesktop()
  console.log(`\n✔ Atalho "Sistema Oficina" criado em: ${pastaUsada}\n`)
} catch (erro) {
  console.warn('\n⚠ Não foi possível criar o atalho automaticamente:', erro.message)
  console.warn('  Você ainda pode abrir o sistema rodando: npm run electron\n')
}
