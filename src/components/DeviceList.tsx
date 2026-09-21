import { Device } from '../types';
import { Monitor, Wifi, WifiOff, Clock } from 'lucide-react';

interface DeviceListProps {
  devices: Device[];
  selectedDevice: Device | null;
  onSelectDevice: (device: Device) => void;
}

export function DeviceList({ devices, selectedDevice, onSelectDevice }: DeviceListProps) {
  const onlineDevices = devices.filter(d => d.status === 'online');
  const offlineDevices = devices.filter(d => d.status !== 'online');

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {onlineDevices.length > 0 && (
        <div className="mb-3">
          <div className="px-2 py-1 text-xs font-medium text-green-400 uppercase tracking-wider flex items-center gap-1">
            <Wifi className="w-3 h-3" />
            Online ({onlineDevices.length})
          </div>
          {onlineDevices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              isSelected={selectedDevice?.id === device.id}
              onClick={() => onSelectDevice(device)}
            />
          ))}
        </div>
      )}

      {offlineDevices.length > 0 && (
        <div>
          <div className="px-2 py-1 text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <WifiOff className="w-3 h-3" />
            Offline ({offlineDevices.length})
          </div>
          {offlineDevices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              isSelected={selectedDevice?.id === device.id}
              onClick={() => onSelectDevice(device)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeviceCard({ device, isSelected, onClick }: {
  device: Device;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isOnline = device.status === 'online';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-all ${
        isSelected
          ? 'bg-blue-600/20 border border-blue-500/30'
          : 'hover:bg-slate-700/50 border border-transparent'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          isOnline ? 'bg-green-500/10' : 'bg-slate-700/50'
        }`}>
          <Monitor className={`w-5 h-5 ${isOnline ? 'text-green-400' : 'text-slate-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200 truncate">{device.name}</span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              isOnline ? 'bg-green-400' : 'bg-slate-600'
            }`} />
          </div>
          <p className="text-xs text-slate-500 truncate">{device.hostname}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-600">{device.location.city}</span>
            {isOnline && (
              <span className="text-xs text-slate-600">CPU: {device.cpu}%</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
