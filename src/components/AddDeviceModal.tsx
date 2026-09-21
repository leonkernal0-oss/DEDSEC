import { useState } from 'react';
import { Device } from '../types';
import { X, AlertCircle } from 'lucide-react';

interface AddDeviceModalProps {
  onAdd: (device: Device) => void;
  onClose: () => void;
}

export function AddDeviceModal({ onAdd, onClose }: AddDeviceModalProps) {
  const [name, setName] = useState('');
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter a device name');
      return;
    }
    
    if (!tunnelUrl.trim()) {
      setError('Please enter the tunnel URL');
      return;
    }
    
    // Validate URL format
    if (!tunnelUrl.includes('trycloudflare.com') && !tunnelUrl.startsWith('ws://') && !tunnelUrl.startsWith('wss://')) {
      setError('Invalid tunnel URL. Should be from the setup script.');
      return;
    }

    // Create device object
    const newDevice: Device = {
      id: `device-${Date.now()}`,
      name: name.trim(),
      hostname: name.trim().toUpperCase().replace(/\s+/g, '-'),
      ip: '0.0.0.0',
      os: 'Windows',
      status: 'online',
      location: {
        lat: 0,
        lng: 0,
        city: 'Unknown',
        country: 'Unknown',
      },
      vncPort: 5900,
      wsPort: 6080,
      lastSeen: new Date().toISOString(),
      cpu: 0,
      ram: 0,
      disk: 0,
      uptime: '0m',
      tunnelUrl: tunnelUrl.trim(),
    };

    onAdd(newDevice);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#0d1225] border border-slate-800/80 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80">
          <h2 className="text-lg font-semibold text-white">Add New Device</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Device Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="e.g., Home PC, Work Laptop"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tunnel URL
            </label>
            <input
              type="text"
              value={tunnelUrl}
              onChange={(e) => { setTunnelUrl(e.target.value); setError(''); }}
              placeholder="https://xxx.trycloudflare.com"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-2">
              Run the setup script on your PC to get this URL
            </p>
          </div>

          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-400">
              <strong>How to get the tunnel URL:</strong>
            </p>
            <ol className="text-xs text-slate-400 mt-2 space-y-1 list-decimal list-inside">
              <li>Download the setup script (button in top right)</li>
              <li>Run it on the PC you want to control</li>
              <li>Copy the URL it shows you</li>
              <li>Paste it here</li>
            </ol>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800/60 text-slate-400 border border-slate-700/40 hover:bg-slate-800 hover:text-slate-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
            >
              Add Device
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
