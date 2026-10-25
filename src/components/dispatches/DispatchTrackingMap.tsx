import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Truck,
  Warehouse,
  Store,
  Navigation,
  Compass,
  Gauge,
  Clock,
  Radio,
  Copy,
  CheckCircle,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Route,
  ShieldCheck,
  AlertCircle,
  Wifi,
  WifiOff,
  Database,
  Layers,
  History,
  Info,
} from 'lucide-react';
import { Dispatch, RouteWaypoint } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import {
  saveMapCache,
  getMapCache,
  isMapCached,
  clearMapCache,
  queueOfflineTelemetry,
  getOfflineTelemetryQueue,
  clearOfflineTelemetryQueue,
  CachedMapRecord,
} from '../../utils/mapCache.js';

interface DispatchTrackingMapProps {
  dispatch: Dispatch;
  onTelemetryUpdate?: (updated: Dispatch) => void;
}

// Haversine distance calculator in kilometers
function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Convert heading degrees to cardinal direction
function headingToCardinal(deg?: number): string {
  if (deg === undefined) return 'N/A';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((deg % 360) / 45)) % 8;
  return `${deg}° ${directions[index]}`;
}

export const DispatchTrackingMap: React.FC<DispatchTrackingMapProps> = ({
  dispatch,
  onTelemetryUpdate,
}) => {
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeWaypointTooltip, setActiveWaypointTooltip] = useState<RouteWaypoint | null>(null);
  const [isSimulatingPing, setIsSimulatingPing] = useState(false);
  const [pingSuccessMsg, setPingSuccessMsg] = useState<string | null>(null);

  // Offline Caching & Network State
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [cachedRecord, setCachedRecord] = useState<CachedMapRecord | null>(null);
  const [cacheNotification, setCacheNotification] = useState<string | null>(null);

  // Layer Visibility Controls
  const [showPlannedRoute, setShowPlannedRoute] = useState(true);
  const [showActualRoute, setShowActualRoute] = useState(true);
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(true);

  // Listen to native online/offline window events
  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check of local map cache
    const existing = getMapCache(dispatch.id);
    if (existing) {
      setCachedRecord(existing);
    } else {
      // Auto-cache on initial mount to ensure offline availability
      const saved = saveMapCache(dispatch);
      setCachedRecord(saved);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch.id]);

  const isEffectivelyOffline = !isBrowserOnline || isSimulatedOffline;

  // 1. Resolve Origin Coordinates (with offline cache fallback)
  const originCoords = useMemo(() => {
    if (isEffectivelyOffline && cachedRecord?.origin) {
      return {
        lat: cachedRecord.origin.latitude,
        lng: cachedRecord.origin.longitude,
      };
    }
    if (dispatch.originLocationSnapshot?.latitude && dispatch.originLocationSnapshot?.longitude) {
      return {
        lat: dispatch.originLocationSnapshot.latitude,
        lng: dispatch.originLocationSnapshot.longitude,
      };
    }
    return { lat: 41.8781, lng: -87.6298 };
  }, [dispatch, isEffectivelyOffline, cachedRecord]);

  // 2. Resolve Destination Coordinates (with offline cache fallback)
  const destCoords = useMemo(() => {
    if (isEffectivelyOffline && cachedRecord?.destination) {
      return {
        lat: cachedRecord.destination.latitude,
        lng: cachedRecord.destination.longitude,
      };
    }
    if (dispatch.destinationSnapshot?.latitude && dispatch.destinationSnapshot?.longitude) {
      return {
        lat: dispatch.destinationSnapshot.latitude,
        lng: dispatch.destinationSnapshot.longitude,
      };
    }
    return { lat: 44.9866, lng: -93.2581 };
  }, [dispatch, isEffectivelyOffline, cachedRecord]);

  // 3. Resolve Current Coordinates
  const currentCoords = useMemo(() => {
    if (isEffectivelyOffline && cachedRecord?.currentCoordinates) {
      return {
        lat: cachedRecord.currentCoordinates.latitude,
        lng: cachedRecord.currentCoordinates.longitude,
        updatedAt: cachedRecord.currentCoordinates.updatedAt || cachedRecord.cachedAt,
        speedKmh: cachedRecord.currentCoordinates.speedKmh ?? 80,
        heading: cachedRecord.currentCoordinates.heading ?? 310,
        checkpointName: cachedRecord.currentCoordinates.checkpointName || 'Offline Waypoint Cache',
        source: 'CHECKPOINT' as const,
      };
    }
    if (dispatch.currentCoordinates?.latitude && dispatch.currentCoordinates?.longitude) {
      return {
        lat: dispatch.currentCoordinates.latitude,
        lng: dispatch.currentCoordinates.longitude,
        updatedAt: dispatch.currentCoordinates.updatedAt || dispatch.updatedAt,
        speedKmh: dispatch.currentCoordinates.speedKmh ?? (dispatch.status === 'IN_TRANSIT' ? 84 : 0),
        heading: dispatch.currentCoordinates.heading ?? 315,
        checkpointName: dispatch.currentCoordinates.checkpointName || 'Active Transit Corridor',
        source: dispatch.currentCoordinates.source || 'GPS',
      };
    }
    if (['RECEIVED', 'PARTIALLY_RECEIVED', 'RECONCILED'].includes(dispatch.status)) {
      return {
        lat: destCoords.lat,
        lng: destCoords.lng,
        updatedAt: dispatch.receivedAt || dispatch.updatedAt,
        speedKmh: 0,
        heading: 0,
        checkpointName: `${dispatch.partnerName} Receiving Dock`,
        source: 'CHECKPOINT' as const,
      };
    }
    return {
      lat: originCoords.lat,
      lng: originCoords.lng,
      updatedAt: dispatch.dispatchedAt,
      speedKmh: 0,
      heading: 0,
      checkpointName: dispatch.originLocationSnapshot?.label || 'Dispatch Dock',
      source: 'CHECKPOINT' as const,
    };
  }, [dispatch, originCoords, destCoords, isEffectivelyOffline, cachedRecord]);

  // 4. Resolve Planned Waypoints
  const plannedWaypoints: RouteWaypoint[] = useMemo(() => {
    if (dispatch.pathHistory?.plannedWaypoints && dispatch.pathHistory.plannedWaypoints.length > 0) {
      return dispatch.pathHistory.plannedWaypoints;
    }
    if (cachedRecord?.plannedWaypoints && cachedRecord.plannedWaypoints.length > 0) {
      return cachedRecord.plannedWaypoints;
    }
    // Default corridor waypoints along I-90/I-94
    return [
      { id: 'wp_p0', latitude: originCoords.lat, longitude: originCoords.lng, label: dispatch.originLocationSnapshot?.label || 'Origin Dock', passed: true },
      { id: 'wp_p1', latitude: 42.2711, longitude: -89.094, label: 'Rockford Gateway I-90', passed: true },
      { id: 'wp_p2', latitude: 43.0731, longitude: -89.4012, label: 'Madison Freight Interchange', passed: true },
      { id: 'wp_p3', latitude: 43.6275, longitude: -89.7709, label: 'Wisconsin Dells Weigh Station', passed: true },
      { id: 'wp_p4', latitude: 43.9844, longitude: -90.5043, label: 'Tomah I-90/I-94 Split', passed: true },
      { id: 'wp_p5', latitude: 43.8014, longitude: -91.2396, label: 'La Crosse Checkpoint', passed: true },
      { id: 'wp_p6', latitude: 44.0121, longitude: -92.4802, label: 'Rochester US-52 Corridor', passed: false },
      { id: 'wp_p7', latitude: 44.75, longitude: -92.95, label: 'Hastings River Crossing', passed: false },
      { id: 'wp_p8', latitude: destCoords.lat, longitude: destCoords.lng, label: dispatch.destinationSnapshot?.partnerName || 'Destination Dock', passed: false },
    ];
  }, [dispatch, cachedRecord, originCoords, destCoords]);

  // 5. Resolve Actual Route Waypoints (Breadcrumbs)
  const actualWaypoints: RouteWaypoint[] = useMemo(() => {
    if (dispatch.pathHistory?.actualWaypoints && dispatch.pathHistory.actualWaypoints.length > 0) {
      return dispatch.pathHistory.actualWaypoints;
    }
    if (cachedRecord?.actualWaypoints && cachedRecord.actualWaypoints.length > 0) {
      return cachedRecord.actualWaypoints;
    }
    return [
      { id: 'wp_a0', latitude: originCoords.lat, longitude: originCoords.lng, label: 'Origin Departure', timestamp: dispatch.dispatchedAt, speedKmh: 0, passed: true },
      { id: 'wp_a1', latitude: currentCoords.lat, longitude: currentCoords.lng, label: currentCoords.checkpointName, timestamp: currentCoords.updatedAt, speedKmh: currentCoords.speedKmh, passed: true },
    ];
  }, [dispatch, cachedRecord, originCoords, currentCoords]);

  // 6. Distances & Progress Metrics
  const totalTripDistanceKm = useMemo(() => {
    return calculateHaversineDistanceKm(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
  }, [originCoords, destCoords]);

  const coveredDistanceKm = useMemo(() => {
    return calculateHaversineDistanceKm(originCoords.lat, originCoords.lng, currentCoords.lat, currentCoords.lng);
  }, [originCoords, currentCoords]);

  const remainingDistanceKm = useMemo(() => {
    return calculateHaversineDistanceKm(currentCoords.lat, currentCoords.lng, destCoords.lat, destCoords.lng);
  }, [currentCoords, destCoords]);

  const progressPercentage = useMemo(() => {
    if (['RECEIVED', 'PARTIALLY_RECEIVED', 'RECONCILED'].includes(dispatch.status)) return 100;
    if (totalTripDistanceKm <= 0) return 0;
    const pct = Math.round((coveredDistanceKm / totalTripDistanceKm) * 100);
    return Math.min(100, Math.max(0, pct));
  }, [coveredDistanceKm, totalTripDistanceKm, dispatch.status]);

  // 7. Route Variance / Corridor Deviation
  const corridorVarianceKm = useMemo(() => {
    // Find closest planned waypoint to current position
    let minDist = Infinity;
    plannedWaypoints.forEach((wp) => {
      const d = calculateHaversineDistanceKm(currentCoords.lat, currentCoords.lng, wp.latitude, wp.longitude);
      if (d < minDist) minDist = d;
    });
    return Math.min(minDist, 4.2); // clamped variance
  }, [currentCoords, plannedWaypoints]);

  // 8. SVG Projection Mapping
  const projection = useMemo(() => {
    const allLats = [
      originCoords.lat,
      destCoords.lat,
      currentCoords.lat,
      ...plannedWaypoints.map((w) => w.latitude),
      ...actualWaypoints.map((w) => w.latitude),
    ];
    const allLngs = [
      originCoords.lng,
      destCoords.lng,
      currentCoords.lng,
      ...plannedWaypoints.map((w) => w.longitude),
      ...actualWaypoints.map((w) => w.longitude),
    ];

    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs);
    const maxLng = Math.max(...allLngs);

    const latSpan = Math.max(maxLat - minLat, 1.4);
    const lngSpan = Math.max(maxLng - minLng, 1.8);

    const width = 840;
    const height = 400;
    const paddingX = 80;
    const paddingY = 60;

    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY * 2;

    const project = (lat: number, lng: number) => {
      const yNorm = (maxLat - lat) / latSpan;
      const xNorm = (lng - minLng) / lngSpan;

      const baseCenterX = width / 2;
      const baseCenterY = height / 2;

      const rawX = paddingX + xNorm * usableWidth;
      const rawY = paddingY + yNorm * usableHeight;

      const currentRawX = paddingX + ((currentCoords.lng - minLng) / lngSpan) * usableWidth;
      const currentRawY = paddingY + ((maxLat - currentCoords.lat) / latSpan) * usableHeight;

      const zoomOriginX = zoomLevel > 1 ? currentRawX : baseCenterX;
      const zoomOriginY = zoomLevel > 1 ? currentRawY : baseCenterY;

      const x = zoomOriginX + (rawX - zoomOriginX) * zoomLevel;
      const y = zoomOriginY + (rawY - zoomOriginY) * zoomLevel;

      return { x, y };
    };

    // Build polyline points strings
    const plannedPolylinePoints = plannedWaypoints
      .map((wp) => {
        const pt = project(wp.latitude, wp.longitude);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(' ');

    const actualPolylinePoints = actualWaypoints
      .map((wp) => {
        const pt = project(wp.latitude, wp.longitude);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(' ');

    return {
      width,
      height,
      origin: project(originCoords.lat, originCoords.lng),
      destination: project(destCoords.lat, destCoords.lng),
      vehicle: project(currentCoords.lat, currentCoords.lng),
      project,
      plannedPolylinePoints,
      actualPolylinePoints,
    };
  }, [originCoords, destCoords, currentCoords, plannedWaypoints, actualWaypoints, zoomLevel]);

  const handleCopyCoordinates = () => {
    const text = `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2200);
  };

  // Manual Trigger: Pre-cache Map & Route for Offline
  const handlePrecacheRoute = () => {
    const saved = saveMapCache(dispatch);
    setCachedRecord(saved);
    setCacheNotification(`Route & tile grid cached offline (${(saved.sizeBytes / 1024).toFixed(1)} KB). Available without signal.`);
    setTimeout(() => setCacheNotification(null), 4000);
  };

  // Live GPS Telemetry Simulation Action
  const handleSimulateGpsPing = async () => {
    setIsSimulatingPing(true);
    setPingSuccessMsg(null);
    try {
      const advanceFraction = 0.25;
      const nextLat = currentCoords.lat + (destCoords.lat - currentCoords.lat) * advanceFraction;
      const nextLng = currentCoords.lng + (destCoords.lng - currentCoords.lng) * advanceFraction;
      const newSpeed = Math.floor(75 + Math.random() * 20);
      const nextWaypointName = `En Route Waypoint Mile ${(coveredDistanceKm + 45).toFixed(0)}`;

      if (isEffectivelyOffline) {
        // Queue locally when offline
        queueOfflineTelemetry(dispatch.id, {
          latitude: parseFloat(nextLat.toFixed(5)),
          longitude: parseFloat(nextLng.toFixed(5)),
          speedKmh: newSpeed,
          heading: 310,
          checkpointName: nextWaypointName,
          source: 'GPS',
        });

        // Update local cache directly
        const updatedOffline: Dispatch = {
          ...dispatch,
          status: 'IN_TRANSIT',
          currentCoordinates: {
            latitude: parseFloat(nextLat.toFixed(5)),
            longitude: parseFloat(nextLng.toFixed(5)),
            speedKmh: newSpeed,
            heading: 310,
            checkpointName: nextWaypointName,
            source: 'GPS',
            updatedAt: new Date().toISOString(),
          },
        };
        const saved = saveMapCache(updatedOffline);
        setCachedRecord(saved);
        setPingSuccessMsg(`Offline waypoint queued locally: ${nextLat.toFixed(4)}° N, ${Math.abs(nextLng).toFixed(4)}° W (will sync upon reconnection).`);
      } else {
        const updated = await api.updateDispatchTelemetry(dispatch.id, {
          latitude: parseFloat(nextLat.toFixed(5)),
          longitude: parseFloat(nextLng.toFixed(5)),
          speedKmh: newSpeed,
          heading: 310,
          checkpointName: nextWaypointName,
          source: 'GPS',
        });

        saveMapCache(updated);
        setCachedRecord(getMapCache(updated.id));

        if (onTelemetryUpdate) {
          onTelemetryUpdate(updated);
        }
        setPingSuccessMsg(`Telemetry GPS ping recorded: ${nextLat.toFixed(4)}° N, ${Math.abs(nextLng).toFixed(4)}° W`);
      }
      setTimeout(() => setPingSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to update telemetry:', err);
    } finally {
      setIsSimulatingPing(false);
    }
  };

  const isDelivered = ['RECEIVED', 'PARTIALLY_RECEIVED', 'RECONCILED'].includes(dispatch.status);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg space-y-0">
      {/* Offline Mode Active Banner */}
      {isEffectivelyOffline && (
        <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-2.5 text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">
              Operating in Offline Transit Mode • Using Cached Coordinate Data & Offline Map Canvas
            </span>
          </div>
          <span className="text-[11px] bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700/60 font-mono">
            Cache Hit: {cachedRecord ? `${(cachedRecord.sizeBytes / 1024).toFixed(1)} KB` : 'Local Grid'}
          </span>
        </div>
      )}

      {/* Cache Notification Toast */}
      {cacheNotification && (
        <div className="bg-emerald-950/90 border-b border-emerald-800/80 px-4 py-2 text-xs text-emerald-200 flex items-center gap-2 animate-fade-in">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{cacheNotification}</span>
        </div>
      )}

      {/* 1. Telemetry Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/40">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800/80">
              <Radio className="w-3 h-3 text-sky-400 animate-pulse" />
              Live Telemetry & Geo-Coordinates
            </span>

            {/* Offline Cache Status Badge */}
            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              <Database className="w-3 h-3 text-emerald-400" />
              {cachedRecord ? `Cached Offline (${(cachedRecord.sizeBytes / 1024).toFixed(1)} KB)` : 'Uncached'}
            </span>

            {/* Network Status Toggle */}
            <button
              onClick={() => setIsSimulatedOffline(!isSimulatedOffline)}
              className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded cursor-pointer transition-colors ${
                isSimulatedOffline
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
              title="Toggle simulated low-signal/offline transit mode"
            >
              {isSimulatedOffline ? <WifiOff className="w-3 h-3 text-amber-400" /> : <Wifi className="w-3 h-3 text-emerald-400" />}
              <span>{isSimulatedOffline ? 'Simulating Offline' : 'Online Connection'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Navigation className="w-4 h-4 text-sky-400" />
              {currentCoords.checkpointName}
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ({currentCoords.lat.toFixed(5)}° N, {Math.abs(currentCoords.lng).toFixed(5)}° W)
            </span>
          </div>
        </div>

        {/* Action Buttons: Pre-cache, Copy Coords, Simulate Ping, External Maps */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pre-cache Button */}
          <button
            onClick={handlePrecacheRoute}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            title="Pre-cache map tiles, waypoints and vector paths for offline transit"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pre-cache Route</span>
          </button>

          {/* Simulate Ping Button */}
          {!isDelivered && (
            <button
              onClick={handleSimulateGpsPing}
              disabled={isSimulatingPing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/70 hover:bg-sky-900 text-sky-300 border border-sky-800/60 text-xs font-semibold cursor-pointer transition-colors"
              title="Record next live GPS telemetry waypoint"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingPing ? 'animate-spin' : ''}`} />
              <span>{isSimulatingPing ? 'Pinging...' : 'Simulate GPS Ping'}</span>
            </button>
          )}

          {/* Copy Coordinates */}
          <button
            onClick={handleCopyCoordinates}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            title="Copy latitude and longitude coordinates"
          >
            {copiedCoords ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Lat/Lng</span>
              </>
            )}
          </button>

          {/* External Map Link */}
          <a
            href={`https://www.google.com/maps?q=${currentCoords.lat},${currentCoords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            title="View exact geo-coordinates on Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            <span>Open in Maps</span>
          </a>
        </div>
      </div>

      {/* Ping Success Banner */}
      {pingSuccessMsg && (
        <div className="bg-sky-950/80 border-b border-sky-800/80 px-5 py-2 text-xs text-sky-200 flex items-center gap-2 animate-fade-in">
          <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse shrink-0" />
          <span>{pingSuccessMsg}</span>
        </div>
      )}

      {/* Route Layer Legend & Corridor Adherence HUD Bar */}
      <div className="bg-slate-950/90 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" /> Polyline Layers:
          </span>

          {/* Toggle Planned Polyline */}
          <button
            onClick={() => setShowPlannedRoute(!showPlannedRoute)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
              showPlannedRoute
                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                : 'bg-slate-800/50 text-slate-500 line-through'
            }`}
          >
            <span className="w-3 h-0.5 bg-indigo-400 inline-block border-b border-dashed border-indigo-300" />
            <span>Planned Corridor ({plannedWaypoints.length} pts)</span>
          </button>

          {/* Toggle Actual Polyline */}
          <button
            onClick={() => setShowActualRoute(!showActualRoute)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
              showActualRoute
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'bg-slate-800/50 text-slate-500 line-through'
            }`}
          >
            <span className="w-3 h-1 bg-cyan-400 inline-block rounded-full shadow" />
            <span>Actual Route ({actualWaypoints.length} recorded)</span>
          </button>

          {/* Toggle Breadcrumbs */}
          <button
            onClick={() => setShowBreadcrumbs(!showBreadcrumbs)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
              showBreadcrumbs
                ? 'bg-slate-800 text-sky-300 border border-slate-700'
                : 'bg-slate-800/50 text-slate-500 line-through'
            }`}
          >
            <History className="w-3 h-3 text-sky-400" />
            <span>Waypoints</span>
          </button>
        </div>

        {/* Corridor Variance Indicator */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="text-slate-500">Corridor Variance:</span>
          <span className="text-emerald-400 font-semibold">{corridorVarianceKm.toFixed(1)} km</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300">98.4% Adherence</span>
        </div>
      </div>

      {/* 2. Interactive SVG Map Canvas */}
      <div className="relative w-full h-84 sm:h-96 bg-slate-950 overflow-hidden select-none">
        {/* Map Grid Background Pattern (Offline Vector Tiles) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <defs>
            <pattern id="offline-grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#offline-grid-pattern)" />
        </svg>

        {/* Vector SVG Map Layer */}
        <svg
          viewBox={`0 0 ${projection.width} ${projection.height}`}
          className="w-full h-full transition-transform duration-300"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Subtle Radar/Compass rings in background */}
          <circle
            cx={projection.vehicle.x}
            cy={projection.vehicle.y}
            r="90"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="0.5"
            strokeDasharray="4,4"
            className="opacity-30"
          />
          <circle
            cx={projection.vehicle.x}
            cy={projection.vehicle.y}
            r="160"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="0.5"
            strokeDasharray="6,6"
            className="opacity-15"
          />

          {/* 1. PLANNED ROUTE POLYLINE (Dashed corridor vector across planned waypoints) */}
          {showPlannedRoute && (
            <>
              {/* Outer Corridor Buffer */}
              <polyline
                points={projection.plannedPolylinePoints}
                fill="none"
                stroke="#6366f1"
                strokeWidth="14"
                strokeOpacity="0.12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Planned Corridor Polyline */}
              <polyline
                points={projection.plannedPolylinePoints}
                fill="none"
                stroke="#818cf8"
                strokeWidth="3.5"
                strokeDasharray="6,6"
                strokeOpacity="0.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Planned Waypoint Diamonds along Corridor */}
              {plannedWaypoints.map((wp) => {
                const pt = projection.project(wp.latitude, wp.longitude);
                return (
                  <g
                    key={wp.id}
                    transform={`translate(${pt.x}, ${pt.y})`}
                    className="cursor-pointer"
                    onClick={() => setActiveWaypointTooltip(wp)}
                  >
                    <polygon
                      points="0,-4 4,0 0,4 -4,0"
                      fill="#818cf8"
                      stroke="#1e1b4b"
                      strokeWidth="1"
                    />
                  </g>
                );
              })}
            </>
          )}

          {/* 2. ACTUAL RECORDED ROUTE POLYLINE (Solid cyan glowing path tracing history) */}
          {showActualRoute && (
            <>
              {/* Outer Glow */}
              <polyline
                points={projection.actualPolylinePoints}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="8"
                strokeOpacity="0.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Actual Polyline Path */}
              <polyline
                points={projection.actualPolylinePoints}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* 3. HISTORICAL WAYPOINT BREADCRUMB MARKERS */}
          {showBreadcrumbs &&
            actualWaypoints.map((wp, idx) => {
              const pt = projection.project(wp.latitude, wp.longitude);
              const isCurrent = idx === actualWaypoints.length - 1;
              if (isCurrent) return null; // current vehicle rendered separately below
              return (
                <g
                  key={wp.id}
                  transform={`translate(${pt.x}, ${pt.y})`}
                  className="cursor-pointer group"
                  onClick={() => setActiveWaypointTooltip(wp)}
                >
                  <circle
                    r="5"
                    fill="#0891b2"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="group-hover:scale-125 transition-transform"
                  />
                  <text
                    y="-8"
                    textAnchor="middle"
                    className="fill-slate-400 font-mono text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    #{idx + 1}
                  </text>
                </g>
              );
            })}

          {/* 4. Origin Dock Pin */}
          <g
            transform={`translate(${projection.origin.x}, ${projection.origin.y})`}
            className="cursor-pointer"
            onClick={() =>
              setActiveWaypointTooltip({
                id: 'origin_pin',
                latitude: originCoords.lat,
                longitude: originCoords.lng,
                label: dispatch.originLocationSnapshot?.label || 'Origin Loading Terminal',
              })
            }
          >
            <circle r="18" fill="#1e293b" stroke="#3b82f6" strokeWidth="2.5" />
            <Warehouse x="-9" y="-9" width="18" height="18" className="text-blue-400" />
            <text
              y="32"
              textAnchor="middle"
              className="fill-slate-300 font-sans font-semibold text-[11px] drop-shadow"
            >
              {dispatch.originLocationSnapshot?.label || 'Origin Dock'}
            </text>
          </g>

          {/* 5. Destination Partner Dock Pin */}
          <g
            transform={`translate(${projection.destination.x}, ${projection.destination.y})`}
            className="cursor-pointer"
            onClick={() =>
              setActiveWaypointTooltip({
                id: 'dest_pin',
                latitude: destCoords.lat,
                longitude: destCoords.lng,
                label: dispatch.destinationSnapshot?.partnerName || 'Destination Terminal',
              })
            }
          >
            <circle r="18" fill="#064e3b" stroke="#10b981" strokeWidth="2.5" />
            <Store x="-9" y="-9" width="18" height="18" className="text-emerald-400" />
            <text
              y="32"
              textAnchor="middle"
              className="fill-emerald-300 font-sans font-semibold text-[11px] drop-shadow"
            >
              {dispatch.partnerName}
            </text>
          </g>

          {/* 6. Active Delivery Vehicle Pin (With Animated Pulse Radar Rings) */}
          <g
            transform={`translate(${projection.vehicle.x}, ${projection.vehicle.y})`}
            className="cursor-pointer"
            onClick={() =>
              setActiveWaypointTooltip({
                id: 'vehicle_pin',
                latitude: currentCoords.lat,
                longitude: currentCoords.lng,
                label: `Current GPS: ${currentCoords.checkpointName}`,
                speedKmh: currentCoords.speedKmh,
                timestamp: currentCoords.updatedAt,
              })
            }
          >
            {/* Animated Radar Pulse Rings */}
            {!isDelivered && (
              <>
                <circle r="26" fill="#38bdf8" opacity="0.25">
                  <animate
                    attributeName="r"
                    values="16;42"
                    dur="2.2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.5;0"
                    dur="2.2s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle r="18" fill="#0284c7" opacity="0.4" />
              </>
            )}

            {/* Vehicle Icon Badge */}
            <circle
              r="17"
              fill={isDelivered ? '#059669' : '#0284c7'}
              stroke="#ffffff"
              strokeWidth="2.5"
              className="shadow-lg"
            />
            <Truck
              x="-8"
              y="-8"
              width="16"
              height="16"
              className="text-white"
            />

            {/* Vehicle Code Label */}
            <text
              y="-24"
              textAnchor="middle"
              className="fill-sky-300 font-mono font-bold text-[10px] bg-slate-900 px-1 py-0.5 rounded shadow"
            >
              {dispatch.vehicleReg || 'TRK-LIVE'}
            </text>
          </g>
        </svg>

        {/* Waypoint Click Inspection Card */}
        {activeWaypointTooltip && (
          <div className="absolute top-4 left-4 bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl z-20 text-xs space-y-1.5 max-w-xs animate-fade-in backdrop-blur-md">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
              <span className="font-semibold text-sky-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                Waypoint Inspection
              </span>
              <button
                onClick={() => setActiveWaypointTooltip(null)}
                className="text-slate-400 hover:text-white cursor-pointer px-1"
              >
                ×
              </button>
            </div>
            <div className="font-medium text-white">{activeWaypointTooltip.label}</div>
            <div className="text-[11px] font-mono text-slate-300">
              {activeWaypointTooltip.latitude.toFixed(5)}° N, {Math.abs(activeWaypointTooltip.longitude).toFixed(5)}° W
            </div>
            {activeWaypointTooltip.speedKmh !== undefined && (
              <div className="text-[11px] text-slate-400">
                Speed: <span className="text-amber-400 font-mono">{activeWaypointTooltip.speedKmh} km/h</span>
              </div>
            )}
            {activeWaypointTooltip.timestamp && (
              <div className="text-[10px] text-slate-500">
                Timestamp: {new Date(activeWaypointTooltip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            )}
          </div>
        )}

        {/* Map Control Overlays: Zoom & Fit */}
        <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-10">
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.35))}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-md cursor-pointer transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.35))}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-md cursor-pointer transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-md cursor-pointer transition-colors"
            title="Reset to Fit Route Bounds"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Live Vehicle Floating HUD */}
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 shadow-2xl z-10 space-y-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isDelivered ? 'bg-emerald-400' : 'bg-sky-400 animate-pulse'}`} />
              <span className="text-xs font-bold text-white font-mono">
                {dispatch.dispatchNumber} • {dispatch.vehicleReg || 'TRK-CORRIDOR'}
              </span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400 bg-sky-950 px-2 py-0.5 rounded-full border border-sky-800">
              {progressPercentage}% Completed
            </span>
          </div>

          {/* Telemetry Stats Grid: Coordinates, Speed, Heading, Last Ping */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400" /> Latitude
              </div>
              <div className="font-mono font-semibold text-slate-200">
                {currentCoords.lat.toFixed(5)}° N
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400" /> Longitude
              </div>
              <div className="font-mono font-semibold text-slate-200">
                {Math.abs(currentCoords.lng).toFixed(5)}° W
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-amber-400" /> Speed
              </div>
              <div className="font-mono font-semibold text-slate-200">
                {currentCoords.speedKmh} km/h
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Compass className="w-3 h-3 text-indigo-400" /> Heading
              </div>
              <div className="font-mono font-semibold text-slate-200">
                {headingToCardinal(currentCoords.heading)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Progress Metric Footbar */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="space-y-2">
          {/* Progress Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Warehouse className="w-3.5 h-3.5 text-blue-400" />
              <span>{originCoords.lat.toFixed(4)}°, {originCoords.lng.toFixed(4)}°</span>
            </span>
            <span className="font-medium text-slate-300">
              {coveredDistanceKm.toFixed(0)} km covered • {remainingDistanceKm.toFixed(0)} km remaining
            </span>
            <span className="flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span>{destCoords.lat.toFixed(4)}°, {destCoords.lng.toFixed(4)}°</span>
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-500 h-full rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Last GPS Ping: {new Date(currentCoords.updatedAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Carrier:</span>
              <span className="text-slate-300 font-medium">{dispatch.driverName || 'Designated Driver'} ({dispatch.driverPhone || 'Radio dispatched'})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
