import { useState, useEffect } from 'react';
import { Device, ViewMode } from './types';
import { DashboardView } from './components/DashboardView';
import { VNCViewer } from './components/VNCViewer';
import { PowerShellTerminal } from './components/PowerShellTerminal';
import { FileManager } from './components/FileManager';
import { DeviceMapView } from './components/DeviceMapView';
import {
  LayoutDashboard,
  MonitorPlay,
  Terminal,
  FolderOpen,
  Map,
  Wifi,
  Menu,
  X,
} from 'lucide-react';

const DEMO_DEVICES: Device[] = [
  {
    id: 'dev-001',
    name: 'Work Desktop',
    hostname: 'WORK-PC-01',
    ip: '192.168.1.100',
    publicIp: '73.162.45.12',
    os: 'Windows 11 Pro',
    status: 'online',
    location: { lat: 40.7128, lng: -74.006, city: 'New York', country: 'US' },
    vncPort: 5900,
    wsPort: 6080,
    sshPort: 22,
    lastSeen: new Date().toISOString(),
    cpu: 34,
    ram: 67,
    disk: 45,
    uptime: '3d 14h 22m',
    tunnelUrl: 'wss://work-pc.trycloudflare.com',
  },
  {
    id: 'dev-002',
    name: 'Home Laptop',
    hostname: 'HOME-LAPTOP',
    ip: '192.168.1.105',
    publicIp: '98.45.67.89',
    os: 'Windows 10 Home',
    status: 'online',
    location: { lat: 34.0522, lng: -118.2437, city: 'Los Angeles', country: 'US' },
    vncPort: 5900,
    wsPort: 6080,
    sshPort: 22,
    lastSeen: new Date().toISOString(),
    cpu: 12,
    ram: 45,
    disk: 72,
    uptime: '1d 8h 5m',
    tunnelUrl: 'wss://home-laptop.trycloudflare.com',
  },
  {
    id: 'dev-003',
    name: 'Server Room',
    hostname: 'SRV-ROOM-01',
    ip: '192.168.1.200',
    publicIp: '51.12.34.56',
    os: 'Windows Server 2022',
    status: 'online',
    location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
    vncPort: 5900,
    wsPort: 6080,
    sshPort: 22,
    lastSeen: new Date().toISOString(),
    cpu: 78,
    ram: 89,
    disk: 34,
    uptime: '45d 2h 11m',
    tunnelUrl: 'wss://srv-room.trycloudflare.com',
  },
  {
    id: 'dev-004',
    name: 'Dev Machine',
    hostname: 'DEV-PC',
    ip: '192.168.1.110',
    publicIp: '82.64.12.98',
    os: 'Windows 11 Pro',
    status: 'offline',
    location: { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'FR' },
    vncPort: 5900,
    wsPort: 6080,
    sshPort: 22,
    lastSeen: '2024-01-15T10:30:00Z',
    cpu: 0,
    ram: 0,
    disk: 56,
    uptime: '0m',
  },
  {
    id: 'dev-005',
    name: 'Media PC',
    hostname: 'MEDIA-CENTER',
    ip: '192.168.1.120',
    publicIp: '126.45.78.90',
    os: 'Windows 10 Pro',
    status: 'online',
    location: { lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'JP' },
    vncPort: 5900,
    wsPort: 6080,
    sshPort: 22,
    lastSeen: new Date().toISOString(),
    cpu: 5,
    ram: 32,
    disk: 88,
    uptime: '12d 6h 44m',
    tunnelUrl: 'wss://media-pc.trycloudflare.com',
  },
  {
    id: 'dev-006',
    name: 'Gaming Rig',
    hostname: 'GAMING-PC',
    ip: '192.168.1.130',
    publicIp: '203.45.67.12',
    os: 'Windows 11 Pro',
    status: 'online',
    location: { lat: -33.8688, lng: 151.2093, city: 'Sydney', country: 'AU' },
    vncPort: 5900,
    wsPort: 6080,
    sshPort: 22,
    lastSeen: new Date().toISOString(),
    cpu: 22,
    ram: 55,
    disk: 61,
    uptime: '7d 3h 18m',
    tunnelUrl: 'wss://gaming-pc.trycloudflare.com',
  },
];

