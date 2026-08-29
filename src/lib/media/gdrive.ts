/**
 * Task 3: Google Drive file ID extractor + image URL helper
 *
 * Bug #4 fix: getImageUrl is the single chokepoint for image URLs.
 * If lh3.googleusercontent.com breaks, swap the implementation here — no caller changes.
 */

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

  // Bare fileId (no slash, no dot, matches charset)
  if (FILE_ID_RE.test(trimmed) && !trimmed.includes('.')) {
    return trimmed;
  }

  for (const pattern of DRIVE_URL_PATTERNS) {
    const m = trimmed.match(pattern);
    if (m?.[1]) return m[1];
  }

  return null;
}

/**
 * Build the Google image CDN URL for a given Drive file ID or sharing link and size tier.
 *
 * Bug #4 fix: this is the ONE place that constructs image URLs.
 * Extracts the fileId if a full Google Drive sharing link is passed.
 *
 * Tiers:
 *   thumbnail  → =w400   (curator picker, artwork list)
 *   gallery    → =w1600  (in-scene artwork plane texture)
 *   original   → =s0     (Inspect lightbox deep-zoom)
 */
export function getImageUrl(
  fileIdOrUrl: string,
  tier: 'thumbnail' | 'gallery' | 'original' = 'thumbnail'
): string {
  if (!fileIdOrUrl) return '';
  const trimmed = fileIdOrUrl.trim();

  // If it's a Google Drive link or bare file ID, extract the fileId and use Google's Image CDN
  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    const size = tier === 'thumbnail' ? '=w400' : tier === 'gallery' ? '=w1600' : '=s0';
    return `https://lh3.googleusercontent.com/d/${driveId}${size}`;
  }

  // Direct external image URL (e.g. https://domain.com/photo.jpg) or local / data: URI
  return trimmed;
}

/**
 * Single chokepoint for proxy-served media URLs (GLB, audio, video).
 * `version` (room.created_at for GLBs, artwork.updated_at for audio/video) segments
 * the edge cache so recreated rooms / edited artworks never serve stale bytes.
 * If a Google Drive sharing link or bare ID is passed, it extracts the fileId and proxies it.
 * Direct external URLs (e.g. https://domain.com/video.mp4) or local asset paths pass through.
 */
export function proxyMediaUrl(fileIdOrUrl: string, version?: string | number): string {
  if (!fileIdOrUrl) return '';
  const trimmed = fileIdOrUrl.trim();

  // If it's a Google Drive URL or bare Drive ID, extract the fileId and proxy it
  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    const base = `/api/media/${driveId}`;
    return version == null || version === '' ? base : `${base}?v=${version}`;
  }

  // Curator-provided direct web link (e.g. https://domain.com/video.mp4 or /local.mp4)
  return trimmed;
}

/**
 * Canonical helper for resolving playable audio URLs from a file ID, sharing link, or direct URL.
 */
export function resolveAudioUrl(fileIdOrUrl?: string | null, version?: string | number): string | null {
  if (!fileIdOrUrl) return null;
  const resolved = proxyMediaUrl(fileIdOrUrl, version);
  return resolved || null;
}

