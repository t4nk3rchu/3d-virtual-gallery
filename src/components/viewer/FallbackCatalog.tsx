/**
 * Task 10: WebGL detection + 2D fallback catalog
 *
 * Spec §5.5: If WebGL2 is unavailable, render a responsive 2D catalog
 * with cover, grid of images, title/artist/medium/description,
 * audio players, and YouTube embeds.
 */
import type { Artwork } from '../../types/schema';
import { getImageUrl, proxyMediaUrl } from '../../lib/media/gdrive';
import { Icon } from '../ui';

/**
 * Detect WebGL2 support.
 * Returns false on old hardware, low-end mobile, and locked-down environments.
 */
export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl2');
    return ctx !== null;
  } catch {
    return false;
  }
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

            {/* Audio marker icon + player */}
            {artwork.artwork_type === 'AUDIO' && artwork.media_file_id && (
              <div className="fallback-catalog__audio">
                <span className="fallback-catalog__audio-icon" aria-hidden="true">
                  <Icon name="audio" size={16} />
                </span>
                <audio
                  controls
                  src={proxyMediaUrl(artwork.media_file_id, artwork.updated_at)}
                  aria-label={`Audio: ${artwork.title}`}
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
