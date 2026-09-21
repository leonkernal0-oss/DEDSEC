export interface DeviceLocation {
  lat: number;
  lng: number;
  city: string;
  country: string;
}

export interface Device {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  os: string;
  status: 'online' | 'offline' | 'connecting';
  location: DeviceLocation;
  vncPort: number;
  wsPort: number;
  lastSeen: string;
  cpu: number;
  ram: number;
  disk: number;
  uptime: string;
  tunnelUrl: string;
}

export type ViewMode = 'dashboard' | 'vnc' | 'terminal' | 'files' | 'map';
