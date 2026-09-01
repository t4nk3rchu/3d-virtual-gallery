import { useEffect } from 'react';
import type { Artist } from '../../types/schema';
import { getImageUrl } from '../../lib/media/gdrive';
import { Icon } from '../ui';

interface ArtistDetailModalProps {
  artist: Artist;
  onClose(): void;
}

export function ArtistDetailModal({ artist, onClose }: ArtistDetailModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const portraitUrl = artist.portrait_file_id
    ? getImageUrl(artist.portrait_file_id, 'gallery')
    : null;

  return (
    <div
      className="artist-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="artist-modal-name"
      onClick={onClose}
    >
      <div className="artist-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          className="artist-modal-close"
          onClick={onClose}
          aria-label="Close artist profile"
        >
          <Icon name="close" size={16} />
        </button>

        <div className="artist-modal-content">
          {/* Left Column: Portrait & Life Dates */}
          <div className="artist-modal-portrait-col">
            {portraitUrl ? (
              <div className="artist-portrait-wrapper">
                <img
                  src={portraitUrl}
                  alt={artist.name}
                  className="artist-portrait-img"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="artist-portrait-placeholder">
                <Icon name="user" size={52} />
              </div>
            )}

            {artist.life_dates && (
              <div className="artist-lifedates-badge">
                {artist.life_dates}
              </div>
            )}

            {artist.contact_info && (
              <div className="artist-contact-box">
                <span className="artist-contact-icon"><Icon name="pin" size={13} /></span>
                <span className="artist-contact-text">{artist.contact_info}</span>
              </div>
            )}
          </div>

          {/* Right Column: Bio & Quotes */}
          <div className="artist-modal-info-col">
            <header className="artist-header">
              <span className="artist-kicker">Featured Artist</span>
              <h1 id="artist-modal-name" className="artist-name">
                {artist.name}
              </h1>
            </header>

            {artist.quote && (
              <blockquote className="artist-quote">
                <span className="quote-mark">“</span>
                <p>{artist.quote}</p>
                <span className="quote-mark closing">”</span>
              </blockquote>
            )}

            {artist.biography ? (
              <div className="artist-bio-body">
                {artist.biography.split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="artist-bio-empty">
                Biography not available for this artist.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
