import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Warehouse,
  Truck,
  Navigation,
  Compass,
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
  Info,
} from 'lucide-react';
import { Location, Partner, Dispatch } from '../../types/dispatch.js';

export interface MapPoint {
  id: string;
  type: 'ORIGIN' | 'DELIVERY';
  label: string;
  businessName?: string;
  address: string;
  city: string;
  region: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
  activeDispatchesCount?: number;
  contactPerson?: string;
  phone?: string;
}

interface LocationsMapViewProps {
  locations: Location[];
  partners: Partner[];
  dispatches?: Dispatch[];
  onSelectPoint?: (point: MapPoint) => void;
}

// Coordinate fallbacks for cities if latitude/longitude is not explicitly saved
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Chicago: { lat: 41.8781, lng: -87.6298 },
  Joliet: { lat: 41.525, lng: -88.0817 },
  Minneapolis: { lat: 44.9778, lng: -93.265 },
  'Des Moines': { lat: 41.5868, lng: -93.625 },
  Seattle: { lat: 47.6062, lng: -122.3321 },
  Milwaukee: { lat: 43.0389, lng: -87.9065 },
  Detroit: { lat: 42.3314, lng: -83.0458 },
  Indianapolis: { lat: 39.7684, lng: -86.1581 },
};

export const LocationsMapView: React.FC<LocationsMapViewProps> = ({
  locations,
  partners,
  dispatches = [],
  onSelectPoint,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'ORIGIN' | 'DELIVERY'>('ALL');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [copiedCoord, setCopiedCoord] = useState<string | null>(null);

  // Compile all map points with validated coordinates
  const mapPoints: MapPoint[] = useMemo(() => {
    const list: MapPoint[] = [];

    // 1. Registered Dispatch Locations (Origins)
    locations.forEach((loc) => {
      let lat = loc.latitude;
      let lng = loc.longitude;
      if (lat === undefined || lng === undefined) {
        const fallback = CITY_COORDINATES[loc.city] || { lat: 41.8781, lng: -87.6298 };
        lat = fallback.lat;
        lng = fallback.lng;
      }
      list.push({
        id: loc.id,
        type: 'ORIGIN',
        label: loc.label,
        address: loc.addressLines,
        city: loc.city,
        region: loc.region,
        countryCode: loc.countryCode,
        latitude: lat,
        longitude: lng,
        isDefault: loc.isDefault,
      });
    });

    // 2. Active Delivery Points (Partners & active dispatch destinations)
    partners.forEach((part) => {
      let lat = part.latitude;
      let lng = part.longitude;
      if (lat === undefined || lng === undefined) {
        const fallback = CITY_COORDINATES[part.city] || { lat: 41.8818, lng: -87.6232 };
        lat = fallback.lat;
        lng = fallback.lng;
      }
      const activeCount = dispatches.filter(
        (d) =>
          d.partnerId === part.id &&
          ['DISPATCHED', 'VIEWED', 'IN_TRANSIT', 'RECEIPT_SUBMITTED', 'PARTIALLY_RECEIVED'].includes(
            d.status
          )
      ).length;

      list.push({
        id: part.id,
        type: 'DELIVERY',
        label: part.name,
        address: part.deliveryAddress,
        city: part.city,
        region: part.region,
        countryCode: part.countryCode,
        latitude: lat,
        longitude: lng,
        contactPerson: part.contactPerson,
        phone: part.phone,
        activeDispatchesCount: activeCount,
      });
    });

    return list;
  }, [locations, partners, dispatches]);

  const filteredPoints = useMemo(() => {
    if (filterType === 'ALL') return mapPoints;
    return mapPoints.filter((p) => p.type === filterType);
  }, [mapPoints, filterType]);

  // Compute map bounding box with padding
  const bounds = useMemo(() => {
    if (mapPoints.length === 0) {
      return { minLat: 38.0, maxLat: 48.0, minLng: -98.0, maxLng: -84.0 };
    }
    const lats = mapPoints.map((p) => p.latitude);
    const lngs = mapPoints.map((p) => p.longitude);
    const minLat = Math.min(...lats) - 1.5;
    const maxLat = Math.max(...lats) + 1.5;
    const minLng = Math.min(...lngs) - 2.0;
    const maxLng = Math.max(...lngs) + 2.0;
    return { minLat, maxLat, minLng, maxLng };
  }, [mapPoints]);

  // SVG coordinate transformation
  const svgWidth = 800;
  const svgHeight = 460;
  const padding = 50;

  const project = (lat: number, lng: number) => {
    const latSpan = bounds.maxLat - bounds.minLat || 1;
    const lngSpan = bounds.maxLng - bounds.minLng || 1;

    // Invert lat for Y (top is north)
    const y =
      svgHeight -
      padding -
      ((lat - bounds.minLat) / latSpan) * (svgHeight - padding * 2);
    // Standard X for lng (right is east, note negative values in western hemisphere)
    const x = padding + ((lng - bounds.minLng) / lngSpan) * (svgWidth - padding * 2);
    return { x, y };
  };

  const selectedPoint = useMemo(
    () => mapPoints.find((p) => p.id === selectedPointId) || null,
    [mapPoints, selectedPointId]
  );

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCoord(id);
    setTimeout(() => setCopiedCoord(null), 2000);
  };

  // Find active transit links between origin docks and delivery points
  const activeRoutes = useMemo(() => {
    const routes: Array<{
      id: string;
      from: { x: number; y: number; label: string };
      to: { x: number; y: number; label: string };
      dispatchNumber: string;
    }> = [];

    dispatches.forEach((d) => {
      if (
        ['DISPATCHED', 'VIEWED', 'IN_TRANSIT', 'RECEIPT_SUBMITTED', 'PARTIALLY_RECEIVED'].includes(
          d.status
        )
      ) {
        const originPoint = mapPoints.find(
          (p) =>
            p.type === 'ORIGIN' &&
            (p.id === d.originLocationSnapshot.locationId ||
              p.city.toLowerCase() === d.originLocationSnapshot.address.toLowerCase() ||
              p.label.toLowerCase() === d.originLocationSnapshot.label.toLowerCase())
        ) || mapPoints.find((p) => p.type === 'ORIGIN');

        const destPoint = mapPoints.find(
          (p) => p.type === 'DELIVERY' && p.id === d.partnerId
        );

        if (originPoint && destPoint) {
          const from = project(originPoint.latitude, originPoint.longitude);
          const to = project(destPoint.latitude, destPoint.longitude);
          routes.push({
            id: d.id,
            from: { ...from, label: originPoint.label },
            to: { ...to, label: destPoint.label },
            dispatchNumber: d.dispatchNumber,
          });
        }
      }
    });

    return routes;
  }, [dispatches, mapPoints, bounds]);

  return (
    <div className="space-y-4">
      {/* Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Compass className="w-4 h-4 text-sky-400" />
            <span>GIS Geographic Coordinates Network</span>
          </div>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">
            {locations.length} Origin Docks • {partners.length} Delivery Points
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Points ({mapPoints.length})
          </button>
          <button
            onClick={() => setFilterType('ORIGIN')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              filterType === 'ORIGIN'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Warehouse className="w-3.5 h-3.5 text-sky-400" />
            <span>Origins ({locations.length})</span>
          </button>
          <button
            onClick={() => setFilterType('DELIVERY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              filterType === 'DELIVERY'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Delivery Points ({partners.length})</span>
          </button>
        </div>
      </div>

      {/* Main Map View Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Interactive SVG Projection Canvas */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative shadow-lg">
          {/* Map Header Overlay */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Geospatial Coordinate View</span>
            <span className="text-slate-500 font-mono text-[10px]">
              [{bounds.minLat.toFixed(2)}°N, {bounds.minLng.toFixed(2)}°W] to [{bounds.maxLat.toFixed(2)}°N, {bounds.maxLng.toFixed(2)}°W]
            </span>
          </div>

          {/* SVG Map Canvas */}
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-[460px] select-none"
            style={{ backgroundColor: '#090d16' }}
          >
            <defs>
              {/* Radar Grid Pattern */}
              <pattern id="coordGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.75" strokeDasharray="2,2" />
              </pattern>

              {/* Glowing Filters */}
              <filter id="originGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.8" />
              </filter>
              <filter id="deliveryGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#34d399" floodOpacity="0.8" />
              </filter>

              {/* Gradient for transit corridors */}
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Background Grid */}
            <rect width={svgWidth} height={svgHeight} fill="url(#coordGrid)" />

            {/* Coordinate Lat/Lng Guide Lines */}
            {[0.25, 0.5, 0.75].map((pct, idx) => {
              const y = padding + (svgHeight - padding * 2) * pct;
              const latVal = (bounds.maxLat - (bounds.maxLat - bounds.minLat) * pct).toFixed(1);
              const x = padding + (svgWidth - padding * 2) * pct;
              const lngVal = (bounds.minLng + (bounds.maxLng - bounds.minLng) * pct).toFixed(1);

              return (
                <g key={`grid-guides-${idx}`}>
                  <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
                  <text x={padding - 8} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                    {latVal}°N
                  </text>

                  <line x1={x} y1={padding} x2={x} y2={svgHeight - padding} stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
                  <text x={x} y={svgHeight - padding + 15} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
                    {Math.abs(Number(lngVal))}°W
                  </text>
                </g>
              );
            })}

            {/* Active Freight Transit Routes (Corridors) */}
            {activeRoutes.map((route, i) => {
              const dx = route.to.x - route.from.x;
              const dy = route.to.y - route.from.y;
              const cx = (route.from.x + route.to.x) / 2 - dy * 0.15;
              const cy = (route.from.y + route.to.y) / 2 + dx * 0.15;
              const pathD = `M ${route.from.x} ${route.from.y} Q ${cx} ${cy} ${route.to.x} ${route.to.y}`;

              return (
                <g key={`route-${route.id}-${i}`}>
                  {/* Outer corridor blur */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="3"
                    strokeOpacity="0.3"
                  />
                  {/* Animated dashed line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="url(#routeGradient)"
                    strokeWidth="2"
                    strokeDasharray="6,4"
                    className="animate-pulse"
                  />
                </g>
              );
            })}

            {/* Render Map Points */}
            {filteredPoints.map((point) => {
              const { x, y } = project(point.latitude, point.longitude);
              const isSelected = selectedPointId === point.id;
              const isOrigin = point.type === 'ORIGIN';

              return (
                <g
                  key={point.id}
                  className="cursor-pointer transition-transform hover:scale-110"
                  onClick={() => {
                    setSelectedPointId(point.id);
                    if (onSelectPoint) onSelectPoint(point);
                  }}
                >
                  {/* Pulse Rings */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 18 : 12}
                    fill={isOrigin ? '#0284c7' : '#059669'}
                    fillOpacity="0.2"
                  >
                    <animate
                      attributeName="r"
                      values={isSelected ? '14;22;14' : '8;14;8'}
                      dur="2.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0.1;0.6"
                      dur="2.5s"
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Pin Body */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 8 : 6}
                    fill={isOrigin ? '#38bdf8' : '#34d399'}
                    stroke="#0f172a"
                    strokeWidth="2"
                    filter={isOrigin ? 'url(#originGlow)' : 'url(#deliveryGlow)'}
                  />

                  {/* Marker Center Dot */}
                  <circle cx={x} cy={y} r="2.5" fill="#ffffff" />

                  {/* Point Label Text */}
                  <text
                    x={x}
                    y={y - 12}
                    fill={isSelected ? '#ffffff' : '#cbd5e1'}
                    fontSize={isSelected ? '11' : '10'}
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    textAnchor="middle"
                    className="pointer-events-none drop-shadow-md"
                  >
                    {point.city}
                  </text>
                  <text
                    x={x}
                    y={y + 18}
                    fill="#94a3b8"
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    {point.latitude.toFixed(2)}°, {point.longitude.toFixed(2)}°
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Bottom Left Legend */}
          <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-[11px]">
            <div className="flex items-center gap-1.5 text-sky-300">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400"></span>
              <span className="font-semibold">Dispatch Origin Dock</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
              <span className="font-semibold">Delivery Destination</span>
            </div>
            {activeRoutes.length > 0 && (
              <div className="flex items-center gap-1.5 text-sky-400">
                <span className="w-4 h-0.5 bg-sky-400 border-t border-dashed"></span>
                <span>Active Freight Vector ({activeRoutes.length})</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Inspection Drawer / Points List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Geospatial Directory</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {filteredPoints.length} Points
              </span>
            </div>

            {/* Selected Point Telemetry Card */}
            {selectedPoint ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 mb-3">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        selectedPoint.type === 'ORIGIN'
                          ? 'bg-sky-950 text-sky-300 border-sky-800'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}
                    >
                      {selectedPoint.type === 'ORIGIN' ? 'Origin Terminal' : 'Delivery Destination'}
                    </span>
                    <h4 className="font-bold text-white text-xs mt-1.5">{selectedPoint.label}</h4>
                  </div>
                  {selectedPoint.isDefault && (
                    <span className="text-[10px] text-amber-300 font-semibold bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
                      Default
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-[11px] text-slate-300 border-t border-slate-800 pt-2">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <div>{selectedPoint.address}</div>
                      <div className="text-[10px] text-slate-400">
                        {selectedPoint.city}, {selectedPoint.region} {selectedPoint.countryCode}
                      </div>
                    </div>
                  </div>

                  {/* Coordinates Row with Copy button */}
                  <div className="bg-slate-900 rounded-lg p-2 border border-slate-800 mt-2 flex items-center justify-between font-mono text-[11px]">
                    <div className="text-sky-300">
                      {selectedPoint.latitude.toFixed(4)}° N, {Math.abs(selectedPoint.longitude).toFixed(4)}° W
                    </div>
                    <button
                      onClick={() =>
                        handleCopy(
                          `${selectedPoint.latitude}, ${selectedPoint.longitude}`,
                          selectedPoint.id
                        )
                      }
                      className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
                      title="Copy coordinates"
                    >
                      {copiedCoord === selectedPoint.id ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {selectedPoint.contactPerson && (
                    <div className="text-[10px] text-slate-400 pt-1">
                      <span className="text-slate-500 font-semibold">Contact:</span> {selectedPoint.contactPerson} ({selectedPoint.phone})
                    </div>
                  )}

                  {selectedPoint.activeDispatchesCount !== undefined && selectedPoint.activeDispatchesCount > 0 && (
                    <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 pt-1">
                      <Truck className="w-3 h-3" />
                      <span>{selectedPoint.activeDispatchesCount} Active In-Transit Shipment(s)</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center text-slate-400 text-xs mb-3">
                <Navigation className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                <div className="font-semibold text-slate-300 text-xs">Select a Coordinate Pin</div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Click any marker on the map to inspect dock coordinates and transit connections.
                </p>
              </div>
            )}

            {/* Scrollable list of points */}
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {filteredPoints.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPointId(p.id);
                    if (onSelectPoint) onSelectPoint(p);
                  }}
                  className={`w-full text-left p-2 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer border ${
                    selectedPointId === p.id
                      ? 'bg-slate-800 border-sky-500 text-white'
                      : 'bg-slate-950/50 hover:bg-slate-800/70 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold truncate flex items-center gap-1.5">
                      {p.type === 'ORIGIN' ? (
                        <Warehouse className="w-3 h-3 text-sky-400 shrink-0" />
                      ) : (
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      )}
                      <span className="truncate">{p.label}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {p.city} • {p.latitude.toFixed(2)}°, {p.longitude.toFixed(2)}°
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-2">
            Integrated coordinate projections synced with dispatch routing and receiving docks.
          </div>
        </div>
      </div>
    </div>
  );
};
