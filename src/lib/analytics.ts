/**
 * Task 12: Client-side analytics batching
 *
 * Spec §8: viewer batches events → POST /api/events → AE.writeDataPoint
 * No PII in events. Uses beacon/fetch with keepalive for dwell events.
 */
import type { EngagementEvent } from '../types/schema';

const BATCH_INTERVAL_MS = 5000;
const MAX_BATCH_SIZE = 20;

let batchQueue: EngagementEvent[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (batchQueue.length === 0) return;
  const batch = batchQueue.splice(0, MAX_BATCH_SIZE);

  navigator.sendBeacon(
    '/api/events',
    new Blob([JSON.stringify(batch)], { type: 'application/json' })
  );
}

function scheduleFlush() {
  if (batchTimer !== null) return;
  batchTimer = setTimeout(() => {
    batchTimer = null;
    flush();
  }, BATCH_INTERVAL_MS);
}

export function trackEvent(event: EngagementEvent): void {
  batchQueue.push(event);
  if (batchQueue.length >= MAX_BATCH_SIZE) {
    if (batchTimer !== null) clearTimeout(batchTimer);
    batchTimer = null;
    flush();
  } else {
    scheduleFlush();
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}
