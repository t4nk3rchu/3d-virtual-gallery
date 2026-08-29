import { describe, it, expect, vi } from 'vitest';
import { handleEvents } from './routes/events';
import type { Env } from './types';

describe('Analytics Events Endpoint', () => {
  it('writes data points to Analytics Engine and caps batches at 50', async () => {
    const writeDataPoint = vi.fn();
    const fakeEnv = {
      AE: { writeDataPoint },
    } as unknown as Env;

    const events = Array.from({ length: 60 }, (_, i) => ({
      kind: 'artwork_focus',
      exhibition_id: 'ex1',
      room_id: 'room1',
      artwork_id: `art_${i}`,
      artwork_type: 'IMAGE_2D',
      dwell_seconds: 5,
    }));

    const req = new Request('https://gallery.example.com/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events),
    });

    const res = await handleEvents(req, fakeEnv);
    expect(res.status).toBe(204);
    // Capped at 50 points
    expect(writeDataPoint).toHaveBeenCalledTimes(50);
  });

  it('rejects invalid event kinds and malformed requests', async () => {
    const writeDataPoint = vi.fn();
    const fakeEnv = {
      AE: { writeDataPoint },
    } as unknown as Env;

    const req = new Request('https://gallery.example.com/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { kind: 'unsupported_event', exhibition_id: 'ex1' },
        { kind: 'exhibition_view', exhibition_id: 'ex1' },
      ]),
    });

    const res = await handleEvents(req, fakeEnv);
    expect(res.status).toBe(204);
    expect(writeDataPoint).toHaveBeenCalledOnce();
    expect(writeDataPoint.mock.calls[0][0].blobs[0]).toBe('exhibition_view');
  });

  it('returns 429 when the rate limiter denies the request', async () => {
    const env = {
      EVENTS_LIMITER: { limit: async () => ({ success: false }) },
      AE: { writeDataPoint: vi.fn() },
    } as unknown as Env;
    const req = new Request('https://app.example.com/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
      body: JSON.stringify([{ kind: 'exhibition_view', exhibition_id: 'e1' }]),
    });
    const res = await handleEvents(req, env);
    expect(res.status).toBe(429);
  });

  it('writes normally when under the limit', async () => {
    const writeDataPoint = vi.fn();
    const env = {
      EVENTS_LIMITER: { limit: async () => ({ success: true }) },
      AE: { writeDataPoint },
    } as unknown as Env;
    const req = new Request('https://app.example.com/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
      body: JSON.stringify([{ kind: 'exhibition_view', exhibition_id: 'e1' }]),
    });
    const res = await handleEvents(req, env);
    expect(res.status).toBe(204);
    expect(writeDataPoint).toHaveBeenCalledTimes(1);
  });
});

