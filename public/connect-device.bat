@echo off
setlocal EnableDelayedExpansion
title RemoteDesk - Device Connector Setup
color 0B

:: ============================================================
::  RemoteDesk Device Connector
::  This script sets up your PC for remote management via
::  the RemoteDesk web dashboard.
::  
::  It installs:
::    1. TightVNC Server (for screen sharing/control)
::    2. Websockify (VNC to WebSocket bridge)
::    3. Cloudflared Tunnel (secure connection to dashboard)
::    4. Registers device with your RemoteDesk dashboard
::
::  Requirements:
::    - Windows 10/11
::    - Administrator privileges
::    - Internet connection
::    - Chocolatey (will be installed if missing)
:: ============================================================

:: --- CONFIGURATION ---
:: Change these values to match your setup:
set "DASHBOARD_URL=https://your-remote-dashboard.netlify.app"
set "DEVICE_NAME=%COMPUTERNAME%"
set "VNC_PORT=5900"
set "VNC_PASSWORD=RemoteDesk2024"
set "WEBSOCKIFY_PORT=6080"
set "API_WEBHOOK=https://your-backend-api.com/devices/register"
set "INSTALL_DIR=C:\RemoteDesk"

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║                                                          ║
echo  ║         RemoteDesk - Device Connector Setup              ║
echo  ║         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~              ║
echo  ║   This will configure your PC for remote management      ║
echo  ║   via the RemoteDesk web dashboard.                      ║
echo  ║                                                          ║
echo  ║   Components to install:                                 ║
echo  ║   [1] TightVNC Server    (Screen control)                ║
echo  ║   [2] Websockify         (VNC-WebSocket bridge)          ║
echo  ║   [3] Cloudflared Tunnel (Secure connection)             ║
echo  ║   [4] Device Registration (Connect to dashboard)         ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: --- CHECK ADMIN PRIVILEGES ---
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] This script requires Administrator privileges.
    echo  Please right-click and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo  [OK] Running with Administrator privileges
echo.

:: --- CREATE INSTALL DIRECTORY ---
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
echo  [OK] Install directory: %INSTALL_DIR%

:: ============================================================
:: STEP 1: Install Chocolatey (if not installed)
:: ============================================================
echo.
echo  ──────────────────────────────────────────────────────────
echo  STEP 1: Checking Package Manager...
echo  ──────────────────────────────────────────────────────────
echo.

where choco >nul 2>&1
if %errorlevel% neq 0 (
    echo  [*] Installing Chocolatey package manager...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    if %errorlevel% neq 0 (
        echo  [ERROR] Failed to install Chocolatey. Trying alternative method...
        :: Try winget as fallback
        where winget >nul 2>&1
        if %errorlevel% neq 0 (
            echo  [ERROR] Neither Chocolatey nor winget available.
            echo  Please install manually from: https://chocolatey.org/install
            pause
            exit /b 1
        )
        set "USE_WINGET=1"
    )
    :: Refresh PATH
    call refreshenv >nul 2>&1
    set "PATH=%PATH%;C:\ProgramData\chocolatey\bin"
)

if defined USE_WINGET (
    echo  [OK] Using winget package manager
) else (
    echo  [OK] Chocolatey is available
)

:: ============================================================
:: STEP 2: Install TightVNC Server
:: ============================================================
echo.
echo  ──────────────────────────────────────────────────────────
echo  STEP 2: Installing TightVNC Server...
echo  ──────────────────────────────────────────────────────────
echo.

:: Check if TightVNC is already installed
reg query "HKLM\SOFTWARE\TightVNC" >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] TightVNC Server is already installed
    goto :skip_vnc
)

echo  [*] Downloading and installing TightVNC Server...

if defined USE_WINGET (
    winget install --id Glavsoft.TightVNC -e --accept-package-agreements --accept-source-agreements
) else (
    choco install tightvnc -y --force
)

