@echo off
rem CP Helpdesk boot script (ASCII-only: must stay plain ASCII so cmd.exe
rem parses it identically on any Windows codepage, with or without BOM).
setlocal EnableDelayedExpansion
cd /d "E:\HELPDESK 004\helpdesk"
if not exist logs mkdir logs
set LOG=logs\run-4502.log
echo [%date% %time%] ===== CP Helpdesk boot =====>> "%LOG%"

echo.
echo  ===== CP HELPDESK =====
echo  Repair ticket system (TH)
echo  http://localhost:4502
echo.

echo [1/5] Checking node/npm...
where node >nul 2>nul
if errorlevel 1 (
  echo [ERR] node not found in PATH - install Node.js LTS first >> "%LOG%"
  echo [ERR] node not found in PATH - install Node.js LTS first
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERR] npm not found in PATH >> "%LOG%"
  echo [ERR] npm not found in PATH
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo [OK] node %%v
echo [OK] node/npm ready >> "%LOG%"

echo [2/5] Checking DATABASE_URL + migrations...
findstr /R /C:"^DATABASE_URL=" .env >nul 2>nul
if errorlevel 1 (
  echo [ERR] DATABASE_URL missing in helpdesk\.env - configure it first >> "%LOG%"
  echo [ERR] DATABASE_URL missing in helpdesk\.env - configure it first
  pause
  exit /b 1
)
echo [OK] DATABASE_URL found >> "%LOG%"
call npx prisma migrate status >> "%LOG%" 2>&1
if errorlevel 1 (
  echo [ERR] prisma migrate status failed - pending migration or DB unreachable, see %LOG% >> "%LOG%"
  echo [ERR] prisma migrate status failed - pending migration or DB unreachable, see logs\run-4502.log
  pause
  exit /b 1
)
echo [OK] migrations up to date >> "%LOG%"

echo [3/5] Checking port 4502...
set STALE=
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":4502" ^| findstr "LISTENING"') do set STALE=%%p
if defined STALE (
  echo [WARN] stale node PID %STALE% on 4502 - killing it first >> "%LOG%"
  echo [WARN] stale node PID %STALE% on 4502 - killing it first
  taskkill /F /PID %STALE% >nul 2>nul
  timeout /t 3 /nobreak >nul
)

echo [4/5] Starting server (log: %LOG%)...
start "CP Helpdesk :4502" cmd /c "npm run dev:4502 >> logs\run-4502.log 2>&1"

echo [5/5] Waiting for server Ready (max 120 seconds)...
set READY=
for /l %%i in (1,1,60) do (
  for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":4502" ^| findstr "LISTENING"') do set READY=%%p
  if defined READY goto :health
  timeout /t 2 /nobreak >nul
)
echo [ERR] server not Ready in 120 seconds - see %LOG% >> "%LOG%"
echo [ERR] server not Ready in 120 seconds - see %LOG%
pause
exit /b 1

:health
echo [OK] port 4502 LISTENING (PID %READY%) - checking /api/health >> "%LOG%"
powershell -NoProfile -Command "for ($i=0; $i -lt 30; $i++) { try { $r = Invoke-WebRequest -UseBasicParsing http://localhost:4502/api/health -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Seconds 2 }; exit 1"
if errorlevel 1 (
  echo [ERR] /api/health not ok in 60 seconds - DB may be down, see %LOG% >> "%LOG%"
  echo [ERR] /api/health not ok in 60 seconds - DB may be down, see logs\run-4502.log
  pause
  exit /b 1
)
echo [OK] /api/health ok >> "%LOG%"
echo [OK] Server Ready - opening browser http://localhost:4502
start http://localhost:4502
echo.
echo Press any key to close this window (the server keeps running in its own window).
pause
