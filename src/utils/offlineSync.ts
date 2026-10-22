/**
 * Offline Sync & Outbox Queue Manager for Progressive Web App (PWA)
 * Complies with .ai/01_PRODUCT_REQUIREMENTS.md item 9 and .ai/07_SECURITY_PRIVACY_AND_FAILURES.md item 30:
 * "Offline: do not promise full offline operation. Any offline draft must clearly indicate unsynchronized status and conflict behavior."
 */

import { useState, useEffect } from 'react';

export interface OfflineQueueItem {
  id: string;
  type: 'CREATE_DISPATCH' | 'RECORD_RECEIPT' | 'TRANSIT_SCAN';
  url: string;
  payload: any;
  idempotencyKey: string;
  queuedAt: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  errorMessage?: string;
}

const OFFLINE_QUEUE_KEY = 'dispatchbridge_offline_queue';

export function getOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(items: OfflineQueueItem[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save offline queue:', err);
  }
}

export function queueOfflineAction(
  type: OfflineQueueItem['type'],
  url: string,
  payload: any,
  idempotencyKey?: string
): OfflineQueueItem {
  const queue = getOfflineQueue();
  const item: OfflineQueueItem = {
    id: 'off_' + Math.random().toString(36).substring(2, 9),
    type,
    url,
    payload,
    idempotencyKey: idempotencyKey || `idem_off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    queuedAt: new Date().toISOString(),
    status: 'PENDING',
  };
  queue.push(item);
  saveOfflineQueue(queue);
  window.dispatchEvent(new CustomEvent('dispatchbridge_offline_sync'));
  return item;
}

export async function replayOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: OfflineQueueItem[] = [];

  for (const item of queue) {
    try {
      item.status = 'SYNCING';
      const token = localStorage.getItem('dispatchbridge_token');
      const response = await fetch(item.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': item.idempotencyKey,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(item.payload),
      });

      if (response.ok) {
        synced++;
      } else {
        item.status = 'FAILED';
        item.errorMessage = `HTTP error ${response.status}`;
        failed++;
        remaining.push(item);
      }
    } catch (err: any) {
      item.status = 'FAILED';
      item.errorMessage = err.message || 'Network still unavailable';
      failed++;
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);
  window.dispatchEvent(new CustomEvent('dispatchbridge_offline_sync'));
  return { synced, failed };
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queue, setQueue] = useState<OfflineQueueItem[]>(getOfflineQueue());

  const refresh = () => setQueue(getOfflineQueue());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      replayOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);
    const handleSyncEvent = () => refresh();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('dispatchbridge_offline_sync', handleSyncEvent);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('dispatchbridge_offline_sync', handleSyncEvent);
    };
  }, []);

  return {
    isOnline,
    queueCount: queue.length,
    queue,
    replayNow: replayOfflineQueue,
    clearQueue: () => {
      saveOfflineQueue([]);
      refresh();
    },
  };
}
