import { describe, it, expect } from 'vitest';
import {
  parseSpawnPoint,
  serializeSpawnPoint,
  formatSpawnCoordinates,
  type SpawnPoint,
} from './spawn-point';

describe('spawn-point utilities', () => {
  it('parses custom spawnPoint from exhibition settings_json', () => {
    const settings = JSON.stringify({
      spawnPoint: {
        position: [2.5, 1.7, -4.2],
        target: [2.5, 1.7, 0],
        rotation: [0, 1.57, 0],
      },
    });

    const parsed = parseSpawnPoint(settings);
    expect(parsed).toEqual({
      position: [2.5, 1.7, -4.2],
      target: [2.5, 1.7, 0],
      rotation: [0, 1.57, 0],
    });
  });

  it('falls back to room spawn_json when exhibition settings has no spawnPoint', () => {
    const roomSpawn = JSON.stringify({
      position: [0, 1.7, -5],
      target: [0, 1.7, 0],
    });

    const parsed = parseSpawnPoint(null, roomSpawn);
    expect(parsed).toEqual({
      position: [0, 1.7, -5],
      target: [0, 1.7, 0],
    });
  });

  it('serializes spawnPoint into existing settings_json preserving other settings', () => {
    const existingSettings = JSON.stringify({
      introTransition: 'zoom_in',
      backgroundAudioFileId: 'audio_123',
    });

    const spawn: SpawnPoint = {
      position: [1.234, 1.7, -3.456],
      rotation: [0, 0.785, 0],
    };

    const serialized = serializeSpawnPoint(spawn, existingSettings);
    const parsed = JSON.parse(serialized);

    expect(parsed.introTransition).toBe('zoom_in');
    expect(parsed.backgroundAudioFileId).toBe('audio_123');
    expect(parsed.spawnPoint.position).toEqual([1.23, 1.7, -3.46]);
    expect(parsed.spawnPoint.rotation).toEqual([0, 0.79, 0]);
  });

  it('removes spawnPoint from settings_json when null is passed', () => {
    const existingSettings = JSON.stringify({
      introTransition: 'zoom_in',
      spawnPoint: { position: [1, 1.7, 1] },
    });

    const serialized = serializeSpawnPoint(null, existingSettings);
    const parsed = JSON.parse(serialized);

    expect(parsed.introTransition).toBe('zoom_in');
    expect(parsed.spawnPoint).toBeUndefined();
  });

  it('formats coordinates for display', () => {
    const spawn: SpawnPoint = {
      position: [1.5, 1.7, -2.25],
    };
    expect(formatSpawnCoordinates(spawn)).toBe('X: 1.50, Y: 1.70, Z: -2.25');
  });
});