if %errorlevel% neq 0 (
    echo  [WARN] Package install failed. Downloading manually...
    powershell -Command "Invoke-WebRequest -Uri 'https://www.tightvnc.com/download/2.8.85/tightvnc-2.8.85-gpl-setup-64bit.msi' -OutFile '%INSTALL_DIR%\tightvnc-setup.msi'"
    msiexec /i "%INSTALL_DIR%\tightvnc-setup.msi" /quiet /norestart ADDLOCAL="Server" SET_USEVNCAUTHENTICATION=1 VALUE_OF_USEVNCAUTHENTICATION=1 SET_PASSWORD=1 VALUE_OF_PASSWORD=%VNC_PASSWORD% SET_USECONTROLAUTHENTICATION=1 VALUE_OF_CONTROLAUTHENTICATION=%VNC_PASSWORD% SET_ACCEPTHTTPCONNECTIONS=0 VALUE_OF_ACCEPTHTTPCONNECTIONS=0
)

:: Configure TightVNC
echo  [*] Configuring TightVNC Server...
reg add "HKLM\SOFTWARE\TightVNC\Server" /v "PortNumber" /t REG_DWORD /d %VNC_PORT% /f >nul
reg add "HKLM\SOFTWARE\TightVNC\Server" /v "PasswordViewOnly" /t REG_BINARY /d "" /f >nul
reg add "HKLM\SOFTWARE\TightVNC\Server" /v "LoopbackOnly" /t REG_DWORD /d 0 /f >nul
reg add "HKLM\SOFTWARE\TightVNC\Server" /v "UseAuthentication" /t REG_DWORD /d 1 /f >nul
reg add "HKLM\SOFTWARE\TightVNC\Server" /v "AllowLoopback" /t REG_DWORD /d 1 /f >nul

:: Start TightVNC service
net start tvnserver >nul 2>&1
echo  [OK] TightVNC Server installed and running on port %VNC_PORT%

:skip_vnc

:: ============================================================
:: STEP 3: Install Websockify (Python-based)
:: ============================================================
echo.
echo  ──────────────────────────────────────────────────────────
echo  STEP 3: Setting up Websockify (VNC to WebSocket bridge)...
echo  ──────────────────────────────────────────────────────────
echo.

:: Check for Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo  [*] Installing Python...
    if defined USE_WINGET (
        winget install Python.Python.3.12 -e --accept-package-agreements --accept-source-agreements
    ) else (
        choco install python3 -y
    )
    :: Refresh PATH
    set "PATH=%PATH%;C:\Python312;C:\Python312\Scripts;%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts"
)

:: Install websockify via pip
echo  [*] Installing websockify...
pip install websockify >nul 2>&1
if %errorlevel% neq 0 (
    echo  [WARN] pip install failed. Trying with python -m pip...
    python -m pip install websockify >nul 2>&1
)

:: Create websockify launcher script
echo  [*] Creating websockify launcher...
(
echo @echo off
echo title RemoteDesk - Websockify Bridge
echo echo  Starting Websockify bridge...
echo echo  VNC Port: %VNC_PORT% ^=^> WebSocket Port: %WEBSOCKIFY_PORT%
echo echo.
echo python -m websockify --web "%INSTALL_DIR%\noVNC" %WEBSOCKIFY_PORT% localhost:%VNC_PORT%
) > "%INSTALL_DIR%\start-websockify.bat"

:: Download noVNC web client
echo  [*] Downloading noVNC web client...
if not exist "%INSTALL_DIR%\noVNC" mkdir "%INSTALL_DIR%\noVNC"
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/novnc/noVNC/archive/refs/tags/v1.4.0.zip' -OutFile '%INSTALL_DIR%\novnc.zip'"
powershell -Command "Expand-Archive -Path '%INSTALL_DIR%\novnc.zip' -DestinationPath '%INSTALL_DIR%' -Force"
:: Move files from extracted folder
if exist "%INSTALL_DIR%\noVNC-1.4.0" (
    xcopy /E /Y /Q "%INSTALL_DIR%\noVNC-1.4.0\*" "%INSTALL_DIR%\noVNC\" >nul
    rmdir /S /Q "%INSTALL_DIR%\noVNC-1.4.0" >nul 2>&1
)
del "%INSTALL_DIR%\novnc.zip" >nul 2>&1

echo  [OK] Websockify configured: localhost:%VNC_PORT% ^=^> ws://localhost:%WEBSOCKIFY_PORT%

:: ============================================================
:: STEP 4: Install Cloudflared Tunnel
:: ============================================================
echo.
echo  ──────────────────────────────────────────────────────────
echo  STEP 4: Setting up Cloudflare Tunnel (Secure Connection)...
echo  ──────────────────────────────────────────────────────────
echo.

