/**
 * Task 10: WebGL detection + 2D fallback catalog
 *
 * Spec §5.5: If WebGL2 is unavailable, render a responsive 2D catalog
 * with cover, grid of images, title/artist/medium/description,
 * audio players, and YouTube embeds.
 */
import type { Artwork } from '../../types/schema';
import { getImageUrl, proxyMediaUrl } from '../../lib/media/gdrive';

let _cachedWebGLSupported: boolean | null = null;

/**
 * Detect WebGL2 support.
 * Cached at module-level to avoid creating redundant WebGL contexts on re-render.
 * Returns false on old hardware, low-end mobile, and locked-down environments.
 */
export function isWebGLSupported(): boolean {
  if (_cachedWebGLSupported !== null) {
    return _cachedWebGLSupported;
  }
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl2');
    _cachedWebGLSupported = ctx !== null;
    // Explicitly release the test context so it doesn't count against the browser's context limit
    ctx?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    _cachedWebGLSupported = false;
  }
  return _cachedWebGLSupported;
}

/** Reset cache for unit testing purposes */
export function _resetWebGLSupportCacheForTesting(): void {
  _cachedWebGLSupported = null;
}

interface FallbackCatalogProps {
  title: string;
  curatorName?: string | null;
  description?: string | null;
  artworks: Artwork[];
}

export function FallbackCatalog({
  title,
  curatorName,
  description,
  artworks,
}: FallbackCatalogProps) {
  const sorted = [...artworks].sort((a, b) => a.order_index - b.order_index);

  return (
    <main className="fallback-catalog" aria-label="Exhibition catalog">
      <header className="fallback-catalog__header">
        <h1 className="fallback-catalog__title">{title}</h1>
        {curatorName && (
          <p className="fallback-catalog__curator">Curated by {curatorName}</p>
        )}
        {description && (
          <p className="fallback-catalog__description">{description}</p>
        )}
        <p className="fallback-catalog__notice">
          3D view requires WebGL2. Showing the 2D catalog.
        </p>
      </header>

      <div className="fallback-catalog__grid">
        {sorted.map((artwork) => (
          <article
            key={artwork.id}
            className="fallback-catalog__item"
            aria-label={artwork.title}
          >
            {/* Image */}
            {artwork.artwork_type === 'IMAGE_2D' && artwork.media_file_id && (
              <img
                className="fallback-catalog__image"
                src={getImageUrl(artwork.media_file_id, 'gallery')}
                alt={artwork.title}
                loading="lazy"
              />
            )}

            {/* YouTube embed */}
            {artwork.artwork_type === 'VIDEO' && artwork.youtube_video_id && (
              <div className="fallback-catalog__video">
                <iframe
                  src={`https://www.youtube.com/embed/${artwork.youtube_video_id}?rel=0`}
                  title={artwork.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            <div className="fallback-catalog__meta">
              <h2 className="fallback-catalog__artwork-title">{artwork.title}</h2>
              {artwork.artist && (
                <p className="fallback-catalog__artist">{artwork.artist}</p>
              )}
              {artwork.medium && (
                <p className="fallback-catalog__medium">{artwork.medium}</p>
              )}
              {artwork.description && (
                <p className="fallback-catalog__desc">{artwork.description}</p>
              )}
            </div>

            {/* Audio guide player */}
            {artwork.audio_guide_file_id && (
              <audio
                className="fallback-catalog__audio-guide"
                controls
                src={proxyMediaUrl(artwork.audio_guide_file_id, artwork.updated_at)}
                aria-label={`Audio guide: ${artwork.title}`}
              />
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
