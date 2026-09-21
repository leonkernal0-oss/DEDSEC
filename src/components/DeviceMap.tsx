import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Device } from '../types';
import { MapPin, Cpu, HardDrive } from 'lucide-react';

// Fix leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const onlineIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="width:20px;height:20px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:50%;border:3px solid #0f172a;box-shadow:0 0 10px rgba(34,197,94,0.5);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const offlineIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="width:16px;height:16px;background:#475569;border-radius:50%;border:3px solid #0f172a;box-shadow:0 0 6px rgba(71,85,105,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const selectedIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="width:24px;height:24px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:50%;border:3px solid #0f172a;box-shadow:0 0 15px rgba(59,130,246,0.6);animation:pulse 2s infinite;"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface DeviceMapProps {
  devices: Device[];
  selectedDevice: Device | null;
  onSelectDevice: (device: Device) => void;
}

function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 5, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

export function DeviceMap({ devices, selectedDevice, onSelectDevice }: DeviceMapProps) {
  const defaultCenter: [number, number] = [30, 0];

  const center: [number, number] | null = selectedDevice
    ? [selectedDevice.location.lat, selectedDevice.location.lng]
    : null;

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={defaultCenter}
        zoom={2}
        minZoom={2}
        maxZoom={18}
        className="w-full h-full"
        style={{ background: '#0f172a' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        />
        <MapUpdater center={center} />
        {devices.map(device => (
          <Marker
            key={device.id}
            position={[device.location.lat, device.location.lng]}
            icon={
              selectedDevice?.id === device.id
                ? selectedIcon
                : device.status === 'online'
                ? onlineIcon
                : offlineIcon
            }
            eventHandlers={{
              click: () => onSelectDevice(device),
            }}
          >
            <Popup>
              <div className="p-1 min-w-[180px]">
                <h3 className="font-bold text-sm text-slate-800">{device.name}</h3>
                <p className="text-xs text-slate-600">{device.hostname}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <MapPin className="w-3 h-3" />
                    {device.location.city}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <Cpu className="w-3 h-3" />
                    CPU: {device.cpu}% | RAM: {device.ram}%
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <HardDrive className="w-3 h-3" />
                    {device.os}
                  </div>
                  <div className={`text-xs font-medium mt-1 ${
                    device.status === 'online' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {device.status === 'online' ? '● Online' : '● Offline'}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700 z-[1000]">
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Legend</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            Online
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-3 h-3 rounded-full bg-slate-500" />
            Offline
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
            Selected
          </div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700 z-[1000]">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{devices.filter(d => d.status === 'online').length}</div>
          <div className="text-xs text-slate-500">Active Devices</div>
        </div>
      </div>
    </div>
  );
}
