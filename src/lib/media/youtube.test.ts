import { describe, it, expect } from 'vitest';
import { parseYouTubeVideoId, getYouTubeThumbnailUrl } from './youtube';

describe('parseYouTubeVideoId', () => {
  const VALID_ID = 'dQw4w9WgXcQ';

  it('accepts a bare 11-char video ID', () => {
    expect(parseYouTubeVideoId(VALID_ID)).toBe(VALID_ID);
  });

  it('parses watch?v= URL', () => {
    expect(parseYouTubeVideoId(`https://www.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
  });

  it('parses youtu.be short URL', () => {
    expect(parseYouTubeVideoId(`https://youtu.be/${VALID_ID}`)).toBe(VALID_ID);
  });

  it('parses watch URL with extra params', () => {
    expect(
      parseYouTubeVideoId(`https://www.youtube.com/watch?t=42&v=${VALID_ID}&feature=shared`)
    ).toBe(VALID_ID);
  });

  it('parses embed URL', () => {
    expect(
      parseYouTubeVideoId(`https://www.youtube.com/embed/${VALID_ID}`)
    ).toBe(VALID_ID);
  });

  it('returns null for empty string', () => {
    expect(parseYouTubeVideoId('')).toBeNull();
  });

  it('returns null for a non-youtube URL', () => {
    expect(parseYouTubeVideoId('https://vimeo.com/12345678')).toBeNull();
  });

  it('returns null for a malformed string', () => {
    expect(parseYouTubeVideoId('not-a-url')).toBeNull();
  });
});

describe('getYouTubeThumbnailUrl', () => {
  const VALID_ID = 'dQw4w9WgXcQ';

  it('returns hqdefault url by default', () => {
    expect(getYouTubeThumbnailUrl(VALID_ID)).toBe(
      `https://img.youtube.com/vi/${VALID_ID}/hqdefault.jpg`
    );
  });

  it('returns maxresdefault url when requested', () => {
    expect(getYouTubeThumbnailUrl(`https://youtu.be/${VALID_ID}`, 'maxres')).toBe(
      `https://img.youtube.com/vi/${VALID_ID}/maxresdefault.jpg`
    );
  });

  it('returns null for invalid inputs', () => {
    expect(getYouTubeThumbnailUrl('')).toBeNull();
    expect(getYouTubeThumbnailUrl(null)).toBeNull();
    expect(getYouTubeThumbnailUrl('invalid')).toBeNull();
  });
});
