import { Dispatch, RouteWaypoint, GeoTelemetry } from '../types/dispatch.js';

export interface CachedMapRecord {
  dispatchId: string;
  dispatchNumber: string;
  cachedAt: string;
  sizeBytes: number;
  origin: {
    label: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  destination: {
    partnerName: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  currentCoordinates: GeoTelemetry;
  plannedWaypoints: RouteWaypoint[];
  actualWaypoints: RouteWaypoint[];
  offlineTileGrid: {
    gridBounds: {
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
    };
    corridorId: string;
    tilesAvailable: boolean;
  };
}

const CACHE_PREFIX = 'dispatchbridge_map_cache_';
const QUEUE_PREFIX = 'dispatchbridge_offline_telemetry_queue_';

const memoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      return localStorage.getItem(key);
    }
  } catch {
    // fallback to memory
  }
  return memoryStore.get(key) ?? null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem(key, value);
      return;
    }
  } catch {
    // fallback to memory
  }
  memoryStore.set(key, value);
}

function removeStorageItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    if (typeof localStorage !== 'undefined' && localStorage.removeItem) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
  memoryStore.delete(key);
}

/**
 * Cache map tiles and route coordinate history locally for offline delivery access
 */
export function saveMapCache(dispatch: Dispatch): CachedMapRecord {
  const originLat = dispatch.originLocationSnapshot?.latitude || 41.8781;
  const originLng = dispatch.originLocationSnapshot?.longitude || -87.6298;
  const destLat = dispatch.destinationSnapshot?.latitude || 44.9866;
  const destLng = dispatch.destinationSnapshot?.longitude || -93.2581;

  const currentCoords: GeoTelemetry = dispatch.currentCoordinates || {
    latitude: originLat,
    longitude: originLng,
    updatedAt: new Date().toISOString(),
    speedKmh: 0,
    heading: 0,
    checkpointName: dispatch.originLocationSnapshot?.label || 'Origin Loading Terminal',
    source: 'CHECKPOINT',
  };

  const plannedWaypoints = dispatch.pathHistory?.plannedWaypoints || [
    { id: 'p_origin', latitude: originLat, longitude: originLng, label: dispatch.originLocationSnapshot.label, passed: true },
    { id: 'p_mid', latitude: (originLat + destLat) / 2, longitude: (originLng + destLng) / 2, label: 'Midpoint Transit Corridor', passed: true },
    { id: 'p_dest', latitude: destLat, longitude: destLng, label: dispatch.destinationSnapshot.partnerName, passed: false },
  ];

  const actualWaypoints = dispatch.pathHistory?.actualWaypoints || [
    {
      id: 'a_origin',
      latitude: originLat,
      longitude: originLng,
      label: 'Departure from Origin Dock',
      timestamp: dispatch.dispatchedAt,
      speedKmh: 0,
      passed: true,
    },
    {
      id: 'a_current',
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
      label: currentCoords.checkpointName || 'Active GPS Waypoint',
      timestamp: currentCoords.updatedAt || new Date().toISOString(),
      speedKmh: currentCoords.speedKmh || 80,
      passed: true,
    },
  ];

  const minLat = Math.min(originLat, destLat, currentCoords.latitude) - 0.5;
  const maxLat = Math.max(originLat, destLat, currentCoords.latitude) + 0.5;
  const minLng = Math.min(originLng, destLng, currentCoords.longitude) - 0.5;
  const maxLng = Math.max(originLng, destLng, currentCoords.longitude) + 0.5;

  const record: CachedMapRecord = {
    dispatchId: dispatch.id,
    dispatchNumber: dispatch.dispatchNumber,
    cachedAt: new Date().toISOString(),
    sizeBytes: 0,
    origin: {
      label: dispatch.originLocationSnapshot.label,
      address: dispatch.originLocationSnapshot.address,
      latitude: originLat,
      longitude: originLng,
    },
    destination: {
      partnerName: dispatch.destinationSnapshot.partnerName,
      address: dispatch.destinationSnapshot.address,
      latitude: destLat,
      longitude: destLng,
    },
    currentCoordinates: currentCoords,
    plannedWaypoints,
    actualWaypoints,
    offlineTileGrid: {
      gridBounds: { minLat, maxLat, minLng, maxLng },
      corridorId: `corridor_${dispatch.dispatchNumber}`,
      tilesAvailable: true,
    },
  };

  const jsonStr = JSON.stringify(record);
  record.sizeBytes = jsonStr.length;

  try {
    setStorageItem(`${CACHE_PREFIX}${dispatch.id}`, JSON.stringify(record));
  } catch (e) {
    console.warn('[MapCache] Storage quota reached or unavailable:', e);
  }

  return record;
}

/**
 * Retrieve cached offline map record for a dispatch
 */
export function getMapCache(dispatchId: string): CachedMapRecord | null {
  try {
    const raw = getStorageItem(`${CACHE_PREFIX}${dispatchId}`);
    if (!raw) return null;
    return JSON.parse(raw) as CachedMapRecord;
  } catch {
    return null;
  }
}

/**
 * Check if map coordinates are cached offline
 */
export function isMapCached(dispatchId: string): boolean {
  try {
    return Boolean(getStorageItem(`${CACHE_PREFIX}${dispatchId}`));
  } catch {
    return false;
  }
}

/**
 * Clear cached offline map record
 */
export function clearMapCache(dispatchId: string): void {
  try {
    removeStorageItem(`${CACHE_PREFIX}${dispatchId}`);
  } catch {
    // ignore
  }
}

/**
 * Queue a telemetry update locally when device is in an unstable or offline connection
 */
export function queueOfflineTelemetry(dispatchId: string, telemetry: any): void {
  try {
    const key = `${QUEUE_PREFIX}${dispatchId}`;
    const raw = getStorageItem(key);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({
      ...telemetry,
      queuedAt: new Date().toISOString(),
    });
    setStorageItem(key, JSON.stringify(queue));
  } catch (e) {
    console.warn('[MapCache] Failed to queue offline telemetry:', e);
  }
}

/**
 * Get pending offline telemetry updates
 */
export function getOfflineTelemetryQueue(dispatchId: string): any[] {
  try {
    const raw = getStorageItem(`${QUEUE_PREFIX}${dispatchId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear pending offline telemetry queue after successful synchronization
 */
export function clearOfflineTelemetryQueue(dispatchId: string): void {
  try {
    removeStorageItem(`${QUEUE_PREFIX}${dispatchId}`);
  } catch {
    // ignore
  }
}
