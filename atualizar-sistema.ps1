[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Atualizando Sistema Oficina"

Write-Host ""
Write-Host "=== Atualizando Sistema Oficina ===" -ForegroundColor Cyan
Write-Host ""

# 1. Encontra o zip mais recente baixado (aceita nomes com _1, _2 etc do navegador)
$zip = Get-ChildItem "$env:USERPROFILE\Downloads\oficina-sistema-completo*.zip" -ErrorAction SilentlyContinue |
       Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $zip) {
    Write-Host "Não encontrei nenhum arquivo 'oficina-sistema-completo*.zip' na pasta Downloads." -ForegroundColor Red
    Write-Host "Baixe o zip mais recente do Claude antes de rodar esta atualização." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Pressione ENTER para fechar"
    exit 1
}

Write-Host "Arquivo encontrado: $($zip.Name)" -ForegroundColor Gray
Write-Host "Data: $($zip.LastWriteTime)" -ForegroundColor Gray
Write-Host ""

# 2. Fecha o sistema, se estiver aberto
Write-Host "Fechando o sistema (se estiver aberto)..."
Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# 3. Extrai por cima da pasta atual (a pasta onde este script está)
$pastaProjeto = $PSScriptRoot
$pastaPai = Split-Path $pastaProjeto -Parent

Write-Host "Atualizando arquivos..."
Expand-Archive -Path $zip.FullName -DestinationPath $pastaPai -Force

# 4. Reinstala dependências e builda
Set-Location $pastaProjeto

Write-Host ""
Write-Host "Instalando dependências (pode levar um minuto)..." -ForegroundColor Cyan
npm install

Write-Host ""
Write-Host "Compilando o sistema..." -ForegroundColor Cyan
npm run build

Write-Host ""
Write-Host "=== Atualização concluída com sucesso! ===" -ForegroundColor Green
Write-Host "Pode abrir o atalho 'Sistema Oficina' na área de trabalho." -ForegroundColor Green
Write-Host ""
Read-Host "Pressione ENTER para fechar esta janela"
