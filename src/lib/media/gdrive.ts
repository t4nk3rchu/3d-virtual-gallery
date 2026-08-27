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
 * Build the Google image CDN URL for a given Drive file ID and size tier.
 *
 * Bug #4 fix: this is the ONE place that constructs image URLs.
 * To swap for a Worker proxy: change this function, every caller updates automatically.
 *
 * Tiers:
 *   thumbnail  → =w400   (curator picker, artwork list)
 *   gallery    → =w1600  (in-scene artwork plane texture)
 *   original   → =s0     (Inspect lightbox deep-zoom)
 */
export function getImageUrl(
  fileId: string,
  tier: 'thumbnail' | 'gallery' | 'original' = 'thumbnail'
): string {
  if (
    fileId.startsWith('http://') ||
    fileId.startsWith('https://') ||
    fileId.startsWith('/') ||
    fileId.startsWith('data:')
  ) {
    return fileId;
  }
  const size = tier === 'thumbnail' ? '=w400' : tier === 'gallery' ? '=w1600' : '=s0';
  return `https://lh3.googleusercontent.com/d/${fileId}${size}`;
}

/**
 * Single chokepoint for proxy-served media URLs (GLB + audio).
 * `version` (room.created_at for GLBs, artwork.updated_at for audio) segments
 * the edge cache so recreated rooms / edited artworks never serve stale bytes.
 */
export function proxyMediaUrl(fileId: string, version?: string | number): string {
  // Curator-provided direct link (or an already-built path) — use as-is, no proxy.
  // Single place the "is this already a URL?" rule lives (was duplicated at call sites).
  if (fileId.startsWith('http://') || fileId.startsWith('https://') || fileId.startsWith('/')) {
    return fileId;
  }
  const base = `/api/media/${fileId}`;
  return version == null || version === '' ? base : `${base}?v=${version}`;
}
