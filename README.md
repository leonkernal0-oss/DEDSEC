# RemoteDesk - Real Remote Control System

## YOUR SETUP (truededsec.netlify.app)

This is a REAL remote control system. Here's exactly what to do:

---

## STEP 1: Deploy the Web Dashboard to Netlify

1. Go to https://app.netlify.com
2. Click "Add new site" → "Deploy manually"
3. Drag and drop the `dist` folder (already built for you)
4. Your site will be live at: https://truededsec.netlify.app

**That's it for the web part!**

---

## STEP 2: Connect Your PCs (Run on each computer you want to control)

1. Download `setup-remote.ps1` from your deployed site
2. Right-click it → "Run with PowerShell"
3. If it asks for permission, click "Yes" or "Allow"
4. Wait for it to finish (takes 2-3 minutes)
5. It will show you a tunnel URL - copy it

The script will:
- Install TightVNC (for screen control)
- Install websockify (connects VNC to web)
- Create a secure tunnel (so you can access it from anywhere)
- Set everything up to run automatically

---

## STEP 3: Register Your Device

After running the script on a PC:
1. Go to https://truededsec.netlify.app
2. Click "Add Device" button
3. Paste the tunnel URL the script gave you
4. Give it a name (like "Home PC" or "Work Laptop")
5. Click "Register"

Now you can control that PC from anywhere!

---

## HOW IT WORKS

```
Your Web Dashboard (truededsec.netlify.app)
         ↓
    Internet
         ↓
Cloudflare Tunnel (secure, encrypted)
         ↓
    Your PC (running the PowerShell script)
         ↓
    TightVNC + Websockify
```

- **Screen Control**: Uses noVNC to show the actual desktop
- **PowerShell**: Real terminal connected via WebSocket
- **Files**: Browse and download files from the remote PC

---

## TROUBLESHOOTING

**Script won't run:**
- Right-click → Properties → Unblock → OK
- Or run PowerShell as Administrator, then: `Set-ExecutionPolicy Bypass -Scope Process -Force`

**Can't connect to device:**
- Make sure the PowerShell window is still open (it's running the tunnel)
- Check if the tunnel URL is correct in the dashboard
- Try refreshing the page

**VNC shows black screen:**
- TightVNC might not be running. Run: `net start tvnserver`
- Check Windows Firewall allows port 5900

---

## SECURITY NOTES

- The tunnel is encrypted end-to-end
- VNC password is set in the script (change it!)
- Anyone with the tunnel URL can access the PC
- Close the PowerShell window to stop access
- Consider adding authentication to your dashboard

---

## FILES INCLUDED

- `dist/` - Built web dashboard (deploy this to Netlify)
- `setup-remote.ps1` - PowerShell script to run on each PC
- `README.md` - This file

---

## NEED HELP?

The script creates a log file at: `C:\RemoteDesk\setup.log`
Check this if something goes wrong.
