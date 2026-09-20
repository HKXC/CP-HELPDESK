# CP-Helpdesk offline USB bundle maker (run on the ONLINE machine, Windows PowerShell 5.1+).
# Packs: tracked repo files (worktree versions) + helpdesk/node_modules
#        + manifest + README-OFFLINE.txt. NEVER packs real secrets
#        (helpdesk/.env and .env.local are always excluded).
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File make-bundle.ps1
#   powershell -ExecutionPolicy Bypass -File make-bundle.ps1 -OutDir D:\HELPDESK-bundle -Zip
param(
  [string]$OutDir = "",
  [switch]$Zip,
  [switch]$SkipNodeModules
)

$ErrorActionPreference = "Stop"

function Info($msg) { Write-Host "[bundle] $msg" }
function Fail($msg) {
  Write-Host "[bundle] ERROR: $msg" -ForegroundColor Red
  exit 1
}

$RepoRoot = $PSScriptRoot
if ($OutDir -eq "") { $OutDir = Join-Path $env:TEMP "opencode\helpdesk-bundle" }

# Safety: never build the bundle inside the repo (would recurse on re-runs).
$fullOut = [IO.Path]::GetFullPath($OutDir)
$fullRepo = [IO.Path]::GetFullPath($RepoRoot)
if ($fullOut.StartsWith($fullRepo, [StringComparison]::OrdinalIgnoreCase)) {
  Fail "OutDir must be OUTSIDE the repo (got '$OutDir'). Example: -OutDir D:\HELPDESK-bundle"
}

try { (& git --version 2>$null) | Out-Null } catch { Fail "git not found." }
$nmDir = Join-Path $RepoRoot "helpdesk\node_modules"
if (-not (Test-Path -LiteralPath $nmDir)) {
  Fail "helpdesk/node_modules missing. Run 'npm ci' in helpdesk/ first (needs internet), then re-run."
}
if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot "helpdesk\node_modules\.prisma"))) {
  Fail "Prisma client not generated. Run 'npx prisma generate' in helpdesk/ first, then re-run."
}

$head = (& git -C $RepoRoot rev-parse HEAD).Trim()
$branch = (& git -C $RepoRoot branch --show-current).Trim()
$dirty = ((& git -C $RepoRoot status --porcelain | Measure-Object).Count)
$stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
Info "Packing HEAD $head (branch $branch) -> $OutDir"

if ($SkipNodeModules) {
  if (-not (Test-Path -LiteralPath $OutDir)) { Fail "-SkipNodeModules given but OutDir '$OutDir' does not exist. Run once without it first." }
  Info "Reusing OutDir (tracked files + docs refreshed, node_modules kept)."
} else {
  if (Test-Path -LiteralPath $OutDir) {
    Info "OutDir exists -- clearing it."
    Remove-Item -LiteralPath $OutDir -Recurse -Force
  }
  New-Item -ItemType Directory -Path $OutDir | Out-Null
}

