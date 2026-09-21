# RemoteDesk - Remote Device Control Center

A web-based remote device management dashboard that lets you control all your computers from a single page. Features include device mapping, noVNC screen control, and remote PowerShell access.

## 🖥️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    RemoteDesk Web Dashboard                      │
│                    (Hosted on Netlify)                           │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Device   │  │  Device  │  │  noVNC   │  │  PowerShell  │   │
│  │   Map    │  │   List   │  │  Viewer  │  │   Terminal   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    WebSocket / HTTPS
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───┐  ┌──────▼─────┐  ┌────▼────────┐
     │  Device 1  │  │  Device 2  │  │  Device 3   │
     │            │  │            │  │              │
     │ TightVNC   │  │ TightVNC   │  │ TightVNC     │
     │     +      │  │     +      │  │     +        │
     │ Websockify │  │ Websockify │  │ Websockify   │
     │     +      │  │     +      │  │     +        │
     │Cloudflared │  │Cloudflared │  │ Cloudflared  │
     └────────────┘  └────────────┘  └──────────────┘
```

## 📁 Project Structure

```
├── src/
│   ├── App.tsx                    # Main dashboard application
│   ├── types.ts                   # TypeScript type definitions
│   ├── index.css                  # Global styles + Leaflet overrides
│   ├── main.tsx                   # React entry point
│   └── components/
│       ├── DeviceList.tsx         # Sidebar device list
│       ├── DeviceMap.tsx          # Interactive world map
│       ├── VNCViewer.tsx          # noVNC screen control panel
│       └── PowerShellTerminal.tsx # Remote terminal with xterm.js
├── public/
│   └── connect-device.bat         # Device setup script
└── README.md
```

## 🚀 Quick Start

### 1. Deploy the Web Dashboard

The dashboard is a static React app that can be deployed to Netlify:

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy the dist/ folder to Netlify
```

### 2. Connect a Device (Run on each PC you want to control)

1. Download `connect-device.bat` from your deployed dashboard
2. **Right-click → Run as Administrator** on each target PC
3. The script will:
   - Install TightVNC Server (screen sharing)
   - Install Websockify (VNC → WebSocket bridge)
   - Install Cloudflared (secure tunnel)
   - Register the device with your dashboard

### 3. Configure Your Dashboard URL

Edit `connect-device.bat` and update these variables:

```bat
set "DASHBOARD_URL=https://your-remote-dashboard.netlify.app"
set "API_WEBHOOK=https://your-backend-api.com/devices/register"
```

## 🔧 How It Works

### Device Connection Flow

1. **BAT file runs on target PC:**
   - Installs TightVNC Server on port 5900
   - Starts Websockify to bridge VNC → WebSocket (port 6080)
   - Creates a Cloudflare Quick Tunnel (free, no account needed)
   - Sends device info to your dashboard's API

2. **Web Dashboard:**
   - Shows all registered devices on an interactive map
   - Lists devices with online/offline status
   - Provides noVNC viewer for screen control
   - Provides PowerShell terminal for command-line access

### Connection Types

| Feature | Technology | Purpose |
|---------|-----------|---------|
| Screen Control | noVNC + Websockify | View and control the remote desktop |
| PowerShell | WebSocket + xterm.js | Run commands without viewing full screen |
| Device Map | Leaflet + CartoDB tiles | See where all your devices are located |

## ⚙️ Backend Requirements

For full functionality, you need a simple backend API that:
- Accepts device registration (POST /devices/register)
- Stores device information (use Supabase, Firebase, or any database)
- Provides device list to the dashboard (GET /devices)

### Quick Backend Options:

1. **Netlify Functions** (serverless, free tier)
2. **Supabase** (free tier, PostgreSQL)
3. **Firebase** (free tier, Realtime Database)
4. **JSONBin.io** (simple JSON storage)

## 🔒 Security Notes

- VNC password is set in the BAT file (`VNC_PASSWORD` variable)
- Cloudflare tunnels use HTTPS encryption
- Consider adding authentication to your dashboard
- Change default passwords before production use
- The BAT file runs with admin privileges - review before running

## 📋 Requirements

### For the Dashboard:
- Modern web browser (Chrome, Firefox, Edge)
- Netlify account (free) for hosting

### For Each Connected Device:
- Windows 10 or 11
- Administrator access
- Internet connection
- ~200MB disk space for tools

## 🛠️ Development

```bash
# Start development server
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build
```

## 📝 License

MIT
