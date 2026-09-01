/**
 * Task 9: Hotspot overlay — pins and interpretive cards with auto-fade on focus
 *
 * Spec §5.4:
 *   - Pins rendered at x_percent/y_percent over the image
 *   - Click -> show interpretive card & trigger auto-fade
 *   - If audio_timestamp_seconds set -> invoke audio seek callback
 */
import { useState } from 'react';
import type { ArtworkHotspot } from '../../types/schema';
import { Icon } from '../ui';

interface HotspotOverlayProps {
  hotspots: ArtworkHotspot[];
  activeHotspotId?: string | null;
  hideFloatingCard?: boolean;
  onSelectHotspot?(id: string): void;
  onDismissActive?(): void;
  onAudioSeek?(seconds: number): void;
}

interface HotspotCardProps {
  hotspot: ArtworkHotspot;
  onAudioSeek?(seconds: number): void;
  onDismiss(): void;
}

function HotspotCard({ hotspot, onAudioSeek, onDismiss }: HotspotCardProps) {
  return (
    <div
      className="hotspot-card"
      role="dialog"
      aria-label={hotspot.title}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="hotspot-card__close"
        onClick={onDismiss}
        aria-label="Close hotspot"
      >
        <Icon name="close" size={13} />
      </button>
      <span className="hotspot-card__eyebrow">Interpretive Point</span>
      <h3 className="hotspot-card__title">{hotspot.title}</h3>
      <p className="hotspot-card__description">{hotspot.description}</p>
      {hotspot.audio_timestamp_seconds != null && onAudioSeek && (
        <button
          type="button"
          className="hotspot-card__seek-btn"
          onClick={() => onAudioSeek(hotspot.audio_timestamp_seconds!)}
        >
          <Icon name="play" size={12} /> Jump to {Math.floor(hotspot.audio_timestamp_seconds)}s in audio guide
        </button>
      )}
    </div>
  );
}

export function HotspotOverlay({
  hotspots,
  activeHotspotId,
  hideFloatingCard = false,
  onSelectHotspot,
  onDismissActive,
  onAudioSeek,
}: HotspotOverlayProps) {
  const [internalActiveId, setInternalActiveId] = useState<string | null>(null);

  const currentActiveId = activeHotspotId !== undefined ? activeHotspotId : internalActiveId;
  const active = hotspots.find((h) => h.id === currentActiveId);

  const handleSelect = (id: string) => {
    if (onSelectHotspot) {
      onSelectHotspot(id);
    } else {
      setInternalActiveId(id);
    }
  };

  const handleDismiss = () => {
    if (onDismissActive) {
      onDismissActive();
    } else {
      setInternalActiveId(null);
    }
  };

  return (
    <div className="hotspot-overlay-container">
      {hotspots.map((hotspot) => {
        const isActive = hotspot.id === currentActiveId;
        return (
          <button
            key={hotspot.id}
            type="button"
            className={`hotspot-pin ${isActive ? 'hotspot-pin--active' : ''}`}
            style={{
              position: 'absolute',
              left: `${hotspot.x_percent}%`,
              top: `${hotspot.y_percent}%`,
              transform: 'translate(-50%, -50%)',
              opacity: isActive ? 0 : 1,
              pointerEvents: isActive ? 'none' : 'auto',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleSelect(hotspot.id);
            }}
            aria-label={`Hotspot: ${hotspot.title}`}
          >
            <span className="hotspot-pin__ripple" aria-hidden="true" />
            <span className="hotspot-pin__dot" aria-hidden="true" />
            <span className="hotspot-pin__tooltip">{hotspot.title}</span>
          </button>
        );
      })}

      {active && !hideFloatingCard && (
        <HotspotCard
          hotspot={active}
          onAudioSeek={onAudioSeek}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}
