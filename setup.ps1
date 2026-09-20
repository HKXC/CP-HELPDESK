# CP-Helpdesk local setup (Windows PowerShell 5.1+).
# Works on the repo itself AND on an offline USB bundle made by make-bundle.ps1
# (same layout: repo files + helpdesk/node_modules, no secrets inside).
#
# Usage (run from repo/bundle root):
#   powershell -ExecutionPolicy Bypass -File setup.ps1
#   powershell -ExecutionPolicy Bypass -File setup.ps1 -SkipSeed -Start -Port 4503
#
# What it does:
#   1. checks Node 22 + npm
#   2. checks PostgreSQL reachable at localhost:5432 (Docker, native, or any local install)
#   3. creates helpdesk/.env from .env.example when missing (never prints secret values)
#   4. validates required env names are non-empty
#   5. runs `prisma migrate deploy`
#   6. runs `prisma db seed` (unless -SkipSeed)
#   7. with -Start: launches `next dev --port` detached and polls /api/health
param(
  [string]$BundleDir = "",
  [int]$Port = 0,
  [switch]$SkipSeed,
  [switch]$Start
)

$ErrorActionPreference = "Stop"

function Info($msg) { Write-Host "[setup] $msg" }
function Fail($msg) {
  Write-Host "[setup] ERROR: $msg" -ForegroundColor Red
  exit 1
}

# Root = repo root or bundle root (this script lives there).
$Root = if ($BundleDir -ne "") { $BundleDir } else { $PSScriptRoot }
$AppDir = Join-Path $Root "helpdesk"
if (-not (Test-Path -LiteralPath (Join-Path $AppDir "package.json"))) {
  Fail "helpdesk/package.json not found under '$Root'. Run from repo/bundle root or pass -BundleDir."
}

function Get-DotEnvValue($file, $name) {
  $line = Get-Content -LiteralPath $file -ErrorAction SilentlyContinue |
    Where-Object { $_ -match "^\s*$name\s*=" } | Select-Object -First 1
  if (-not $line) { return "" }
  $v = $line -replace "^\s*$name\s*=\s*", ""
  return $v.Trim().Trim('"').Trim("'")
}

function Test-Tcp($host_, $port, $ms = 3000) {
  $c = New-Object Net.Sockets.TcpClient
  try {
    $iar = $c.BeginConnect($host_, $port, $null, $null)
    return $iar.AsyncWaitHandle.WaitOne($ms)
  } catch { return $false } finally { $c.Close() }
}

# 1. Node 22 + npm -------------------------------------------------------
try { $nodeVer = (& node --version 2>$null) } catch { $nodeVer = $null }
if (-not $nodeVer -or $nodeVer -notmatch "^v(\d+)\.") {
  Fail "Node.js not found. Install Node 22.x LTS first (offline: carry the MSI on USB)."
}
if ([int]$Matches[1] -ne 22) {
  Fail "Node major version must be 22 (found $nodeVer). package.json engines requires 22.x."
}
try { (& npm --version 2>$null) | Out-Null } catch { Fail "npm not found." }
Info "Node $nodeVer OK."

# 2. PostgreSQL reachable -------------------------------------------------
if (-not (Test-Tcp "localhost" 5432)) {
  Fail "PostgreSQL not reachable at localhost:5432. Install/start it first (offline: EDB PostgreSQL 17 installer on USB, then re-run)."
}
Info "PostgreSQL at localhost:5432 reachable."

# 3. .env -----------------------------------------------------------------
$EnvFile = Join-Path $AppDir ".env"
$EnvExample = Join-Path $AppDir ".env.example"
if (-not (Test-Path -LiteralPath $EnvFile)) {
  if (-not (Test-Path -LiteralPath $EnvExample)) { Fail ".env missing and no .env.example template found." }
  Copy-Item -LiteralPath $EnvExample -Destination $EnvFile
  Info "Created helpdesk/.env from .env.example (demo passwords inside -- change them on shared machines)."
} else {
  Info "helpdesk/.env already exists -- keeping it (never overwritten)."
}

