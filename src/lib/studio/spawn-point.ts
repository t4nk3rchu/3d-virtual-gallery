/**
 * Spawn Point & Waypoint helpers for 3D Virtual Gallery
 * Handles start position & direction parsing and serialization in exhibition settings_json.
 */

export interface SpawnPoint {
  position: [number, number, number];
  target?: [number, number, number];
  rotation?: [number, number, number];
}

/**
 * Parse a custom spawn point from exhibition settings_json,
 * with fallback to the room's default spawn_json.
 */
export function parseSpawnPoint(
  settingsJson: string | null | undefined,
  roomSpawnJson?: string | null | undefined
): SpawnPoint | null {
  if (settingsJson) {
    try {
      const parsed = JSON.parse(settingsJson);
      if (parsed.spawnPoint && Array.isArray(parsed.spawnPoint.position)) {
        return {
          position: [
            Number(parsed.spawnPoint.position[0]) || 0,
            Number(parsed.spawnPoint.position[1]) || 1.7,
            Number(parsed.spawnPoint.position[2]) || 0,
          ],
          target: Array.isArray(parsed.spawnPoint.target)
            ? [
                Number(parsed.spawnPoint.target[0]) || 0,
                Number(parsed.spawnPoint.target[1]) || 1.7,
                Number(parsed.spawnPoint.target[2]) || 0,
              ]
            : undefined,
          rotation: Array.isArray(parsed.spawnPoint.rotation)
            ? [
                Number(parsed.spawnPoint.rotation[0]) || 0,
                Number(parsed.spawnPoint.rotation[1]) || 0,
                Number(parsed.spawnPoint.rotation[2]) || 0,
              ]
            : undefined,
        };
      }
    } catch {}
  }

  if (roomSpawnJson) {
    try {
      const parsed = JSON.parse(roomSpawnJson);
      if (Array.isArray(parsed.position)) {
        return {
          position: [
            Number(parsed.position[0]) || 0,
            Number(parsed.position[1]) || 1.7,
            Number(parsed.position[2]) || 0,
          ],
          target: Array.isArray(parsed.target)
            ? [
                Number(parsed.target[0]) || 0,
                Number(parsed.target[1]) || 1.7,
                Number(parsed.target[2]) || 0,
              ]
            : undefined,
        };
      }
    } catch {}
  }

  return null;
}

/**
 * Serialize a custom spawn point into an exhibition's settings_json string.
 */
export function serializeSpawnPoint(
  spawn: SpawnPoint | null,
  existingSettingsJson?: string | null
): string {
  let settings: Record<string, unknown> = {};
  if (existingSettingsJson) {
    try {
      settings = JSON.parse(existingSettingsJson);
    } catch {}
  }

  if (spawn) {
    settings.spawnPoint = {
      position: [
        Math.round(spawn.position[0] * 100) / 100,
        Math.round(spawn.position[1] * 100) / 100,
        Math.round(spawn.position[2] * 100) / 100,
      ],
      target: spawn.target
        ? [
            Math.round(spawn.target[0] * 100) / 100,
            Math.round(spawn.target[1] * 100) / 100,
            Math.round(spawn.target[2] * 100) / 100,
          ]
        : undefined,
      rotation: spawn.rotation
        ? [
            Math.round(spawn.rotation[0] * 100) / 100,
            Math.round(spawn.rotation[1] * 100) / 100,
            Math.round(spawn.rotation[2] * 100) / 100,
          ]
        : undefined,
    };
  } else {
    delete settings.spawnPoint;
  }

  return JSON.stringify(settings);
}

/**
 * Format spawn coordinates into a clean human-readable string: e.g. "X: 0.50, Y: 1.70, Z: -3.20"
 */
export function formatSpawnCoordinates(spawn: SpawnPoint): string {
  return `X: ${spawn.position[0].toFixed(2)}, Y: ${spawn.position[1].toFixed(2)}, Z: ${spawn.position[2].toFixed(2)}`;
}
