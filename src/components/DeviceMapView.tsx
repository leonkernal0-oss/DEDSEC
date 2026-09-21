import { Device, ViewMode } from '../types';
import { MonitorPlay, Terminal, FolderOpen, MapPin } from 'lucide-react';
import { useState } from 'react';

interface DeviceMapViewProps {
  devices: Device[];
  selectedDevice: Device | null;
  onSelectDevice: (device: Device) => void;
  onAction: (device: Device, action: ViewMode) => void;
}

// Convert lat/lng to SVG coordinates (simple equirectangular projection)
function latLngToXY(lat: number, lng: number, width: number, height: number) {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

export function DeviceMapView({ devices, selectedDevice, onSelectDevice, onAction }: DeviceMapViewProps) {
  const [hoveredDevice, setHoveredDevice] = useState<Device | null>(null);
  const width = 1000;
  const height = 500;

  return (
    <div className="h-full overflow-y-auto bg-[#0a0e1a] p-4 md:p-6">
      {/* Map Container */}
      <div className="rounded-xl bg-[#0d1225] border border-slate-800/80 overflow-hidden">
        <div className="relative w-full" style={{ paddingBottom: '50%' }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="absolute inset-0 w-full h-full"
            style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d1225 100%)' }}
          >
            {/* Grid lines */}
            {Array.from({ length: 19 }, (_, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={(i * height) / 18}
                x2={width}
                y2={(i * height) / 18}
                stroke="#1e293b"
                strokeWidth="0.5"
                strokeDasharray="4,4"
              />
            ))}
            {Array.from({ length: 37 }, (_, i) => (
              <line
                key={`v-${i}`}
                x1={(i * width) / 36}
                y1={0}
                x2={(i * width) / 36}
                y2={height}
                stroke="#1e293b"
                strokeWidth="0.5"
                strokeDasharray="4,4"
              />
            ))}

            {/* Simplified continent outlines */}
            {/* North America */}
            <path
              d="M 120,80 L 180,70 L 220,90 L 240,120 L 260,140 L 250,170 L 230,190 L 200,200 L 180,210 L 160,200 L 140,180 L 120,160 L 110,130 L 105,100 Z"
              fill="#1e293b"
              fillOpacity="0.4"
              stroke="#334155"
              strokeWidth="1"
            />
            {/* South America */}
            <path
              d="M 220,230 L 250,220 L 270,240 L 280,280 L 270,320 L 260,360 L 240,380 L 230,370 L 220,340 L 210,300 L 215,260 Z"
              fill="#1e293b"
              fillOpacity="0.4"
              stroke="#334155"
              strokeWidth="1"
            />
            {/* Europe */}
            <path
              d="M 440,80 L 480,70 L 520,80 L 530,100 L 520,120 L 500,130 L 480,125 L 460,120 L 450,100 Z"
              fill="#1e293b"
              fillOpacity="0.4"
              stroke="#334155"
              strokeWidth="1"
            />
            {/* Africa */}
            <path
              d="M 460,150 L 500,140 L 530,160 L 540,200 L 530,250 L 510,290 L 490,310 L 470,300 L 460,260 L 450,220 L 455,180 Z"
              fill="#1e293b"
              fillOpacity="0.4"
              stroke="#334155"
              strokeWidth="1"
            />
            {/* Asia */}
            <path
              d="M 540,60 L 620,50 L 700,60 L 760,80 L 800,100 L 810,130 L 790,150 L 750,160 L 700,170 L 650,160 L 600,150 L 560,130 L 540,100 Z"
              fill="#1e293b"
              fillOpacity="0.4"
              stroke="#334155"
              strokeWidth="1"
            />
            {/* Australia */}
            <path
              d="M 760,280 L 810,270 L 850,280 L 860,310 L 840,330 L 800,340 L 770,330 L 760,310 Z"
              fill="#1e293b"
              fillOpacity="0.4"
              stroke="#334155"
              strokeWidth="1"
            />

            {/* Connection lines between devices */}
            {devices.filter(d => d.status === 'online').map((device, i, arr) => {
              if (i === 0) return null;
              const prev = arr[0];
              const from = latLngToXY(prev.location.lat, prev.location.lng, width, height);
              const to = latLngToXY(device.location.lat, device.location.lng, width, height);
              return (
                <line
                  key={`line-${device.id}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#3b82f6"
                  strokeWidth="0.5"
                  strokeOpacity="0.3"
                  strokeDasharray="4,4"
                />
              );
            })}

            {/* Device markers */}
            {devices.map(device => {
              const { x, y } = latLngToXY(device.location.lat, device.location.lng, width, height);
              const isOnline = device.status === 'online';
              const isSelected = selectedDevice?.id === device.id;
              const isHovered = hoveredDevice?.id === device.id;

              return (
                <g
                  key={device.id}
                  className="cursor-pointer"
                  onClick={() => onSelectDevice(device)}
                  onMouseEnter={() => setHoveredDevice(device)}
                  onMouseLeave={() => setHoveredDevice(null)}
                >
                  {/* Pulse ring for online devices */}
                  {isOnline && (
                    <>
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 20 : 14}
                        fill="none"
                        stroke={isSelected ? '#3b82f6' : '#22c55e'}
                        strokeWidth="1"
                        strokeOpacity="0.3"
                      >
                        <animate
                          attributeName="r"
                          values={isSelected ? "20;28;20" : "14;20;14"}
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="stroke-opacity"
                          values="0.3;0;0.3"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </>
                  )}

                  {/* Main dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 8 : isHovered ? 7 : 5}
                    fill={isOnline ? (isSelected ? '#3b82f6' : '#22c55e') : '#475569'}
                    stroke={isSelected ? '#60a5fa' : isHovered ? '#4ade80' : 'none'}
                    strokeWidth="2"
                    className="transition-all duration-200"
                  />

                  {/* Label */}
                  {(isSelected || isHovered) && (
                    <g>
                      <rect
                        x={x - 50}
                        y={y - 35}
                        width={100}
                        height={22}
                        rx={4}
                        fill="#1e293b"
                        stroke="#334155"
                        strokeWidth="1"
                        fillOpacity="0.95"
                      />
                      <text
                        x={x}
                        y={y - 21}
                        textAnchor="middle"
                        fill="#e2e8f0"
                        fontSize="10"
                        fontWeight="500"
                      >
                        {device.name}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Device Details Panel */}
      {selectedDevice && (
        <div className="mt-4 rounded-xl bg-[#0d1225] border border-slate-800/80 p-5 animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedDevice.status === 'online'
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-slate-700/50 text-slate-500'
              }`}>
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedDevice.name}</h3>
                <p className="text-sm text-slate-500">
                  {selectedDevice.location.city}, {selectedDevice.location.country}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              selectedDevice.status === 'online'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-slate-700/50 text-slate-500 border border-slate-600/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                selectedDevice.status === 'online' ? 'bg-green-400' : 'bg-slate-500'
              }`} />
              {selectedDevice.status === 'online' ? 'Online' : 'Offline'}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">IP Address</p>
              <p className="text-sm text-slate-200 font-mono">{selectedDevice.ip}</p>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">OS</p>
              <p className="text-sm text-slate-200">{selectedDevice.os}</p>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Uptime</p>
              <p className="text-sm text-slate-200">{selectedDevice.uptime}</p>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Coordinates</p>
              <p className="text-sm text-slate-200 font-mono">
                {selectedDevice.location.lat.toFixed(2)}, {selectedDevice.location.lng.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {selectedDevice.status === 'online' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAction(selectedDevice, 'vnc')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 transition-colors text-sm font-medium"
              >
                <MonitorPlay className="w-4 h-4" />
                Screen Control
              </button>
              <button
                onClick={() => onAction(selectedDevice, 'terminal')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/10 text-green-400 border border-green-500/20 hover:bg-green-600/20 transition-colors text-sm font-medium"
              >
                <Terminal className="w-4 h-4" />
                PowerShell
              </button>
              <button
                onClick={() => onAction(selectedDevice, 'files')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/10 text-purple-400 border border-purple-500/20 hover:bg-purple-600/20 transition-colors text-sm font-medium"
              >
                <FolderOpen className="w-4 h-4" />
                File Manager
              </button>
            </div>
          )}
        </div>
      )}

      {/* Device list below map */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {devices.map(device => (
          <button
            key={device.id}
            onClick={() => onSelectDevice(device)}
            className={`
              flex items-center gap-3 p-3 rounded-xl text-left transition-all
              ${selectedDevice?.id === device.id
                ? 'bg-slate-800/80 border border-blue-500/30'
                : 'bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50'
              }
            `}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              device.status === 'online'
                ? 'bg-green-500/10 text-green-400'
                : 'bg-slate-700/50 text-slate-500'
            }`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200 truncate">{device.name}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  device.status === 'online' ? 'bg-green-400' : 'bg-slate-600'
                }`} />
              </div>
              <p className="text-xs text-slate-500 truncate">
                {device.location.city}, {device.location.country}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
