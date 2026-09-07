# Send one test email via Namecheap / SMTP using env vars or parameters.
# Usage (Private Email example):
#   .\scripts\test-smtp.ps1 `
#     -HostName mail.privateemail.com `
#     -Port 587 `
#     -User noreply@sheettomate.com `
#     -Pass "YOUR_MAILBOX_PASSWORD" `
#     -From "Sheettomate <noreply@sheettomate.com>" `
#     -To you@example.com
#
# Or set SMTP_* in the environment / .env and omit params.

param(
  [string]$HostName = $env:SMTP_HOST,
  [int]$Port = $(if ($env:SMTP_PORT) { [int]$env:SMTP_PORT } else { 587 }),
  [string]$User = $env:SMTP_USER,
  [string]$Pass = $env:SMTP_PASS,
  [string]$From = $(if ($env:SMTP_FROM) { $env:SMTP_FROM } else { "Sheettomate <noreply@sheettomate.com>" }),
  [Parameter(Mandatory = $true)]
  [string]$To,
  [switch]$Secure
)

$ErrorActionPreference = "Stop"

if (-not $HostName -or -not $User -or -not $Pass) {
  Write-Error "Need HostName, User, and Pass (or SMTP_HOST / SMTP_USER / SMTP_PASS)."
}

$secure = $Secure.IsPresent -or $env:SMTP_SECURE -eq "true" -or $Port -eq 465

Write-Host "Testing SMTP $HostName`:$Port as $User → $To (secure=$secure) ..." -ForegroundColor Cyan

$node = @"
const nodemailer = require('nodemailer');
async function main() {
  const transport = nodemailer.createTransport({
    host: process.env.T_HOST,
    port: Number(process.env.T_PORT),
    secure: process.env.T_SECURE === 'true',
    auth: { user: process.env.T_USER, pass: process.env.T_PASS },
  });
  await transport.verify();
  console.log('SMTP verify: OK');
  const info = await transport.sendMail({
    from: process.env.T_FROM,
    to: process.env.T_TO,
    subject: 'Sheettomate SMTP test',
    text: 'If you received this, Namecheap SMTP works for Sheettomate.',
    html: '<p>If you received this, <strong>Namecheap SMTP</strong> works for Sheettomate.</p>',
  });
  console.log('Sent messageId:', info.messageId);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
"@

$env:T_HOST = $HostName
$env:T_PORT = "$Port"
$env:T_SECURE = if ($secure) { "true" } else { "false" }
$env:T_USER = $User
$env:T_PASS = $Pass
$env:T_FROM = $From
$env:T_TO = $To

node -e $node
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Check inbox (and spam) for: $To" -ForegroundColor Green
