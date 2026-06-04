$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$nodeDir = Join-Path $root '.tools\node'
$node = Join-Path $nodeDir 'node.exe'
$pnpm = Join-Path $root '.tools\pnpm\package\bin\pnpm.cjs'
$url = 'http://127.0.0.1:5197/'

if (-not (Test-Path -LiteralPath $node)) {
  Write-Host 'Node portatil nao encontrado em .tools\node.' -ForegroundColor Red
  Write-Host 'Abra o projeto no Codex e peca para preparar o runtime novamente.'
  exit 1
}

if (-not (Test-Path -LiteralPath $pnpm)) {
  Write-Host 'PNPM portatil nao encontrado em .tools\pnpm.' -ForegroundColor Red
  exit 1
}

$env:PATH = "$nodeDir;$env:PATH"

$existingServer = Get-NetTCPConnection -LocalPort 5197 -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq 'Listen' }

if ($existingServer) {
  Write-Host "Servidor ja esta rodando em $url"
  Start-Process $url
  exit 0
}

if (-not (Test-Path -LiteralPath (Join-Path $root 'node_modules\.bin\vite.CMD'))) {
  Write-Host 'Instalando dependencias do projeto...'
  & $node $pnpm install
}

Start-Process -FilePath 'powershell.exe' `
  -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', "Start-Sleep -Seconds 3; Start-Process '$url'") `
  -WindowStyle Hidden

Write-Host "Servidor iniciando em $url"
Write-Host 'Deixe esta janela aberta enquanto joga. Ctrl+C encerra o servidor.'
& $node $pnpm run dev
