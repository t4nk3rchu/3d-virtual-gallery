import { describe, it, expect } from 'vitest';
import { extractGoogleDriveFileId, getImageUrl } from './gdrive';

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

describe('getImageUrl', () => {
  const FILE_ID = 'abc123xyz';

  it('thumbnail returns =w400', () => {
    expect(getImageUrl(FILE_ID, 'thumbnail')).toBe(
      `https://lh3.googleusercontent.com/d/${FILE_ID}=w400`
    );
  });

  it('gallery returns =w1600', () => {
    expect(getImageUrl(FILE_ID, 'gallery')).toBe(
      `https://lh3.googleusercontent.com/d/${FILE_ID}=w1600`
    );
  });

  it('original returns =s0', () => {
    expect(getImageUrl(FILE_ID, 'original')).toBe(
      `https://lh3.googleusercontent.com/d/${FILE_ID}=s0`
    );
  });
});
