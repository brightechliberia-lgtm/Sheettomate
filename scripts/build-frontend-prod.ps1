# Build the React app for Namecheap (or any static host).
# Usage:
#   .\scripts\build-frontend-prod.ps1 -ApiUrl "https://api.sheettomate.com/api"
#   .\scripts\build-frontend-prod.ps1 -ApiUrl "https://sheettomate-api.onrender.com/api"
#
# Then upload the folder deploy/frontend/* to cPanel public_html

param(
  [Parameter(Mandatory = $true)]
  [string]$ApiUrl
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if ($ApiUrl -notmatch '/api/?$') {
  Write-Host "Tip: ApiUrl should end with /api (got: $ApiUrl)" -ForegroundColor Yellow
}

Write-Host "Building shared + client with VITE_API_URL=$ApiUrl ..." -ForegroundColor Cyan
$env:VITE_API_URL = $ApiUrl

npm run build -w shared
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm run build -w client
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$out = Join-Path $root "deploy\frontend"
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Path $out | Out-Null
Copy-Item -Path (Join-Path $root "client\dist\*") -Destination $out -Recurse

$htaccess = @"
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
"@
Set-Content -Path (Join-Path $out ".htaccess") -Value $htaccess -Encoding Ascii

Write-Host ""
Write-Host "Done. Upload everything inside:" -ForegroundColor Green
Write-Host "  $out"
Write-Host "to your Namecheap cPanel → public_html"
Write-Host ""
