import { Device } from '../types';
import {
  MonitorPlay,
  Maximize2,
  Minimize2,
  Camera,
  Settings,
  AlertCircle,
  Info,
  MousePointer,
  Keyboard,
} from 'lucide-react';
import { useState } from 'react';

interface VNCViewerProps {
  device: Device | null;
}

export function VNCViewer({ device }: VNCViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [showInfo, setShowInfo] = useState(true);

  if (!device) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0e1a]">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="w-20 h-20 mx-auto bg-slate-800/60 rounded-2xl flex items-center justify-center border border-slate-700/40">
            <MonitorPlay className="w-10 h-10 text-slate-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">No Device Selected</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Select a device from the sidebar or dashboard to start viewing its screen
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (device.status !== 'online') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0e1a]">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">Device Offline</h3>
            <p className="text-sm text-slate-500 mt-1">
              {device.name} is currently offline
            </p>
            <p className="text-xs text-slate-600 mt-2">
              Last seen: {new Date(device.lastSeen).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col bg-[#0a0e1a] ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* VNC Toolbar */}
      <div className="h-12 bg-[#0d1225] border-b border-slate-800/80 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 pulse-online" />
            <span className="text-sm font-medium text-slate-200">{device.name}</span>
          </div>
          <span className="text-xs text-slate-600">|</span>
          <span className="text-xs text-slate-500">{device.hostname}</span>
          <span className="text-xs text-slate-600">|</span>
          <span className="text-xs text-slate-500">{device.location.city}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quality selector */}
          <div className="hidden md:flex items-center gap-1 mr-2">
            <span className="text-xs text-slate-500">Quality:</span>
            {(['low', 'medium', 'high'] as const).map(q => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  quality === q
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
            title="Toggle info"
          >
            <Info className="w-4 h-4 text-slate-400" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
            title="Screenshot"
          >
            <Camera className="w-4 h-4 text-slate-400" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
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
        {/* Simulated VNC display */}
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="w-[90%] max-w-4xl aspect-video bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl border border-slate-700/50 flex items-center justify-center relative overflow-hidden shadow-2xl">
            {/* Simulated desktop wallpaper */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5" />
            
            {/* Simulated taskbar */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-slate-800/90 backdrop-blur border-t border-slate-700/50 flex items-center px-3">
              <div className="w-6 h-6 bg-blue-500/30 rounded mr-2" />
              <div className="w-6 h-6 bg-slate-700/50 rounded mr-2" />
              <div className="w-6 h-6 bg-slate-700/50 rounded mr-2" />
              <div className="ml-auto text-xs text-slate-500">
                {new Date().toLocaleTimeString()}
              </div>
            </div>

            {/* Simulated windows */}
            <div className="absolute top-6 left-6 w-64 h-40 bg-slate-800/95 rounded-lg border border-slate-600/50 shadow-xl">
              <div className="h-7 bg-slate-700/80 rounded-t-lg flex items-center px-3">
                <span className="text-xs text-slate-400">File Explorer</span>
                <div className="ml-auto flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-slate-600 rounded-full" />
                  <div className="w-2.5 h-2.5 bg-slate-600 rounded-full" />
                  <div className="w-2.5 h-2.5 bg-red-500/50 rounded-full" />
                </div>
              </div>
              <div className="p-3 space-y-2">
                <div className="h-2 bg-slate-700 rounded w-3/4" />
                <div className="h-2 bg-slate-700 rounded w-1/2" />
                <div className="h-2 bg-slate-700 rounded w-2/3" />
                <div className="h-2 bg-slate-700 rounded w-1/3" />
              </div>
            </div>

            <div className="absolute top-16 right-10 w-72 h-48 bg-slate-800/95 rounded-lg border border-slate-600/50 shadow-xl">
              <div className="h-7 bg-slate-700/80 rounded-t-lg flex items-center px-3">
                <span className="text-xs text-slate-400">PowerShell</span>
                <div className="ml-auto flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-slate-600 rounded-full" />
                  <div className="w-2.5 h-2.5 bg-slate-600 rounded-full" />
                  <div className="w-2.5 h-2.5 bg-red-500/50 rounded-full" />
                </div>
              </div>
              <div className="p-3 font-mono text-xs text-green-400 space-y-1">
                <div>PS C:\Users\Admin&gt; _</div>
              </div>
            </div>

            {/* Desktop icons */}
            <div className="absolute top-6 right-6 space-y-4">
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg border border-blue-500/30" />
                <span className="text-[9px] text-slate-400">This PC</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg border border-green-500/30" />
                <span className="text-[9px] text-slate-400">Recycle</span>
              </div>
            </div>
          </div>

          {/* Connection info */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 space-y-2 text-center">
            <div className="flex items-center gap-2 justify-center">
              <span className="w-2 h-2 rounded-full bg-green-400 pulse-online" />
              <span className="text-sm text-green-400 font-medium">Connected via noVNC</span>
            </div>
            <p className="text-xs text-slate-500">
              WebSocket: {device.tunnelUrl || `ws://localhost:${device.wsPort}`} • Quality: {quality}
            </p>
            <p className="text-xs text-slate-600 max-w-md">
              In production, this renders the actual VNC screen via noVNC's websockify connection.
            </p>
          </div>
        </div>

        {/* Info panel */}
        {showInfo && (
          <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 text-xs space-y-2 animate-fade-in">
            <div className="text-slate-200 font-semibold text-sm">Session Info</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-slate-500">IP:</span>
                <span>{device.ip}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-slate-500">VNC Port:</span>
                <span>{device.vncPort}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-slate-500">WS Port:</span>
                <span>{device.wsPort}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-slate-500">OS:</span>
                <span>{device.os}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-slate-500">CPU:</span>
                <span>{device.cpu}%</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-slate-500">RAM:</span>
                <span>{device.ram}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Control hints */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/80 backdrop-blur border border-slate-700/50 text-[10px] text-slate-400">
            <MousePointer className="w-3 h-3" />
            Click to interact
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/80 backdrop-blur border border-slate-700/50 text-[10px] text-slate-400">
            <Keyboard className="w-3 h-3" />
            Type to input
          </div>
        </div>
      </div>
    </div>
  );
}
