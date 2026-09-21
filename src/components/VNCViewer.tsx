import { useState } from 'react';
import { Device } from '../types';
import { MonitorPlay, Maximize2, Minimize2, Camera, Settings, AlertCircle, Info } from 'lucide-react';

interface VNCViewerProps {
  device: Device | null;
}

export function VNCViewer({ device }: VNCViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [showInfo, setShowInfo] = useState(true);

  if (!device) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center">
            <MonitorPlay className="w-10 h-10 text-slate-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-300">No Device Selected</h3>
            <p className="text-sm text-slate-500 mt-1">
              Select a device from the sidebar or map to start viewing its screen
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (device.status !== 'online') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-300">Device Offline</h3>
            <p className="text-sm text-slate-500 mt-1">
              {device.name} is currently offline. Last seen: {new Date(device.lastSeen).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // In production, this would connect to the device's websockify WebSocket proxy
  // The URL would be: wss://{device-tunnel-url}/websockify
  const vncUrl = `ws://localhost:${device.wsPort}/websockify`;

  return (
    <div className={`w-full h-full flex flex-col bg-slate-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* VNC Toolbar */}
      <div className="h-10 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium text-slate-300">{device.name}</span>
          </div>
          <span className="text-xs text-slate-500">|</span>
          <span className="text-xs text-slate-500">{device.hostname}</span>
          <span className="text-xs text-slate-500">|</span>
          <span className="text-xs text-slate-500">{device.location.city}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Quality selector */}
          <div className="flex items-center gap-1 mr-2">
            <span className="text-xs text-slate-500">Quality:</span>
            {(['low', 'medium', 'high'] as const).map(q => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={`px-2 py-0.5 text-xs rounded ${
                  quality === q
                    ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            title="Toggle info"
          >
            <Info className="w-4 h-4 text-slate-400" />
          </button>
          <button
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            title="Screenshot"
          >
            <Camera className="w-4 h-4 text-slate-400" />
          </button>
          <button
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-slate-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* VNC Display Area */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {/* noVNC Canvas - In production, this is where the VNC canvas renders */}
        <div className="w-full h-full flex items-center justify-center relative">
          {/* Simulated VNC display for demo */}
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
            <div className="text-center space-y-6">
              {/* Simulated desktop */}
              <div className="w-[80%] max-w-2xl aspect-video bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg border border-slate-700 flex items-center justify-center relative overflow-hidden">
                {/* Simulated desktop wallpaper */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10" />
                
                {/* Simulated taskbar */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-800/80 backdrop-blur border-t border-slate-700 flex items-center px-2">
                  <div className="w-5 h-5 bg-blue-500/30 rounded mr-1" />
                  <div className="w-5 h-5 bg-slate-700/50 rounded mr-1" />
                  <div className="w-5 h-5 bg-slate-700/50 rounded mr-1" />
                  <div className="ml-auto text-xs text-slate-500">
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>

                {/* Simulated windows */}
                <div className="absolute top-4 left-4 w-48 h-32 bg-slate-800/90 rounded border border-slate-600 shadow-lg">
                  <div className="h-6 bg-slate-700/80 rounded-t flex items-center px-2">
                    <span className="text-xs text-slate-400">File Explorer</span>
                    <div className="ml-auto flex gap-1">
                      <div className="w-2 h-2 bg-slate-600 rounded-full" />
                      <div className="w-2 h-2 bg-slate-600 rounded-full" />
                      <div className="w-2 h-2 bg-red-500/50 rounded-full" />
                    </div>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="h-2 bg-slate-700 rounded w-3/4" />
                    <div className="h-2 bg-slate-700 rounded w-1/2" />
                    <div className="h-2 bg-slate-700 rounded w-2/3" />
                  </div>
                </div>

                <div className="absolute top-12 right-8 w-56 h-40 bg-slate-800/90 rounded border border-slate-600 shadow-lg">
                  <div className="h-6 bg-slate-700/80 rounded-t flex items-center px-2">
                    <span className="text-xs text-slate-400">PowerShell</span>
                    <div className="ml-auto flex gap-1">
                      <div className="w-2 h-2 bg-slate-600 rounded-full" />
                      <div className="w-2 h-2 bg-slate-600 rounded-full" />
                      <div className="w-2 h-2 bg-red-500/50 rounded-full" />
                    </div>
                  </div>
                  <div className="p-2 font-mono text-xs text-green-400 space-y-0.5">
                    <div>PS C:\Users\Admin&gt; _</div>
                  </div>
                </div>

                {/* Desktop icons */}
                <div className="absolute top-4 right-4 space-y-3">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-8 h-8 bg-blue-500/20 rounded border border-blue-500/30" />
                    <span className="text-[8px] text-slate-400">This PC</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-8 h-8 bg-green-500/20 rounded border border-green-500/30" />
                    <span className="text-[8px] text-slate-400">Recycle</span>
                  </div>
                </div>
              </div>

              {/* Connection info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 justify-center">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm text-green-400">Connected via noVNC</span>
                </div>
                <p className="text-xs text-slate-500">
                  WebSocket: {vncUrl} | Quality: {quality}
                </p>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  In production, this area renders the actual VNC screen via noVNC's websockify connection.
                  The BAT file sets up TightVNC + websockify on each device to enable this.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info panel */}
        {showInfo && (
          <div className="absolute top-3 left-3 bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700 text-xs space-y-1">
            <div className="text-slate-300 font-medium">Session Info</div>
            <div className="text-slate-500">IP: {device.ip}</div>
            <div className="text-slate-500">VNC Port: {device.vncPort}</div>
            <div className="text-slate-500">WS Port: {device.wsPort}</div>
            <div className="text-slate-500">OS: {device.os}</div>
            <div className="text-slate-500">CPU: {device.cpu}% | RAM: {device.ram}%</div>
          </div>
        )}
      </div>
    </div>
  );
}
