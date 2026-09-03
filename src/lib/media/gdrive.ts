/**
 * Task 3: Google Drive file ID extractor + image/media URL helpers
 *
 * All Drive media now routes through /api/media (private Drive means lh3 is
 * unavailable). Signed tokens from the API are appended automatically via
 * the media-token registry — call sites need no changes.
 */

import { getMediaToken } from './media-tokens';

// Matches all common Google Drive sharing URL formats
const DRIVE_URL_PATTERNS = [
  /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/,
  /docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/,
  /id=([a-zA-Z0-9_-]+)/,
];

const FILE_ID_RE = /^[a-zA-Z0-9_-]+$/;

/**
 * Extract a Google Drive fileId from a sharing URL or bare ID.
 * Returns null for unrecognised input.
 */
export function extractGoogleDriveFileId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  if (FILE_ID_RE.test(trimmed) && !trimmed.includes('.')) {
    return trimmed;
  }

  for (const pattern of DRIVE_URL_PATTERNS) {
    const m = trimmed.match(pattern);
    if (m?.[1]) return m[1];
  }

  return null;
}

/** Append the registered signed token (if any) to a proxy URL. */
function withToken(path: string, fileId: string): string {
  const t = getMediaToken(fileId);
  if (!t) return path;
  return path + (path.includes('?') ? '&' : '?') + `t=${encodeURIComponent(t)}`;
}

/**
 * Build a proxy URL for a Drive image. Private Drive means lh3.googleusercontent.com
 * only serves public files — all images must route through /api/media.
 * The `tier` param is a hint for a future resizing layer (Cloudflare Image Resizing);
 * it has no effect yet but lets a later layer add resizing without client changes.
 */
export function getImageUrl(
  fileIdOrUrl: string,
  tier: 'thumbnail' | 'gallery' | 'original' = 'thumbnail'
): string {
  if (!fileIdOrUrl) return '';
  const trimmed = fileIdOrUrl.trim();
  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return withToken(`/api/media/${driveId}?tier=${tier}`, driveId);
  }
  return trimmed;
}

/**
 * Single chokepoint for proxy-served media URLs (GLB, audio, video).
 * `version` segments the edge cache so recreated rooms / edited artworks
 * never serve stale bytes. Appends a signed token if one is registered.
 */
export function proxyMediaUrl(fileIdOrUrl: string, version?: string | number): string {
  if (!fileIdOrUrl) return '';
  const trimmed = fileIdOrUrl.trim();

  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    const base = `/api/media/${driveId}`;
    const versioned = version == null || version === '' ? base : `${base}?v=${version}`;
    return withToken(versioned, driveId);
  }

  return trimmed;
}
