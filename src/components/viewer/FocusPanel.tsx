import { useState, useRef, useEffect } from 'react';
import type { Artwork, Artist } from '../../types/schema';
import { proxyMediaUrl } from '../../lib/media/gdrive';
import { Icon } from '../ui';
import { AudioGuidePlayer } from './AudioGuidePlayer';

interface FocusPanelProps {
  artwork: Artwork & { artist_profile?: Artist | null };
  onInspect(): void;
  onOpenArtist?(artist: Artist): void;
  onPreviousArtwork?(): void;
  onNextArtwork?(): void;
  onClose(): void;
}

export function FocusPanel({
  artwork,
  onInspect,
  onOpenArtist,
  onPreviousArtwork,
  onNextArtwork,
  onClose,
}: FocusPanelProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isGuidePlaying, setIsGuidePlaying] = useState(false);
  const guideRef = useRef<HTMLAudioElement | null>(null);
  const hasGuide = !!artwork.audio_guide_file_id;

  const toggleGuide = () => {
    const audio = guideRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  // Auto-play the audio guide the moment focus mode opens (panel stays closed).
  // Stops on unmount — i.e. exiting focus mode or entering inspect/hotspot audio.
  useEffect(() => {
    if (!hasGuide) return;
    const audio = guideRef.current;
    if (!audio) return;
    audio.play().catch(() => {});
    return () => { audio.pause(); };
  }, [hasGuide]);

  const displayArtist =
    artwork.artist_profile?.name ||
    (artwork.artist && artwork.artist !== 'Untitled Artist' ? artwork.artist : null) ||
    artwork.artist ||
    'Untitled Artist';

  return (
    <>
      {/* Persistent audio-guide element — plays while focused regardless of info panel state */}
      {hasGuide && (
        <audio
          ref={guideRef}
          src={proxyMediaUrl(artwork.audio_guide_file_id!, artwork.updated_at)}
          preload="metadata"
          hidden
          onPlay={() => setIsGuidePlaying(true)}
          onPause={() => setIsGuidePlaying(false)}
          onEnded={() => setIsGuidePlaying(false)}
        />
      )}

      {/* Top-Right Header Bar with Exit button & clean 'i' button (Image 2) */}
      <div className="focus-header-bar" role="region" aria-label="Focus mode controls">
        <button
          type="button"
          className="focus-header-bar__exit-btn"
          onClick={onClose}
          aria-label="Exit detail view"
          title="Exit focus view"
        >
          <span>Exit detail view</span>
          <span className="focus-header-bar__exit-icon"><Icon name="close" size={14} /></span>
        </button>

        <div className="focus-header-bar__stack">
          <button
            type="button"
            className={`focus-header-bar__info-btn ${isInfoOpen ? 'active' : ''}`}
            onClick={() => setIsInfoOpen((prev) => !prev)}
            aria-label={isInfoOpen ? 'Close artwork information' : 'Show artwork information'}
            title="Artwork details"
          >
            <span className="focus-info-icon"><Icon name="info" size={16} /></span>
          </button>

          {hasGuide && (
            <button
              type="button"
              className="focus-header-bar__info-btn"
              onClick={toggleGuide}
              aria-label={isGuidePlaying ? 'Pause audio narration' : 'Play audio narration'}
              title={isGuidePlaying ? 'Pause narration' : 'Play narration'}
            >
              <span className="focus-info-icon"><Icon name={isGuidePlaying ? 'pause' : 'play'} size={15} /></span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Translucent Info Popover Modal (Image 3) */}
      {isInfoOpen && (
        <aside
          className="focus-info-modal"
          role="dialog"
          aria-modal="false"
          aria-label={`Artwork information: ${artwork.title}`}
        >
          {/* Section 1: Fixed Pinned Info (Header, Title, Medium, Dimensions) */}
          <div className="focus-info-modal__pinned">
            <div className="focus-info-modal__header">
              <div className="focus-info-modal__artist">
                {displayArtist.toUpperCase()}
              </div>
              <button
                type="button"
                className="focus-info-modal__close"
                onClick={() => setIsInfoOpen(false)}
                aria-label="Close information card"
              >
                <Icon name="close" size={15} />
              </button>
            </div>

            <div className="focus-info-modal__title-year">
              <strong>{artwork.title}</strong>
              {artwork.year && <span className="focus-info-modal__year">, {artwork.year}</span>}
            </div>

            {artwork.medium && (
              <div className="focus-info-modal__detail-row">
                <span className="detail-label">Medium:</span> {artwork.medium}
              </div>
            )}

            {artwork.dimensions && (
              <div className="focus-info-modal__detail-row">
                <span className="detail-label">Dimensions:</span> {artwork.dimensions}
              </div>
            )}
          </div>

          {/* Section 2: Scrollable Content (Description & Media) */}
          <div className="focus-info-modal__scrollable">
            {artwork.description && (
              <p className="focus-info-modal__desc">{artwork.description}</p>
            )}

            {/* Audio guide narration player — controls the persistent element above */}
            {hasGuide && (
              <div className="focus-info-modal__audio">
                <AudioGuidePlayer audioRef={guideRef} title={artwork.title} />
              </div>
            )}

            {/* YouTube embed for VIDEO artworks */}
            {artwork.artwork_type === 'VIDEO' && artwork.youtube_video_id && (
              <div className="focus-info-modal__video">
                <iframe
                  src={`https://www.youtube.com/embed/${artwork.youtube_video_id}?rel=0`}
                  title={artwork.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>

          {/* Section 3: Fixed Bottom Actions (Read Bio & Inspect buttons) */}
          <div className="focus-info-modal__actions">
            {artwork.artist_profile && (
              <button
                type="button"
                className="focus-panel__artist-link-btn"
                onClick={() => onOpenArtist?.(artwork.artist_profile!)}
                title={`Read biography of ${artwork.artist_profile.name}`}
              >
                <Icon name="user" size={14} /> Read Artist Bio
              </button>
            )}

            {((artwork.artwork_type === 'IMAGE_2D' && artwork.media_file_id) ||
              (artwork.artwork_type === 'VIDEO' && artwork.youtube_video_id)) && (
              <button
                type="button"
                className="focus-info-modal__inspect-btn"
                onClick={onInspect}
              >
                {artwork.artwork_type === 'VIDEO'
                  ? (<><Icon name="film" size={14} /> Open Cinema Mode</>)
                  : (<><Icon name="search" size={14} /> Inspect Full Resolution</>)}
              </button>
            )}
          </div>
        </aside>
      )}

      {/* Floating Side Rail Navigation Controls (Image 2) */}
      {(onPreviousArtwork || onNextArtwork) && (
        <div className="focus-nav-rail" role="navigation" aria-label="Artwork navigation">
          {onPreviousArtwork && (
            <button
              type="button"
              className="focus-nav-btn"
              onClick={onPreviousArtwork}
              title="Previous artwork"
              aria-label="Previous artwork"
            >
              <Icon name="chevronLeft" size={18} />
            </button>
          )}
          {onNextArtwork && (
            <button
              type="button"
              className="focus-nav-btn"
              onClick={onNextArtwork}
              title="Next artwork"
              aria-label="Next artwork"
            >
              <Icon name="chevronRight" size={18} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
