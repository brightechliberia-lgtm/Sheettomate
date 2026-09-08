# Build production frontend and upload to Namecheap public_html via FTP.
#
# Setup (once):
#   Edit env.deploy in the project root (FTP_HOST / FTP_USER / FTP_PASS)
#
# Usage:
#   .\scripts\deploy-frontend.ps1
#   .\scripts\deploy-frontend.ps1 -ApiUrl "https://api.sheettomate.com/api"
#   .\scripts\deploy-frontend.ps1 -SkipBuild   # upload last build only

param(
  [string]$ApiUrl = "",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$deployEnv = Join-Path $root "env.deploy"
if (-not (Test-Path $deployEnv)) {
  $deployEnv = Join-Path $root ".env.deploy"
}
if (-not (Test-Path $deployEnv)) {
  Write-Host "Missing env.deploy — create it from .env.deploy.example and add FTP credentials." -ForegroundColor Red
  exit 1
}

# Load VITE_API_URL from .env.deploy if -ApiUrl not passed
if (-not $ApiUrl) {
  $line = Get-Content $deployEnv | Where-Object { $_ -match '^\s*VITE_API_URL\s*=' } | Select-Object -First 1
  if ($line -match '^\s*VITE_API_URL\s*=\s*(.+)\s*$') {
    $ApiUrl = $Matches[1].Trim().Trim('"').Trim("'")
  }
}
if (-not $ApiUrl) {
  $ApiUrl = "https://api.sheettomate.com/api"
}

if (-not $SkipBuild) {
  & (Join-Path $PSScriptRoot "build-frontend-prod.ps1") -ApiUrl $ApiUrl
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Uploading via FTP ..." -ForegroundColor Cyan
node (Join-Path $PSScriptRoot "deploy-frontend-ftp.mjs")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Live site should be updated: https://sheettomate.com" -ForegroundColor Green