# 1. Tracked files (worktree versions = what actually runs here), minus real secrets.
$excluded = @("helpdesk/.env", "helpdesk/.env.local")
$files = (& git -C $RepoRoot ls-files -z) -split "`0" | Where-Object { $_ -ne "" }
$copied = 0
foreach ($f in $files) {
  $rel = $f -replace "/", "\"
  if ($excluded -contains $f) { Info "Skip secret: $f"; continue }
  $src = Join-Path $RepoRoot $rel
  if (-not (Test-Path -LiteralPath $src)) { Info "Skip missing (uncommitted delete?): $f"; continue }
  $dst = Join-Path $OutDir $rel
  $dstDir = Split-Path -Parent $dst
  if (-not (Test-Path -LiteralPath $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
  Copy-Item -LiteralPath $src -Destination $dst -Force
  $copied++
}
# The setup scripts themselves are new/untracked by design (target needs them) — copy explicitly.
foreach ($s in @("setup.ps1", "make-bundle.ps1")) {
  $src = Join-Path $RepoRoot $s
  if (Test-Path -LiteralPath $src) {
    Copy-Item -LiteralPath $src -Destination (Join-Path $OutDir $s) -Force
    $copied++
  }
}
Info "Copied $copied tracked files."

# Sanity: template must be present, real secrets must be absent.
if (-not (Test-Path -LiteralPath (Join-Path $OutDir "helpdesk\.env.example"))) { Fail "helpdesk/.env.example missing from bundle -- aborting." }
foreach ($s in @("helpdesk\.env", "helpdesk\.env.local")) {
  if (Test-Path -LiteralPath (Join-Path $OutDir $s)) { Fail "Secret leaked into bundle: $s -- aborting." }
}
Info "Secret check passed (.env.example in, real .env out)."

# 2. node_modules (carries deps + generated Prisma engines, so target needs no internet).
$nmDst = Join-Path $OutDir "helpdesk\node_modules"
if ($SkipNodeModules) {
  if (-not (Test-Path -LiteralPath $nmDst)) { Fail "-SkipNodeModules given but $nmDst does not exist." }
  Info "Reusing existing node_modules copy."
} else {
  Info "Copying helpdesk/node_modules (this takes a while)..."
  $robolog = Join-Path $env:TEMP "opencode\bundle-robocopy.log"
  & robocopy $nmDir $nmDst /E /MT:8 /R:2 /W:1 /NJH /NJS /NDL /NFL /NP /LOG:$robolog | Out-Null
  if ($LASTEXITCODE -ge 8) { Fail "robocopy failed (exit $LASTEXITCODE). Re-run (it resumes) or see $robolog" }
}
$nmCount = (Get-ChildItem -LiteralPath (Join-Path $OutDir "helpdesk\node_modules") -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
Info "node_modules copied ($nmCount files)."

# 3. Manifest --------------------------------------------------------------
$nodeVer = (& node --version).Trim()
$manifest = @(
  "CP-Helpdesk offline bundle manifest",
  "Built      : $stamp (local time, online machine)",
  "Git HEAD   : $head",
  "Git branch : $branch",
  "Worktree   : $dirty uncommitted path(s), packed as-is (setup/seed stay idempotent)",
  "Node       : $nodeVer (target needs Node 22.x)",
  "Files      : $copied tracked files + $nmCount node_modules files (worktree versions)",
  "Secrets    : NONE (helpdesk/.env and .env.local excluded by design; target creates its own via setup.ps1)"
)
$manifest | Set-Content -LiteralPath (Join-Path $OutDir "bundle-manifest.txt") -Encoding UTF8
Info "Wrote bundle-manifest.txt."

# 4. README-OFFLINE.txt ------------------------------------------------------
$readme = @(
  "CP-HELPDESK -- OFFLINE install (no internet on target) - $stamp",
  "Bundle git HEAD: $head",
  "",
  "A. WHAT TO CARRY ON USB",
  "  1. This bundle folder (repo files + helpdesk/node_modules, NO secrets inside).",
  "  2. Node.js 22.x LTS installer for Windows x64 (nodejs.org, file: node-v22.*-x64.msi).",
  "  3. PostgreSQL 17 installer for Windows x64 (enterprisedb.com, file: postgresql-17.*-windows-x64.exe).",
  "",
  "B. INSTALL ON TARGET (needs admin for the two installers)",
  "  1. Install Node 22 LTS, then PostgreSQL 17.",
  "     - Remember the postgres SUPERUSER password you set in the installer.",
  "     - Keep defaults otherwise (port 5432).",
  "  2. In pgAdmin (or psql as postgres superuser) run:",
  "       CREATE USER helpdesk WITH PASSWORD '[pick-a-password]';",
  "       CREATE DATABASE helpdesk OWNER helpdesk;",
  "  3. Copy this bundle folder to the target, e.g. D:\HELPDESK_004",
  "",
  "C. SETUP + RUN (no internet needed)",
  "  1. powershell -ExecutionPolicy Bypass -File setup.ps1",
  "     - Creates helpdesk/.env from .env.example on first run.",
  "     - Then EDIT helpdesk/.env: set POSTGRES_PASSWORD to the password from step B2,",
  "       and make DATABASE_URL/DIRECT_URL use the same password:",
  "         DATABASE_URL=postgresql://helpdesk:<same-password>@localhost:5432/helpdesk?schema=public",
  "     - Re-run:  powershell -ExecutionPolicy Bypass -File setup.ps1 -Start",
  "  2. Open http://localhost:4502/login",
  "     - Accounts: user@jp.local / tech@jp.local / admin@jp.local",
  "     - Passwords: the SEED_*_PASSWORD values in YOUR helpdesk/.env",
  "  3. Health check: http://localhost:4502/api/health -> {status:ok, db:connected}",
  "",
  "D. NOTES",
  "  - .env is per-machine and never copied: each machine creates its own.",
  "  - Attachments live in helpdesk/uploads/ (not in git): copy that folder too if you need old files.",
  "  - Moving the database itself: backup/restore with pgAdmin (backup .backup file on USB).",
  "  - If port 4502 is taken: setup.ps1 -Start -Port 4503",
  "  - Troubleshooting: wrong DB password -> migrate step fails loudly; fix .env and re-run.",
  "    Missing tables -> you skipped step B2/C1; re-run setup.ps1 (it is idempotent)."
)
$readme | Set-Content -LiteralPath (Join-Path $OutDir "README-OFFLINE.txt") -Encoding UTF8
Info "Wrote README-OFFLINE.txt."

# 5. Optional zip -------------------------------------------------------------
if ($Zip) {
  $zipPath = "$fullOut.zip"
  if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
  Info "Zipping bundle (slow for node_modules)..."
  Compress-Archive -LiteralPath $OutDir -DestinationPath $zipPath
  Info "Zip ready: $zipPath"
}

Info "BUNDLE READY at $OutDir -- copy it to USB with the two installers (see README-OFFLINE.txt section A)."
