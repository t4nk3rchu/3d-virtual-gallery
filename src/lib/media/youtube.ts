/**
 * Task 3: YouTube URL parser
 *
 * Extracts youtube_video_id from all common URL formats.
 * Returns null for unrecognised / invalid input.
 */

const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Parse a YouTube video ID from a URL or bare video ID string.
 * Returns null if the input doesn't resolve to a valid 11-char YouTube ID.
 */
export function parseYouTubeVideoId(urlOrId: string | null | undefined): string | null {
  const trimmed = (urlOrId ?? '').trim();
  if (!trimmed) return null;

  // Bare 11-character video ID
  if (YT_ID_RE.test(trimmed)) return trimmed;

  for (const pattern of YT_PATTERNS) {
    const m = trimmed.match(pattern);
    if (m?.[1]) return m[1];
  }

  return null;
}

/**
 * Returns a high-resolution or standard YouTube thumbnail image URL.
 * Returns null if the video ID or URL cannot be resolved.
 */
export function getYouTubeThumbnailUrl(
  urlOrId: string | null | undefined,
  quality: 'hq' | 'maxres' = 'hq'
): string | null {
  const id = parseYouTubeVideoId(urlOrId);
  if (!id) return null;
  return quality === 'maxres'
    ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
    : `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}
