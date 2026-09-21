export interface DeviceLocation {
  lat: number;
  lng: number;
  city: string;
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
  sshPort: number;
  lastSeen: string;
  cpu: number;
  ram: number;
}

export type ViewMode = 'map' | 'vnc' | 'terminal';
