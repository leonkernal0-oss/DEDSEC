# RemoteDesk Setup Script
# Run this on each PC you want to control remotely
# Right-click this file → "Run with PowerShell"

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host ""
    Write-Host "  [ERROR] This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host "  Please right-click and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit
}

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                                                      ║" -ForegroundColor Cyan
Write-Host "  ║         RemoteDesk - Device Setup                    ║" -ForegroundColor Cyan
Write-Host "  ║         ~~~~~~~~~~~~~~~~~~~~~                        ║" -ForegroundColor Cyan
Write-Host "  ║   This will set up your PC for remote control        ║" -ForegroundColor Cyan
Write-Host "  ║   via truededsec.netlify.app                         ║" -ForegroundColor Cyan
Write-Host "  ║                                                      ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Create install directory
$installDir = "C:\RemoteDesk"
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}

Write-Host "  [1/5] Installing Chocolatey (package manager)..." -ForegroundColor Yellow
try {
    if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        Write-Host "  [OK] Chocolatey installed" -ForegroundColor Green
    } else {
        Write-Host "  [OK] Chocolatey already installed" -ForegroundColor Green
    }
} catch {
    Write-Host "  [WARN] Could not install Chocolatey. Continuing anyway..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  [2/5] Installing TightVNC Server..." -ForegroundColor Yellow
try {
    if (-not (Test-Path "C:\Program Files\TightVNC")) {
        choco install tightvnc -y --force
        Write-Host "  [OK] TightVNC installed" -ForegroundColor Green
    } else {
        Write-Host "  [OK] TightVNC already installed" -ForegroundColor Green
    }
    
    # Start TightVNC service
    Start-Service tvnserver -ErrorAction SilentlyContinue
    Write-Host "  [OK] TightVNC service started" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Could not install TightVNC: $_" -ForegroundColor Red
    Write-Host "  Trying manual download..." -ForegroundColor Yellow
    
    # Download manually
    $vncUrl = "https://www.tightvnc.com/download/2.8.85/tightvnc-2.8.85-gpl-setup-64bit.msi"
    $vncInstaller = "$installDir\tightvnc.msi"
    Invoke-WebRequest -Uri $vncUrl -OutFile $vncInstaller
    Start-Process msiexec.exe -ArgumentList "/i `"$vncInstaller`" /quiet /norestart" -Wait
    Write-Host "  [OK] TightVNC installed manually" -ForegroundColor Green
}

Write-Host ""
Write-Host "  [3/5] Installing Python and Websockify..." -ForegroundColor Yellow
try {
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        choco install python3 -y
        Write-Host "  [OK] Python installed" -ForegroundColor Green
    } else {
        Write-Host "  [OK] Python already installed" -ForegroundColor Green
    }
    
    # Install websockify
    python -m pip install websockify --quiet
    Write-Host "  [OK] Websockify installed" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Could not install Python/Websockify: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "  [4/5] Installing Cloudflare Tunnel..." -ForegroundColor Yellow
try {
    if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
        choco install cloudflared -y
        Write-Host "  [OK] Cloudflared installed" -ForegroundColor Green
    } else {
        Write-Host "  [OK] Cloudflared already installed" -ForegroundColor Green
    }
} catch {
    Write-Host "  [ERROR] Could not install cloudflared: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "  [5/5] Starting services..." -ForegroundColor Yellow

# Create websockify launcher
$websockifyScript = @"
@echo off
title RemoteDesk - Websockify
echo Starting Websockify bridge...
python -m websockify 6080 localhost:5900
"@
$websockifyScript | Out-File "$installDir\start-websockify.bat" -Encoding ASCII

# Start websockify in background
Start-Process "$installDir\start-websockify.bat" -WindowStyle Minimized
Start-Sleep -Seconds 2
Write-Host "  [OK] Websockify started (port 6080)" -ForegroundColor Green

# Start cloudflare tunnel
Write-Host "  [*] Creating secure tunnel (this takes 10-20 seconds)..." -ForegroundColor Yellow
$tunnelProcess = Start-Process -FilePath "cloudflared" -ArgumentList "tunnel --url http://localhost:6080 --no-autoupdate" -RedirectStandardOutput "$installDir\tunnel.log" -RedirectStandardError "$installDir\tunnel-error.log" -PassThru -WindowStyle Hidden

# Wait for tunnel URL
$tunnelUrl = ""
$waitCount = 0
while ($tunnelUrl -eq "" -and $waitCount -lt 30) {
    Start-Sleep -Seconds 1
    $waitCount++
    if (Test-Path "$installDir\tunnel-error.log") {
        $logContent = Get-Content "$installDir\tunnel-error.log" -Raw
        if ($logContent -match "https://[a-z0-9-]+\.trycloudflare\.com") {
            $tunnelUrl = $matches[0]
        }
    }
}

if ($tunnelUrl -eq "") {
    Write-Host "  [ERROR] Could not create tunnel. Check $installDir\tunnel-error.log" -ForegroundColor Red
    Write-Host "  You may need to run this script again." -ForegroundColor Yellow
    pause
    exit
}

Write-Host "  [OK] Tunnel created!" -ForegroundColor Green
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║                                                      ║" -ForegroundColor Green
Write-Host "  ║   SETUP COMPLETE!                                    ║" -ForegroundColor Green
Write-Host "  ║   ~~~~~~~~~~~~~~~                                    ║" -ForegroundColor Green
Write-Host "  ║                                                      ║" -ForegroundColor Green
Write-Host "  ║   Your tunnel URL:                                   ║" -ForegroundColor Green
Write-Host "  ║   $tunnelUrl" -ForegroundColor Cyan
Write-Host "  ║                                                      ║" -ForegroundColor Green
Write-Host "  ║   COPY THIS URL! You'll need it for the dashboard.   ║" -ForegroundColor Yellow
Write-Host "  ║                                                      ║" -ForegroundColor Green
Write-Host "  ║   Next steps:                                        ║" -ForegroundColor Green
Write-Host "  ║   1. Go to https://truededsec.netlify.app            ║" -ForegroundColor Green
Write-Host "  ║   2. Click 'Add Device'                              ║" -ForegroundColor Green
Write-Host "  ║   3. Paste the URL above                             ║" -ForegroundColor Green
Write-Host "  ║   4. Give it a name and click Register               ║" -ForegroundColor Green
Write-Host "  ║                                                      ║" -ForegroundColor Green
Write-Host "  ║   Keep this window open to maintain the connection!  ║" -ForegroundColor Yellow
Write-Host "  ║                                                      ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Save device info
$deviceInfo = @{
    hostname = $env:COMPUTERNAME
    tunnelUrl = $tunnelUrl
    setupDate = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    vncPort = 5900
    wsPort = 6080
}
$deviceInfo | ConvertTo-Json | Out-File "$installDir\device-info.json"

Write-Host "  Device info saved to: $installDir\device-info.json" -ForegroundColor Gray
Write-Host ""
Write-Host "  Press any key to exit (this will stop the tunnel)..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Cleanup
Stop-Process -Name "cloudflared" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "python" -Force -ErrorAction SilentlyContinue
Write-Host "  Services stopped." -ForegroundColor Gray
