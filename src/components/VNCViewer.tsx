import { Device } from '../types';
import {
  MonitorPlay,
  Maximize2,
  Minimize2,
  AlertCircle,
  Info,
  ExternalLink,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface VNCViewerProps {
  device: Device | null;
}

export function VNCViewer({ device }: VNCViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed' | 'idle'>('idle');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (device && device.status === 'online' && device.tunnelUrl) {
      setConnectionStatus('connecting');
      // Try to connect - the iframe will show the noVNC client
      setTimeout(() => {
        setConnectionStatus('connected');
      }, 2000);
    } else {
      setConnectionStatus('idle');
    }
  }, [device]);

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

  // Build the noVNC URL
  // The tunnel URL points to websockify which serves noVNC
  const vncUrl = device.tunnelUrl.replace('wss://', 'https://').replace('ws://', 'http://');
  const novncUrl = `${vncUrl}/vnc.html?autoconnect=true&resize=scale`;

  return (
    <div className={`w-full h-full flex flex-col bg-[#0a0e1a] ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* VNC Toolbar */}
      <div className="h-12 bg-[#0d1225] border-b border-slate-800/80 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-400 pulse-online' :
              connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              connectionStatus === 'failed' ? 'bg-red-400' : 'bg-slate-600'
            }`} />
            <span className="text-sm font-medium text-slate-200">{device.name}</span>
          </div>
          <span className="text-xs text-slate-600">|</span>
          <span className="text-xs text-slate-500">{connectionStatus}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
            title="Toggle info"
          >
            <Info className="w-4 h-4 text-slate-400" />
          </button>
          <a
            href={novncUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
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
        {/* noVNC iframe */}
        <iframe
          ref={iframeRef}
          src={novncUrl}
          className="w-full h-full border-0"
          title="Remote Desktop"
          allow="clipboard-read; clipboard-write"
        />

        {/* Connection status overlay */}
        {connectionStatus === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-300">Connecting to {device.name}...</p>
              <p className="text-xs text-slate-500">Establishing secure tunnel</p>
            </div>
          </div>
        )}

        {connectionStatus === 'failed' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
              <p className="text-sm text-slate-300">Connection failed</p>
              <p className="text-xs text-slate-500 max-w-sm">
                The device might be offline or the tunnel URL is incorrect.
                Try opening in a new tab or check if the setup script is running.
              </p>
              <a
                href={novncUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </a>
            </div>
          </div>
        )}

        {/* Info panel */}
        {showInfo && connectionStatus === 'connected' && (
          <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 text-xs space-y-2 animate-fade-in">
            <div className="text-slate-200 font-semibold text-sm">Connection Info</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-slate-500">Tunnel:</span>
                <span className="font-mono text-[10px]">{device.tunnelUrl}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-slate-500">Status:</span>
                <span className="text-green-400">Connected</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