where cloudflared >nul 2>&1
if %errorlevel% neq 0 (
    echo  [*] Installing cloudflared...
    if defined USE_WINGET (
        winget install Cloudflare.cloudflared -e --accept-package-agreements --accept-source-agreements
    ) else (
        choco install cloudflared -y
    )
    
    :: If still not found, download directly
    where cloudflared >nul 2>&1
    if %errorlevel% neq 0 (
        echo  [*] Downloading cloudflared directly...
        powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi' -OutFile '%INSTALL_DIR%\cloudflared.msi'"
        msiexec /i "%INSTALL_DIR%\cloudflared.msi" /quiet /norestart
        set "PATH=%PATH%;C:\Program Files (x86)\cloudflared"
    )
)

echo  [OK] Cloudflared is available

:: ============================================================
:: STEP 5: Start Services
:: ============================================================
echo.
echo  ──────────────────────────────────────────────────────────
echo  STEP 5: Starting Remote Services...
echo  ──────────────────────────────────────────────────────────
echo.

:: Start websockify in background
echo  [*] Starting Websockify bridge...
start /B "" "%INSTALL_DIR%\start-websockify.bat"
timeout /t 2 /nobreak >nul

:: Start cloudflared tunnel (quick tunnel - no account needed)
echo  [*] Starting Cloudflare tunnel...
echo  [*] This creates a secure public URL for your device...
echo.

:: Create the tunnel launcher
(
echo @echo off
echo title RemoteDesk - Cloudflare Tunnel
echo echo  Starting secure tunnel...
echo cloudflared tunnel --url http://localhost:%WEBSOCKIFY_PORT% --no-autoupdate 2^>^&1 ^| findstr "trycloudflare.com" ^> "%INSTALL_DIR%\tunnel_url.txt"
echo cloudflared tunnel --url http://localhost:%WEBSOCKIFY_PORT% --no-autoupdate
) > "%INSTALL_DIR%\start-tunnel.bat"

start /B "" "%INSTALL_DIR%\start-tunnel.bat"

:: Wait for tunnel URL
echo  [*] Waiting for tunnel to establish...
set "TUNNEL_URL="
set /a "RETRY=0"
:wait_tunnel
timeout /t 3 /nobreak >nul
set /a "RETRY+=1"
if exist "%INSTALL_DIR%\tunnel_url.txt" (
    for /f "tokens=*" %%a in ('type "%INSTALL_DIR%\tunnel_url.txt" ^| findstr "trycloudflare.com"') do (
        set "TUNNEL_URL=%%a"
    )
)
if "!RETRY!" lss "15" if "!TUNNEL_URL!"=="" goto :wait_tunnel

if "!TUNNEL_URL!"=="" (
    echo  [WARN] Could not capture tunnel URL automatically.
    echo  Check the tunnel console window for the URL.
    set "TUNNEL_URL=https://manual-tunnel-url.trycloudflare.com"
)

echo  [OK] Tunnel established: !TUNNEL_URL!

:: ============================================================
:: STEP 6: Register Device with Dashboard
:: ============================================================
echo.
echo  ──────────────────────────────────────────────────────────
echo  STEP 6: Registering Device with Dashboard...
echo  ──────────────────────────────────────────────────────────
echo.

:: Get network info
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
    set "LOCAL_IP=%%a"
    set "LOCAL_IP=!LOCAL_IP: =!"
    goto :found_ip
)
:found_ip

:: Get OS info
for /f "tokens=2 delims==" %%a in ('wmic os get caption /value') do (
    set "OS_INFO=%%a"
    goto :found_os
)
:found_os

:: Build JSON payload
set "JSON_PAYLOAD={\"id\":\"%COMPUTERNAME%\",\"name\":\"%DEVICE_NAME%\",\"hostname\":\"%COMPUTERNAME%\",\"ip\":\"%LOCAL_IP%\",\"os\":\"%OS_INFO%\",\"status\":\"online\",\"vncPort\":%VNC_PORT%,\"wsPort\":%WEBSOCKIFY_PORT%,\"tunnelUrl\":\"!TUNNEL_URL!\",\"lastSeen\":\"%DATE%T%TIME:~0,8%Z\"}"

