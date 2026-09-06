# Start portable Postgres (if installed) then the Sheettomate dev servers.
$ErrorActionPreference = "Stop"
$base = Join-Path $env:LOCALAPPDATA "Sheetomate"
$pgsql = Join-Path $base "pgsql"
$data = Join-Path $base "pgdata"
$pgCtl = Join-Path $pgsql "bin\pg_ctl.exe"

if (Test-Path $pgCtl) {
  & $pgCtl -D $data status 2>$null
  if ($LASTEXITCODE -ne 0) {
    & $pgCtl -D $data -l (Join-Path $base "pg.log") start
  }
} else {
  Write-Host "Portable Postgres not found at $pgsql. Start PostgreSQL yourself, then re-run this script."
}

Set-Location (Split-Path $PSScriptRoot -Parent)
npm run dev
