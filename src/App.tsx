import { useState, useEffect, useCallback } from 'react';
import { DeviceList } from './components/DeviceList';
import { DeviceMap } from './components/DeviceMap';
import { VNCViewer } from './components/VNCViewer';
import { PowerShellTerminal } from './components/PowerShellTerminal';
import { Device, ViewMode } from './types';
import { Monitor, Map, Terminal, MonitorPlay, Wifi, Settings, RefreshCw } from 'lucide-react';

// Simulated devices for demo - in production these come from your backend
const DEMO_DEVICES: Device[] = [
  {
    id: 'dev-001',
    name: 'Work-Desktop',
    hostname: 'WORK-PC-01',
    ip: '192.168.1.100',
    os: 'Windows 11 Pro',
    status: 'online',
    location: { lat: 40.7128, lng: -74.0060, city: 'New York, US' },
    vncPort: 5900,
    wsPort: 6080,
    sshPort: 22,
    lastSeen: new Date().toISOString(),
    cpu: 34,
    ram: 67,
  },
  {
    id: 'dev-002',
    name: 'Home-Laptop',
    hostname: 'HOME-LAPTOP',
    ip: '192.168.1.105',
    os: 'Windows 10 Home',
    status: 'online',
    location: { lat: 34.0522, lng: -118.2437, city: 'Los Angeles, US' },
    vncPort: 5900,
    wsPort: 6080,
    sshPort: 22,
    lastSeen: new Date().toISOString(),
    cpu: 12,
    ram: 45,
  },
  {
    id: 'dev-003',
    name: 'Server-Room-01',
    hostname: 'SRV-ROOM-01',
    ip: '192.168.1.200',
    os: 'Windows Server 2022',
    status: 'online',
    location: { lat: 51.5074, lng: -0.1278, city: 'London, UK' },
    vncPort: 5900,
    wsPort: 6080,
    sshPort: 22,
    lastSeen: new Date().toISOString(),
    cpu: 78,
    ram: 89,
  },
  {
    id: 'dev-004',
    name: 'Dev-Machine',
    hostname: 'DEV-PC',
    ip: '192.168.1.110',
    os: 'Windows 11 Pro',
    status: 'offline',
    location: { lat: 48.8566, lng: 2.3522, city: 'Paris, FR' },
    vncPort: 5900,
    wsPort: 6080,
    sshPort: 22,
    lastSeen: '2024-01-15T10:30:00Z',
    cpu: 0,
    ram: 0,
  },
  {
    id: 'dev-005',
    name: 'Media-PC',
    hostname: 'MEDIA-CENTER',
    ip: '192.168.1.120',
    os: 'Windows 10 Pro',
    status: 'online',
    location: { lat: 35.6762, lng: 139.6503, city: 'Tokyo, JP' },
    vncPort: 5900,
    wsPort: 6080,
    sshPort: 22,
    lastSeen: new Date().toISOString(),
    cpu: 5,
    ram: 32,
  },
];

function App() {
  const [devices, setDevices] = useState<Device[]>(DEMO_DEVICES);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onlineCount = devices.filter(d => d.status === 'online').length;

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  }, []);

  const handleSelectDevice = (device: Device) => {
    setSelectedDevice(device);
    setViewMode('vnc');
  };

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-200 overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between px-4 shrink-0 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            RemoteDesk
          </h1>
          <span className="text-xs text-slate-500 hidden sm:inline">| Device Control Center</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Wifi className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-medium">{onlineCount}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{devices.length}</span>
            <span className="text-slate-500 hidden sm:inline">online</span>
          </div>

          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
            title="Refresh devices"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button className="p-2 rounded-lg hover:bg-slate-700 transition-colors" title="Settings">
            <Settings className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Device List */}
        {sidebarOpen && (
          <aside className="w-72 bg-slate-800/50 border-r border-slate-700 flex flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-slate-700">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Connected Devices
              </h2>
            </div>
            <DeviceList
              devices={devices}
              selectedDevice={selectedDevice}
              onSelectDevice={handleSelectDevice}
            />
          </aside>
        )}

        {/* Main Panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* View Mode Tabs */}
          <div className="h-11 bg-slate-800/30 border-b border-slate-700 flex items-center px-2 gap-1 shrink-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded hover:bg-slate-700 transition-colors mr-2"
              title="Toggle sidebar"
            >
              <Monitor className="w-4 h-4 text-slate-400" />
            </button>

            <TabButton
              active={viewMode === 'map'}
              onClick={() => setViewMode('map')}
              icon={<Map className="w-4 h-4" />}
              label="Device Map"
            />
            <TabButton
              active={viewMode === 'vnc'}
              onClick={() => setViewMode('vnc')}
              icon={<MonitorPlay className="w-4 h-4" />}
              label="Screen Control (VNC)"
            />
            <TabButton
              active={viewMode === 'terminal'}
              onClick={() => setViewMode('terminal')}
              icon={<Terminal className="w-4 h-4" />}
              label="PowerShell"
            />

            {selectedDevice && (
              <div className="ml-auto flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${selectedDevice.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-slate-400">{selectedDevice.name}</span>
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {viewMode === 'map' && (
              <DeviceMap
                devices={devices}
                selectedDevice={selectedDevice}
                onSelectDevice={handleSelectDevice}
              />
            )}
            {viewMode === 'vnc' && (
              <VNCViewer device={selectedDevice} />
            )}
            {viewMode === 'terminal' && (
              <PowerShellTerminal device={selectedDevice} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
        active
          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
      }`}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

export default App;
