/**
 * Task 11: CMS validation tests
 */
import { describe, it, expect } from 'vitest';
import { validateGlbFile } from './validation';
import { serializeTransform, deserializeTransform, isValidTransform } from './transform';
import { buildExhibitionPatch } from './exhibition-patch';

// ─── GLB validation tests ─────────────────────────────────────────────────────
describe('validateGlbFile', () => {
  function makeGlbFile(size: number, withMagic = true): File {
    const bytes = new Uint8Array(size);
    if (withMagic) {
      // "glTF" magic bytes
      bytes[0] = 0x67; bytes[1] = 0x6c; bytes[2] = 0x54; bytes[3] = 0x46;
    }
    return new File([bytes], 'room.glb', { type: 'model/gltf-binary' });
  }

  it('accepts a valid small GLB', async () => {
    const result = await validateGlbFile(makeGlbFile(1024 * 1024)); // 1 MB
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects a file that exceeds 200 MB', async () => {
    const result = await validateGlbFile(makeGlbFile(201 * 1024 * 1024));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/200 MB/);
  });

  it('rejects a non-GLB file (wrong magic bytes)', async () => {
    const result = await validateGlbFile(makeGlbFile(1024, false));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/glTF/);
  });

  it('warns for files between 100 MB and 200 MB', async () => {
    const result = await validateGlbFile(makeGlbFile(120 * 1024 * 1024));
    expect(result.valid).toBe(true);
    expect(result.warning).toMatch(/100 MB/);
  });
});

// ─── Transform serialization tests ────────────────────────────────────────────
describe('transform serialization', () => {
  const transform = {
    position: [1.5, 1.7, -3.0] as [number, number, number],
    rotation: [0, Math.PI / 2, 0] as [number, number, number],
    scale: [1, 1, 1] as [number, number, number],
  };

  it('serializes to JSON string', () => {
    const json = serializeTransform(transform);
    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(parsed.position[0]).toBeCloseTo(1.5);
  });

  it('round-trips correctly', () => {
    const json = serializeTransform(transform);
    const result = deserializeTransform(json);
    expect(result.position[0]).toBeCloseTo(1.5);
    expect(result.position[1]).toBeCloseTo(1.7);
    expect(result.rotation[1]).toBeCloseTo(Math.PI / 2);
  });

  it('returns safe defaults for invalid JSON', () => {
    const result = deserializeTransform('not json at all');
    expect(result.position).toEqual([0, 1.5, 0]);
    expect(result.scale).toEqual([1, 1, 1]);
  });

  it('isValidTransform: true for valid JSON', () => {
    expect(isValidTransform(serializeTransform(transform))).toBe(true);
  });

  it('isValidTransform: false for invalid JSON', () => {
    expect(isValidTransform('bad')).toBe(false);
  });

  it('isValidTransform: false for zero scale', () => {
    const zero = { ...transform, scale: [0, 1, 1] as [number, number, number] };
    expect(isValidTransform(serializeTransform(zero))).toBe(false);
  });
});

// ─── Exhibition patch builder tests ──────────────────────────────────────────
describe('buildExhibitionPatch', () => {
  it('omits slug, keeps set values, and clears blanked optional fields', () => {
    const patch = buildExhibitionPatch({
      title: 'T',
      slug: 'should-be-dropped',
      description: '', // blanked optional field → cleared (null), not dropped
      curator_name: 'C',
      room_id: 'r1',
    });
    expect(patch).toEqual({ title: 'T', description: null, curator_name: 'C', room_id: 'r1' });
    expect('slug' in patch).toBe(false);
  });

  it('never nulls required NOT-NULL columns when blank', () => {
    const patch = buildExhibitionPatch({ title: '', room_id: '', curator_name: 'C' });
    // title/room_id dropped (would violate NOT NULL); curator_name kept
    expect(patch).toEqual({ curator_name: 'C' });
  });

  it('sends null to clear each optional field a curator blanks', () => {
    const patch = buildExhibitionPatch({
      title: 'T',
      room_id: 'r1',
      description: '',
      curator_name: '',
      cover_image_url: '',
      start_date: '',
      end_date: '',
      intro_video_file_id: '',
      curation_type: 'group',
    });
    expect(patch).toEqual({
      title: 'T',
      room_id: 'r1',
      description: null,
      curator_name: null,
      cover_image_url: null,
      start_date: null,
      end_date: null,
      intro_video_file_id: null,
      curation_type: 'group',
    });
  });
});

