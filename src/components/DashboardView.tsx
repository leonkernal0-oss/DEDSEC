import { Device, ViewMode } from '../types';
import {
  MonitorPlay,
  Terminal,
  FolderOpen,
  Cpu,
  MemoryStick,
  HardDrive,
  Clock,
  MapPin,
  Globe,
  Server,
  Activity,
} from 'lucide-react';

interface DashboardViewProps {
  devices: Device[];
  selectedDevice: Device | null;
  onSelectDevice: (device: Device) => void;
  onAction: (device: Device, action: ViewMode) => void;
}

export function DashboardView({ devices, selectedDevice, onSelectDevice, onAction }: DashboardViewProps) {
  const onlineDevices = devices.filter(d => d.status === 'online');
  const offlineDevices = devices.filter(d => d.status !== 'online');

  const avgCpu = onlineDevices.length
    ? Math.round(onlineDevices.reduce((sum, d) => sum + d.cpu, 0) / onlineDevices.length)
    : 0;
  const avgRam = onlineDevices.length
    ? Math.round(onlineDevices.reduce((sum, d) => sum + d.ram, 0) / onlineDevices.length)
    : 0;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Total Devices"
          value={devices.length.toString()}
          color="blue"
        />
        <StatCard
          icon={<Globe className="w-5 h-5" />}
          label="Online Now"
          value={onlineDevices.length.toString()}
          color="green"
        />
        <StatCard
          icon={<Cpu className="w-5 h-5" />}
          label="Avg CPU"
          value={`${avgCpu}%`}
          color="amber"
        />
        <StatCard
          icon={<MemoryStick className="w-5 h-5" />}
          label="Avg RAM"
          value={`${avgRam}%`}
          color="purple"
        />
      </div>

      {/* Online Devices */}
      {onlineDevices.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-400 pulse-online" />
            <h3 className="text-sm font-semibold text-slate-300">
              Online Devices ({onlineDevices.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {onlineDevices.map(device => (
              <DeviceCard
                key={device.id}
                device={device}
                isSelected={selectedDevice?.id === device.id}
                onSelect={() => onSelectDevice(device)}
                onAction={(action) => onAction(device, action)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Offline Devices */}
      {offlineDevices.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-slate-600" />
            <h3 className="text-sm font-semibold text-slate-500">
              Offline Devices ({offlineDevices.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {offlineDevices.map(device => (
              <DeviceCard
                key={device.id}
                device={device}
                isSelected={selectedDevice?.id === device.id}
                onSelect={() => onSelectDevice(device)}
                onAction={(action) => onAction(device, action)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'amber' | 'purple';
}) {
  const colorMap = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400',
    green: 'from-green-500/10 to-green-600/5 border-green-500/20 text-green-400',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-400',
  };

  return (
    <div className={`rounded-xl bg-gradient-to-br ${colorMap[color]} border p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function DeviceCard({ device, isSelected, onSelect, onAction }: {
  device: Device;
  isSelected: boolean;
  onSelect: () => void;
  onAction: (action: ViewMode) => void;
}) {
  const isOnline = device.status === 'online';

  return (
    <div
      className={`
        rounded-xl border transition-all animate-fade-in cursor-pointer
        ${isSelected
          ? 'bg-slate-800/80 border-blue-500/40 shadow-lg shadow-blue-500/5'
          : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600/60 hover:bg-slate-800/60'
        }
      `}
      onClick={onSelect}
    >
      {/* Card Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isOnline
                ? 'bg-green-500/10 text-green-400'
                : 'bg-slate-700/50 text-slate-500'
            }`}>
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">{device.name}</h4>
              <p className="text-[11px] text-slate-500">{device.hostname}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            isOnline
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-slate-700/50 text-slate-500 border border-slate-600/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-slate-500'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        {/* Device Info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <MapPin className="w-3 h-3 text-slate-500" />
            {device.location.city}, {device.location.country}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Globe className="w-3 h-3 text-slate-500" />
            {device.ip}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3 h-3 text-slate-500" />
            Uptime: {device.uptime}
          </div>
        </div>

        {/* Resource Bars */}
        {isOnline && (
          <div className="mt-3 space-y-2">
            <ResourceBar icon={<Cpu className="w-3 h-3" />} label="CPU" value={device.cpu} />
            <ResourceBar icon={<MemoryStick className="w-3 h-3" />} label="RAM" value={device.ram} />
            <ResourceBar icon={<HardDrive className="w-3 h-3" />} label="Disk" value={device.disk} />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-3 pt-1 border-t border-slate-700/30">
        <div className="flex items-center gap-1.5 mt-2">
          <ActionButton
            icon={<MonitorPlay className="w-3.5 h-3.5" />}
            label="Screen"
            onClick={(e) => { e.stopPropagation(); onAction('vnc'); }}
            disabled={!isOnline}
            color="blue"
          />
          <ActionButton
            icon={<Terminal className="w-3.5 h-3.5" />}
            label="Terminal"
            onClick={(e) => { e.stopPropagation(); onAction('terminal'); }}
            disabled={!isOnline}
            color="green"
          />
          <ActionButton
            icon={<FolderOpen className="w-3.5 h-3.5" />}
            label="Files"
            onClick={(e) => { e.stopPropagation(); onAction('files'); }}
            disabled={!isOnline}
            color="purple"
          />
        </div>
      </div>
    </div>
  );
}

function ResourceBar({ icon, label, value }: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  const getColor = (v: number) => {
    if (v >= 80) return 'bg-red-500';
    if (v >= 60) return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500">{icon}</span>
      <span className="text-[10px] text-slate-500 w-6">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${getColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-400 w-7 text-right">{value}%</span>
    </div>
  );
}

function ActionButton({ icon, label, onClick, disabled, color }: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  disabled: boolean;
  color: 'blue' | 'green' | 'purple';
}) {
  const colorMap = {
    blue: 'hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30',
    green: 'hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30',
    purple: 'hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/30',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg
        text-[11px] font-medium border border-slate-700/40
        text-slate-400 transition-all
        ${disabled ? 'opacity-40 cursor-not-allowed' : colorMap[color]}
      `}
    >
      {icon}
      {label}
    </button>
  );
}