# 4. Required env names (values never printed) -----------------------------
foreach ($n in @("DATABASE_URL", "DIRECT_URL")) {
  if ([string]::IsNullOrWhiteSpace((Get-DotEnvValue $EnvFile $n))) {
    Fail "$n is empty in helpdesk/.env. Fill it in (local: same URL for both, password must match POSTGRES_PASSWORD)."
  }
}
if (-not $SkipSeed) {
  foreach ($n in @("SEED_ADMIN_PASSWORD", "SEED_TECH_PASSWORD", "SEED_USER_PASSWORD")) {
    if ([string]::IsNullOrWhiteSpace((Get-DotEnvValue $EnvFile $n))) {
      Fail "$n is empty in helpdesk/.env. Fill it in or re-run with -SkipSeed."
    }
  }
}
if (-not (Test-Path -LiteralPath (Join-Path $AppDir "node_modules"))) {
  Fail "helpdesk/node_modules missing. Online: run 'npm ci' in helpdesk/. Offline: copy node_modules from the bundle."
}

# 5. Port ------------------------------------------------------------------
if ($Port -eq 0) {
  $fromEnv = Get-DotEnvValue $EnvFile "PORT"
  $Port = 4502
  [void]([int]::TryParse($fromEnv, [ref]$Port))
  if ($Port -le 0) { $Port = 4502 }
}
Info "Using port $Port."

# 6. Migrate ---------------------------------------------------------------
Push-Location -LiteralPath $AppDir
try {
  Info "Running: npx prisma migrate deploy"
  & npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { Fail "prisma migrate deploy failed (exit $LASTEXITCODE). Check DATABASE_URL/DIRECT_URL credentials above match your Postgres password." }
  Info "Migrations up to date."
} finally { Pop-Location }

# 7. Seed -------------------------------------------------------------------
if (-not $SkipSeed) {
  Push-Location -LiteralPath $AppDir
  try {
    Info "Running: npx prisma db seed (idempotent -- skips tickets when rows exist)"
    & npx prisma db seed
    if ($LASTEXITCODE -ne 0) { Fail "prisma db seed failed (exit $LASTEXITCODE)." }
    Info "Seed OK. Login accounts: user@jp.local / tech@jp.local / admin@jp.local (passwords = SEED_* in your .env)."
  } finally { Pop-Location }
} else {
  Info "Seed skipped (-SkipSeed)."
}

# 8. Start (optional) --------------------------------------------------------
if ($Start) {
  $logDir = Join-Path $env:TEMP "opencode"
  if (-not (Test-Path -LiteralPath $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
  $log = Join-Path $logDir "dev-$Port.log"
  $busy = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($busy) { Fail "Port $Port is already in use. Stop the old server or pass -Port <free-port>." }
  Info "Starting dev server detached (log: $log)"
  Start-Process -FilePath "$env:COMSPEC" -ArgumentList "/c npx next dev --port $Port >> `"$log`" 2>&1" -WorkingDirectory $AppDir -WindowStyle Hidden
  $ready = $false
  for ($i = 0; $i -lt 24; $i++) {
    try {
      $r = Invoke-RestMethod -Uri "http://localhost:$Port/api/health" -TimeoutSec 5
      if ($r.status -eq "ok") { $ready = $true; break }
    } catch { Start-Sleep -Seconds 5 }
  }
  if (-not $ready) { Fail "Server did not become healthy in ~2 min. See tail of $log" }
  Info "READY: http://localhost:$Port -> /login (db: connected)"
} else {
  Info "Done. Start the web with:  cd helpdesk; npm run dev:4502   (or re-run setup with -Start)"
  Info "Then open http://localhost:$Port/login and check /api/health -> {status:ok, db:connected}"
}