function App() {
  const [devices, setDevices] = useState<Device[]>(DEMO_DEVICES);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const onlineCount = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;

  // Simulate live CPU/RAM updates
  useEffect(() => {
    const interval = setInterval(() => {
      setDevices(prev =>
        prev.map(d =>
          d.status === 'online'
            ? {
                ...d,
                cpu: Math.max(1, Math.min(99, d.cpu + Math.floor(Math.random() * 11) - 5)),
                ram: Math.max(10, Math.min(99, d.ram + Math.floor(Math.random() * 7) - 3)),
              }
            : d
        )
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectDevice = (device: Device) => {
    setSelectedDevice(device);
    setMobileSidebarOpen(false);
  };

  const handleAction = (device: Device, action: ViewMode) => {
    setSelectedDevice(device);
    setViewMode(action);
    setMobileSidebarOpen(false);
  };

  const navItems = [
    { id: 'dashboard' as ViewMode, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'map' as ViewMode, icon: Map, label: 'Device Map' },
    { id: 'vnc' as ViewMode, icon: MonitorPlay, label: 'Screen Control' },
    { id: 'terminal' as ViewMode, icon: Terminal, label: 'PowerShell' },
    { id: 'files' as ViewMode, icon: FolderOpen, label: 'File Manager' },
  ];

  return (
    <div className="h-screen w-screen flex bg-[#0a0e1a] text-slate-200 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-50 h-full
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarOpen ? 'w-72' : 'w-16'}
          transition-all duration-300 ease-in-out
          bg-[#0d1225] border-r border-slate-800/80 flex flex-col shrink-0
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 shrink-0">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5 animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <i className="fa-solid fa-desktop text-white text-sm" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight">RemoteDesk</h1>
                <p className="text-[10px] text-slate-500 -mt-0.5">Control Center</p>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) setMobileSidebarOpen(false);
              else setSidebarOpen(!sidebarOpen);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {sidebarOpen ? <X className="w-4 h-4 text-slate-400" /> : <Menu className="w-4 h-4 text-slate-400" />}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = viewMode === item.id;
            const isDisabled = (item.id === 'vnc' || item.id === 'terminal' || item.id === 'files') && !selectedDevice;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!isDisabled) setViewMode(item.id);
                }}
                disabled={isDisabled}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5'
                    : isDisabled
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }
                `}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {sidebarOpen && <span className="animate-fade-in">{item.label}</span>}
                {isActive && sidebarOpen && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Device List in Sidebar */}
        {sidebarOpen && (
          <div className="border-t border-slate-800/80 shrink-0">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Devices
              </span>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-[10px] text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  {onlineCount}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  {offlineCount}
                </span>
              </div>
            </div>
            <div className="px-2 pb-2 max-h-[40vh] overflow-y-auto space-y-0.5">
              {devices.map(device => (
                <button
                  key={device.id}
                  onClick={() => handleSelectDevice(device)}
                  className={`
                    w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all
                    ${selectedDevice?.id === device.id
                      ? 'bg-slate-800/80 border border-slate-700/60'
                      : 'hover:bg-slate-800/40 border border-transparent'
                    }
                  `}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    device.status === 'online'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-slate-800 text-slate-600'
                  }`}>
                    <i className={`fa-solid fa-${device.os.includes('Server') ? 'server' : 'computer'} text-xs`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-slate-200 truncate">{device.name}</span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        device.status === 'online' ? 'bg-green-400 pulse-online' : 'bg-slate-600'
                      }`} />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{device.location.city}, {device.location.country}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-[#0d1225]/80 backdrop-blur-xl border-b border-slate-800/80 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {viewMode === 'dashboard' && 'Dashboard'}
                {viewMode === 'map' && 'Device Map'}
                {viewMode === 'vnc' && `Screen Control — ${selectedDevice?.name || ''}`}
                {viewMode === 'terminal' && `PowerShell — ${selectedDevice?.name || ''}`}
                {viewMode === 'files' && `File Manager — ${selectedDevice?.name || ''}`}
              </h2>
              <p className="text-[11px] text-slate-500">
                {viewMode === 'dashboard' && `${onlineCount} devices online, ${offlineCount} offline`}
                {viewMode === 'map' && 'Geographic view of all connected devices'}
                {viewMode === 'vnc' && selectedDevice && `Remote desktop via noVNC • ${selectedDevice.location.city}`}
                {viewMode === 'terminal' && selectedDevice && 'Remote PowerShell session'}
                {viewMode === 'files' && selectedDevice && 'Browse and manage remote files'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40">
              <Wifi className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-medium text-green-400">{onlineCount}</span>
              <span className="text-[10px] text-slate-500">/</span>
              <span className="text-xs text-slate-400">{devices.length}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
              A
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          {viewMode === 'dashboard' && (
            <DashboardView
              devices={devices}
              selectedDevice={selectedDevice}
              onSelectDevice={handleSelectDevice}
              onAction={handleAction}
            />
          )}
          {viewMode === 'map' && (
            <DeviceMapView
              devices={devices}
              selectedDevice={selectedDevice}
              onSelectDevice={handleSelectDevice}
              onAction={handleAction}
            />
          )}
          {viewMode === 'vnc' && <VNCViewer device={selectedDevice} />}
          {viewMode === 'terminal' && <PowerShellTerminal device={selectedDevice} />}
          {viewMode === 'files' && <FileManager device={selectedDevice} />}
        </main>
      </div>
    </div>
  );
}

export default App;
