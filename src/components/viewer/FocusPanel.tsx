/**
 * Task 9: Focus info panel — slides out when an artwork is focused
 *
 * Spec §5.1 (Focus state):
 *   - Slide-out panel from screen edge (not a lightbox)
 *   - Shows: title, artist, medium, description
 *   - If artwork has audio_guide_file_id → <audio> player
 *   - If artwork is VIDEO → YouTube embed
 *   - "Inspect" button → triggers Inspect state
 */
import type { Artwork } from '../../types/schema';

interface FocusPanelProps {
  artwork: Artwork;
  onInspect(): void;
  onClose(): void;
}

export function FocusPanel({ artwork, onInspect, onClose }: FocusPanelProps) {
  return (
    <aside
      className="focus-panel"
      role="complementary"
      aria-label={`Artwork info: ${artwork.title}`}
    >
      <button
        className="focus-panel__close"
        onClick={onClose}
        aria-label="Close info panel"
      >
        ×
      </button>

      <div className="focus-panel__meta">
        <h2 className="focus-panel__title">{artwork.title}</h2>
        {artwork.artist && (
          <p className="focus-panel__artist">{artwork.artist}</p>
        )}
        {(artwork.medium || artwork.year) && (
          <p className="focus-panel__medium">
            {[artwork.medium, artwork.year].filter(Boolean).join(', ')}
          </p>
        )}
        {artwork.dimensions && (
          <p className="focus-panel__dimensions">{artwork.dimensions}</p>
        )}
        {artwork.description && (
          <p className="focus-panel__description">{artwork.description}</p>
        )}
      </div>

      {/* Audio player for AUDIO artworks */}
      {artwork.artwork_type === 'AUDIO' && artwork.media_file_id && (
        <div className="focus-panel__audio">
          <audio
            controls
            src={`/api/media/${artwork.media_file_id}`}
            aria-label="Artwork audio track"
          />
        </div>
      )}

      {/* Audio guide narration player for other artworks */}
      {artwork.audio_guide_file_id && artwork.artwork_type !== 'AUDIO' && (
        <div className="focus-panel__audio">
          <audio
            controls
            src={`/api/media/${artwork.audio_guide_file_id}`}
            aria-label="Audio guide"
          />
        </div>
      )}

      {/* YouTube embed for VIDEO artworks */}
      {artwork.artwork_type === 'VIDEO' && artwork.youtube_video_id && (
        <div className="focus-panel__video">
          <iframe
            src={`https://www.youtube.com/embed/${artwork.youtube_video_id}?rel=0`}
            title={artwork.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Inspect / Cinema button */}
      {((artwork.artwork_type === 'IMAGE_2D' && artwork.media_file_id) ||
        (artwork.artwork_type === 'VIDEO' && artwork.youtube_video_id)) && (
        <button className="focus-panel__inspect-btn" onClick={onInspect}>
          {artwork.artwork_type === 'VIDEO' ? '🎥 Open Cinema Mode →' : 'Inspect full resolution →'}
        </button>
      )}
    </aside>
  );
}