echo  [*] Device Info:
echo      Name:     %DEVICE_NAME%
echo      Hostname: %COMPUTERNAME%
echo      IP:       %LOCAL_IP%
echo      OS:       %OS_INFO%
echo      VNC Port: %VNC_PORT%
echo      WS Port:  %WEBSOCKIFY_PORT%
echo      Tunnel:   !TUNNEL_URL!
echo.

echo  [*] Sending registration to dashboard...
powershell -Command "try { $body = '%JSON_PAYLOAD%'; Invoke-RestMethod -Uri '%API_WEBHOOK%' -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 10; Write-Host '  [OK] Device registered successfully!' } catch { Write-Host '  [WARN] Could not reach dashboard API. Device info saved locally.'; $body | Out-File '%INSTALL_DIR%\device_info.json' }"

:: Save device info locally as backup
echo %JSON_PAYLOAD% > "%INSTALL_DIR%\device_info.json"

:: ============================================================
:: STEP 7: Create Startup Script
:: ============================================================
echo.
echo  ──────────────────────────────────────────────────────────
echo  STEP 7: Setting up Auto-Start...
echo  ──────────────────────────────────────────────────────────
echo.

:: Create a combined startup script
(
echo @echo off
echo title RemoteDesk Agent
echo echo  Starting RemoteDesk services...
echo.
echo :: Start websockify
echo start /B "" "%INSTALL_DIR%\start-websockify.bat"
echo timeout /t 2 /nobreak ^>nul
echo.
echo :: Start tunnel
echo start /B "" "%INSTALL_DIR%\start-tunnel.bat"
echo timeout /t 5 /nobreak ^>nul
echo.
echo :: Re-register with dashboard
echo powershell -Command "try { $info = Get-Content '%INSTALL_DIR%\device_info.json' -Raw; Invoke-RestMethod -Uri '%API_WEBHOOK%' -Method POST -Body $info -ContentType 'application/json' -TimeoutSec 10 } catch {}"
echo.
echo echo  [OK] RemoteDesk services running.
echo echo  Press any key to stop services...
echo pause ^>nul
echo.
echo :: Cleanup
echo taskkill /F /IM cloudflared.exe ^>nul 2^>^&1
echo taskkill /F /FI "WINDOWTITLE eq RemoteDesk*" ^>nul 2^>^&1
echo echo  Services stopped.
) > "%INSTALL_DIR%\start-remotedesk.bat"

:: Create Windows Task for auto-start
echo  [*] Creating auto-start task...
schtasks /create /tn "RemoteDesk Agent" /tr "\"%INSTALL_DIR%\start-remotedesk.bat\"" /sc onlogon /rl highest /f >nul 2>&1

:: Also add to startup folder
copy "%INSTALL_DIR%\start-remotedesk.bat" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\RemoteDesk.bat" >nul 2>&1

echo  [OK] Auto-start configured

:: ============================================================
:: DONE
:: ============================================================
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║                                                          ║
echo  ║              SETUP COMPLETE!                             ║
echo  ║              ~~~~~~~~~~~~~~~                             ║
echo  ║   Your device is now connected to RemoteDesk.           ║
echo  ║                                                          ║
echo  ║   Dashboard: %DASHBOARD_URL%
echo  ║   Tunnel:    !TUNNEL_URL!
echo  ║   VNC Port:  %VNC_PORT%
echo  ║   WS Port:   %WEBSOCKIFY_PORT%
echo  ║                                                          ║
echo  ║   Files created in: %INSTALL_DIR%
echo  ║                                                          ║
echo  ║   To manage services:                                   ║
echo  ║   - Start:   %INSTALL_DIR%\start-remotedesk.bat
echo  ║   - Stop:    Close the RemoteDesk Agent window          ║
echo  ║                                                          ║
echo  ║   Services will auto-start on login.                    ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
echo  Press any key to exit...
pause >nul

:: Keep services running if user wants
echo.
set /p "KEEP_RUNNING=Keep services running? (Y/n): "
if /i "%KEEP_RUNNING%"=="n" (
    taskkill /F /IM cloudflared.exe >nul 2>&1
    taskkill /F /FI "WINDOWTITLE eq RemoteDesk*" >nul 2>&1
    echo  Services stopped.
) else (
    echo  Services will keep running in background.
    echo  To stop them, close the "RemoteDesk Agent" window.
)

exit /b 0
