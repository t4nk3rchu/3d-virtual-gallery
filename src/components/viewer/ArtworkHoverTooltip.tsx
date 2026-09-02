import type { Artwork, Artist } from '../../types/schema';

interface ArtworkHoverTooltipProps {
  artwork: (Artwork & { artist_profile?: Artist | null }) | null;
  position: { x: number; y: number } | null;
}

export function ArtworkHoverTooltip({ artwork, position }: ArtworkHoverTooltipProps) {
  if (!artwork || !position) return null;

  const displayArtist =
    artwork.artist_profile?.name ||
    (artwork.artist && artwork.artist !== 'Untitled Artist' ? artwork.artist : null) ||
    artwork.artist ||
    'Untitled Artist';

  // Position tooltip adjacent to cursor or crosshair, clamping slightly to avoid edge overflow
  const isCenter = typeof window !== 'undefined' &&
    Math.abs(position.x - window.innerWidth / 2) < 5 &&
    Math.abs(position.y - window.innerHeight / 2) < 5;

  const offsetX = isCenter ? 24 : 16;
  const offsetY = isCenter ? -12 : 16;
  const left = Math.min(position.x + offsetX, (typeof window !== 'undefined' ? window.innerWidth : 800) - 220);
  const top = Math.min(Math.max(10, position.y + offsetY), (typeof window !== 'undefined' ? window.innerHeight : 600) - 100);

  return (
    <div
      className="artwork-hover-tooltip"
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 60,
        pointerEvents: 'none',
      }}
      role="tooltip"
      aria-hidden="true"
    >
      <div className="artwork-hover-tooltip__artist">
        {displayArtist}
      </div>
      <div className="artwork-hover-tooltip__title-year">
        <span className="artwork-hover-tooltip__title">{artwork.title}</span>
        {artwork.year && <span className="artwork-hover-tooltip__year">, {artwork.year}</span>}
      </div>
    </div>
  );
}
