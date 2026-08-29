/**
 * Task 12: Analytics event ingestion
 * Events → Workers Analytics Engine (not D1 — SQLite can't handle the write volume)
 */
import type { Env } from '../types';
import type { EngagementEvent } from '../../src/types/schema';

const VALID_EVENT_KINDS = new Set([
  'exhibition_view',
  'artwork_focus',
  'artwork_inspect',
  'artwork_dwell',
]);
const MAX_BATCH_SIZE = 50;

export async function handleEvents(req: Request, env: Env): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const ip = req.headers.get('CF-Connecting-IP') ?? 'anon';
  if (env.EVENTS_LIMITER) {
    const { success } = await env.EVENTS_LIMITER.limit({ key: ip });
    if (!success) return new Response('Too Many Requests', { status: 429 });
  }

  let events: EngagementEvent[];
  try {
    const body = await req.json<unknown>();
    events = Array.isArray(body) ? (body as EngagementEvent[]) : [body as EngagementEvent];
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (events.length > MAX_BATCH_SIZE) {
    events = events.slice(0, MAX_BATCH_SIZE);
  }

  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue;
    if (!ev.kind || !VALID_EVENT_KINDS.has(ev.kind) || !ev.exhibition_id || typeof ev.exhibition_id !== 'string') {
      continue;
    }

    env.AE.writeDataPoint({
      blobs: [
        ev.kind,
        String(ev.exhibition_id).slice(0, 100),
        String(ev.room_id ?? '').slice(0, 100),
        String(ev.artwork_id ?? '').slice(0, 100),
        String(ev.artwork_type ?? '').slice(0, 50),
      ],
      doubles: [typeof ev.dwell_seconds === 'number' ? Math.max(0, Math.min(86400, ev.dwell_seconds)) : 0],
      indexes: [String(ev.exhibition_id).slice(0, 100)],
    });
  }

  return new Response(null, { status: 204 });
}
