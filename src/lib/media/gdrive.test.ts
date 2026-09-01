import { describe, it, expect } from 'vitest';
import { extractGoogleDriveFileId, getImageUrl, proxyMediaUrl } from './gdrive';

describe('extractGoogleDriveFileId', () => {
  const VALID_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms';

  it('accepts a bare file ID', () => {
    expect(extractGoogleDriveFileId(VALID_ID)).toBe(VALID_ID);
  });

  it('extracts from /file/d/ sharing URL', () => {
    expect(
      extractGoogleDriveFileId(`https://drive.google.com/file/d/${VALID_ID}/view?usp=sharing`)
    ).toBe(VALID_ID);
  });

  it('extracts from /open?id= URL', () => {
    expect(
      extractGoogleDriveFileId(`https://drive.google.com/open?id=${VALID_ID}`)
    ).toBe(VALID_ID);
  });

  it('extracts from uc?export=download&id= URL', () => {
    expect(
      extractGoogleDriveFileId(
        `https://drive.google.com/uc?export=download&id=${VALID_ID}`
      )
    ).toBe(VALID_ID);
  });

  it('returns null for empty string', () => {
    expect(extractGoogleDriveFileId('')).toBeNull();
  });

  it('returns null for arbitrary junk', () => {
    expect(extractGoogleDriveFileId('https://example.com/not-drive')).toBeNull();
  });
});

describe('getImageUrl (proxied — private Drive)', () => {
  const FILE_ID = 'abc123xyz';

  it('routes Drive images through /api/media, not lh3', () => {
    expect(getImageUrl(FILE_ID, 'thumbnail')).toContain('/api/media/abc123xyz');
    expect(getImageUrl(FILE_ID, 'thumbnail')).not.toContain('googleusercontent');
  });

  it('includes tier hint in the proxy URL', () => {
    expect(getImageUrl(FILE_ID, 'thumbnail')).toContain('tier=thumbnail');
    expect(getImageUrl(FILE_ID, 'gallery')).toContain('tier=gallery');
    expect(getImageUrl(FILE_ID, 'original')).toContain('tier=original');
  });

  it('extracts Drive file ID from sharing links', () => {
    expect(
      getImageUrl(`https://drive.google.com/file/d/${FILE_ID}/view?usp=sharing`, 'gallery')
    ).toContain(`/api/media/${FILE_ID}`);
    expect(
      getImageUrl(`https://drive.google.com/open?id=${FILE_ID}`, 'thumbnail')
    ).toContain(`/api/media/${FILE_ID}`);
  });

  it('passes through external URLs and data URIs unchanged', () => {
    expect(getImageUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
    expect(getImageUrl('data:image/png;base64,123')).toBe('data:image/png;base64,123');
  });
});

describe('proxyMediaUrl', () => {
  it('builds a bare proxy url without a version', () => {
    expect(proxyMediaUrl('fid')).toBe('/api/media/fid');
  });
  it('appends a version query param', () => {
    expect(proxyMediaUrl('fid', 1712345678)).toBe('/api/media/fid?v=1712345678');
  });
  it('extracts Google Drive sharing link and proxies it', () => {
    expect(proxyMediaUrl('https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view?usp=sharing')).toBe(
      '/api/media/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms'
    );
    expect(proxyMediaUrl('https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms', '2026')).toBe(
      '/api/media/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms?v=2026'
    );
  });
  it('passes through non-Drive direct URLs and paths unchanged (no proxy, no version)', () => {
    expect(proxyMediaUrl('https://example.com/a.glb', 5)).toBe('https://example.com/a.glb');
    expect(proxyMediaUrl('http://example.com/a.mp3')).toBe('http://example.com/a.mp3');
    expect(proxyMediaUrl('/local/asset.glb', 5)).toBe('/local/asset.glb');
  });
});
