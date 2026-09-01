import { useState, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { ArtworkHotspot } from '../../types/schema';
import { resolveAudioUrl } from '../../lib/media/gdrive';
import { Icon } from '../ui';

interface InspectDesktopSidebarProps {
  activeHotspot: ArtworkHotspot;
  activeHotspotIndex: number;
  totalHotspots: number;
  onClose(): void;
  onNavigate(index: number): void;
  onAudioSeek?(seconds: number): void;
}

export function InspectDesktopSidebar({
  activeHotspot,
  activeHotspotIndex,
  totalHotspots,
  onClose,
  onNavigate,
  onAudioSeek,
}: InspectDesktopSidebarProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [cardPos, setCardPos] = useState<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'button' || target.closest('button')) {
      return;
    }
    const cardEl = e.currentTarget.closest('.inspect-lightbox__sidebar') as HTMLElement | null;
    if (!cardEl) return;
    const rect = cardEl.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    isDragging.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const newX = Math.max(10, Math.min(window.innerWidth - 350, e.clientX - dragOffset.current.x));
    const newY = Math.max(70, Math.min(window.innerHeight - 180, e.clientY - dragOffset.current.y));
    setCardPos({ x: newX, y: newY });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      isDragging.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const prevIndex = activeHotspotIndex <= 0 ? totalHotspots - 1 : activeHotspotIndex - 1;
  const nextIndex = activeHotspotIndex >= totalHotspots - 1 ? 0 : activeHotspotIndex + 1;

  return (
    <aside
      className={`inspect-lightbox__sidebar ${isMinimized ? 'inspect-lightbox__sidebar--minimized' : ''}`}
      role="dialog"
      aria-label="Hotspot Details"
      style={
        isMinimized && cardPos
          ? { left: `${cardPos.x}px`, top: `${cardPos.y}px`, right: 'auto', bottom: 'auto' }
          : undefined
      }
    >
      <div
        className="sidebar-header"
        style={isMinimized ? { cursor: 'grab' } : undefined}
        onPointerDown={isMinimized ? onPointerDown : undefined}
        onPointerMove={isMinimized ? onPointerMove : undefined}
        onPointerUp={isMinimized ? onPointerUp : undefined}
        onPointerCancel={isMinimized ? onPointerUp : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="detail-badge">
            Detail {String(activeHotspotIndex + 1).padStart(2, '0')} of {String(totalHotspots).padStart(2, '0')}
          </span>
          {isMinimized && (
            <span style={{ fontSize: '11px', color: 'var(--reda-muted-2)', fontStyle: 'italic' }}>
              (Drag to move)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="sidebar-minimize-btn"
            onClick={() => setIsMinimized((prev) => !prev)}
            title={isMinimized ? 'Expand full panel' : 'Minimize to compact card'}
          >
            {isMinimized
              ? (<><Icon name="maximize" size={12} /> Expand</>)
              : (<><Icon name="minimize" size={12} /> Minimize</>)}
          </button>
          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            title="Close panel"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>

      <div className="hotspot-detail-view">
        <h3 className="hotspot-detail-title">{activeHotspot.title}</h3>
        <p className="hotspot-detail-description">{activeHotspot.description}</p>

        {/* Dedicated Audio Player on Desktop */}
        {activeHotspot.audio_file_id && (
          <div className="hotspot-audio-player">
            <label className="audio-label"><Icon name="audio" size={13} /> Dedicated Hotspot Audio</label>
            <audio
              controls
              src={resolveAudioUrl(activeHotspot.audio_file_id)!}
              className="hotspot-audio-element"
            />
          </div>
        )}

        {/* Exhibition Audio Guide Timestamp Seek on Desktop */}
        {activeHotspot.audio_timestamp_seconds != null && onAudioSeek && (
          <button
            type="button"
            className="btn btn--secondary btn--sm hotspot-seek-action"
            onClick={() => onAudioSeek(activeHotspot.audio_timestamp_seconds!)}
          >
            <Icon name="play" size={12} /> Jump to {Math.floor(activeHotspot.audio_timestamp_seconds)}s in Main Audio Guide
          </button>
        )}

        <div className="sidebar-footer-nav">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onNavigate(prevIndex)}
          >
            <Icon name="chevronLeft" size={12} /> Prev
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onNavigate(nextIndex)}
          >
            Next <Icon name="chevronRight" size={12} />
          </button>
        </div>
      </div>
    </aside>
  );
}
