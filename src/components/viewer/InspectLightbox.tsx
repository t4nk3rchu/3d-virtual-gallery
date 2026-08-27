/**
 * Task 9 & Enhanced Inspect Lightbox
 *
 * Implements:
 *   - Full-resolution (=s0) image loading
 *   - Interactive 3D Perspective Slab Tilt with realistic frame bevels and drop shadow
 *   - Inertial Spring-Damped Pan & Zoom physics
 *   - Cinematic "Dip" Arc Flight when navigating between hotspots
 *   - Hotspot Hover Tooltips & Active Pin Auto-Fade
 *   - Hotspot Detail Side Panel with Dedicated Audio Player & Timestamp Seek
 *   - Full Hotspots List Drawer
 *   - Settings toggle integration for 3D tilt
 */
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { Artwork, ArtworkHotspot, FrameConfig, Artist } from '../../types/schema';
import { getImageUrl, proxyMediaUrl } from '../../lib/media/gdrive';
import { HotspotOverlay } from './HotspotOverlay';
import { type ViewerSettings, getStoredViewerSettings } from './SettingsModal';
import {
  getHotspotAnimation,
  type HotspotAnimationState,
  type HotspotAnimationPreset,
} from '../../lib/viewer/hotspot-animations';

interface InspectLightboxProps {
  artwork: Artwork & { artist_profile?: Artist | null };
  hotspots: ArtworkHotspot[];
  onClose(): void;
  onAudioSeek?(seconds: number): void;
  onOpenArtist?(artist: Artist): void;
  settings?: ViewerSettings;
}

interface TransformState {
  s: number;
  x: number;
  y: number;
  rx: number;
  ry: number;
}

interface ActiveHotspotFlight {
  from: HotspotAnimationState;
  to: HotspotAnimationState;
  preset: HotspotAnimationPreset;
  overviewScale: number;
  start: number;
}

export function InspectLightbox({
  artwork,
  hotspots,
  onClose,
  onAudioSeek,
  onOpenArtist,
  settings: propSettings,
}: InspectLightboxProps) {
  const settings = propSettings || getStoredViewerSettings();
  const [activeHotspotIndex, setActiveHotspotIndex] = useState<number>(-1);
  const [showHotspotList, setShowHotspotList] = useState<boolean>(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState<boolean>(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const frameConfig = useMemo<FrameConfig | null>(() => {
    try {
      return artwork.frame_config_json ? JSON.parse(artwork.frame_config_json) : null;
    } catch {
      return null;
    }
  }, [artwork.frame_config_json]);

  const activeTransition = frameConfig?.hotspotTransition ?? 'arc_dip';

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const tiltRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const cur = useRef<TransformState>({ s: 1, x: 0, y: 0, rx: 0, ry: 0 });
  const tgt = useRef<TransformState>({ s: 1, x: 0, y: 0, rx: 0, ry: 0 });
  const anim = useRef<ActiveHotspotFlight | null>(null);

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const mode = useRef<'pan' | 'tilt' | 'pinch' | null>(null);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const tiltStart = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const pinchStart = useRef<{ dist: number; scale: number; mid: { x: number; y: number } } | null>(null);

  const imageUrl = artwork.media_file_id
    ? getImageUrl(artwork.media_file_id, 'original')
    : null;

  const activeHotspot = activeHotspotIndex >= 0 ? hotspots[activeHotspotIndex] : null;

  // Fit image inside viewport on load
  const fitToScreen = useCallback((snap = false) => {
    const vp = viewportRef.current;
    const img = imgRef.current;
    if (!vp || !img || !img.naturalWidth || !img.naturalHeight) return;

    const vw = vp.clientWidth || window.innerWidth;
    const vh = vp.clientHeight || window.innerHeight;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const scale = Math.min((vw * 0.82) / iw, (vh * 0.82) / ih, 1.2);
    const clampedScale = Math.max(0.3, Math.min(3, scale));
    const toX = (vw - iw * clampedScale) / 2;
    const toY = (vh - ih * clampedScale) / 2;

    tgt.current = { s: clampedScale, x: toX, y: toY, rx: 0, ry: 0 };
    if (snap) {
      cur.current = { ...tgt.current };
    }
  }, []);

  // Physics animation tick loop
  useEffect(() => {
    let reqId: number;

    const tick = () => {
      const stage = stageRef.current;
      const tilt = tiltRef.current;

      if (anim.current) {
        const elapsed = performance.now() - anim.current.start;
        const dur = anim.current.preset.durationMs;
        const t0 = elapsed / dur;
        const t = Math.max(0, Math.min(1, t0));

        const next = anim.current.preset.interpolate(
          anim.current.from,
          anim.current.to,
          t,
          anim.current.overviewScale
        );

        cur.current.x = next.x;
        cur.current.y = next.y;
        cur.current.s = next.s;

        if (t0 >= 1) {
          tgt.current.s = cur.current.s;
          tgt.current.x = cur.current.x;
          tgt.current.y = cur.current.y;
          anim.current = null;
        }
      } else {
        const ease = mode.current ? 0.35 : 0.14;
        cur.current.s += (tgt.current.s - cur.current.s) * ease;
        cur.current.x += (tgt.current.x - cur.current.x) * ease;
        cur.current.y += (tgt.current.y - cur.current.y) * ease;
      }

      const tiltEase = 0.16;
      cur.current.rx += (tgt.current.rx - cur.current.rx) * tiltEase;
      cur.current.ry += (tgt.current.ry - cur.current.ry) * tiltEase;

      if (stage) {
        stage.style.transform = `translate(${cur.current.x}px, ${cur.current.y}px) scale(${cur.current.s})`;
      }
      if (tilt) {
        tilt.style.transform = `rotateX(${cur.current.rx}deg) rotateY(${cur.current.ry}deg)`;
      }

      reqId = requestAnimationFrame(tick);
    };

    reqId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(reqId);
  }, []);

  // Configured Hotspot Transition Flight
  const triggerTransitionFlight = useCallback(
    (to: { s: number; x: number; y: number }) => {
      const from = { s: cur.current.s, x: cur.current.x, y: cur.current.y };
      const preset = getHotspotAnimation(activeTransition);

      const vp = viewportRef.current;
      const img = imgRef.current;
      let overviewScale = 0.5;
      if (vp && img && img.naturalWidth && img.naturalHeight) {
        const vw = vp.clientWidth || window.innerWidth;
        const vh = vp.clientHeight || window.innerHeight;
        overviewScale = Math.min((vw * 0.82) / img.naturalWidth, (vh * 0.82) / img.naturalHeight, 1.2);
      }

      anim.current = {
        from,
        to,
        preset,
        overviewScale,
        start: performance.now(),
      };
    },
    [activeTransition]
  );

  // Focus a specific hotspot index (direct zoom vs flight arc)
  const focusHotspot = useCallback(
    (index: number, useFlightArc = false) => {
      if (index < 0 || index >= hotspots.length) {
        setActiveHotspotIndex(-1);
        return;
      }

      setActiveHotspotIndex(index);
      const h = hotspots[index];
      const vp = viewportRef.current;
      const img = imgRef.current;
      if (!vp || !img) return;

      const vw = vp.clientWidth || window.innerWidth;
      const vh = vp.clientHeight || window.innerHeight;
      const iw = img.naturalWidth || 1000;
      const ih = img.naturalHeight || 800;

      const targetScale = Math.min(3.2, Math.max(1.8, (vw * 0.75) / (iw * 0.35)));
      const px = (h.x_percent / 100) * iw;
      const py = (h.y_percent / 100) * ih;

      // Shift slightly to the left if side panel will be visible
      const offsetX = vw > 768 ? -80 : 0;
      const toX = vw / 2 - px * targetScale + offsetX;
      const toY = vh / 2 - py * targetScale;

      if (useFlightArc) {
        // Flight transition animation for list & detail nav
        triggerTransitionFlight({ s: targetScale, x: toX, y: toY });
      } else {
        // Direct zoom in for pin clicks
        anim.current = null;
        tgt.current = {
          s: targetScale,
          x: toX,
          y: toY,
          rx: 0,
          ry: 0,
        };
      }

      if (h.audio_timestamp_seconds != null && onAudioSeek) {
        onAudioSeek(h.audio_timestamp_seconds);
      }
    },
    [hotspots, onAudioSeek, triggerTransitionFlight]
  );

  // Pointer event handlers
  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      const vp = viewportRef.current;
      if (!vp) return;

      // Ignore clicks on hotspot pins, cards, controls, sidebars, or headers
      if (
        (e.target as HTMLElement).closest('.hotspot-pin') ||
        (e.target as HTMLElement).closest('.hotspot-card') ||
        (e.target as HTMLElement).closest('.inspect-lightbox__controls') ||
        (e.target as HTMLElement).closest('.inspect-lightbox__sidebar') ||
        (e.target as HTMLElement).closest('.inspect-lightbox__header')
      ) {
        return;
      }

      try {
        vp.setPointerCapture(e.pointerId);
      } catch {}

      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      anim.current = null;

      if (pointers.current.size === 2) {
        mode.current = 'pinch';
        const p = Array.from(pointers.current.values());
        const rect = vp.getBoundingClientRect();
        pinchStart.current = {
          dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y),
          scale: cur.current.s,
          mid: {
            x: (p[0].x + p[1].x) / 2 - rect.left,
            y: (p[0].y + p[1].y) / 2 - rect.top,
          },
        };
        panStart.current = null;
        tiltStart.current = null;
      } else if (e.button === 2 && settings.tiltEnabled) {
        // Right-click drag: 3D perspective tilt
        mode.current = 'tilt';
        tiltStart.current = {
          x: e.clientX,
          y: e.clientY,
          rx: cur.current.rx,
          ry: cur.current.ry,
        };
      } else if (e.button === 0) {
        // Left-click drag: Pan
        mode.current = 'pan';
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          tx: cur.current.x,
          ty: cur.current.y,
        };
      }
    },
    [settings.tiltEnabled]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (mode.current === 'pinch' && pinchStart.current) {
        const p = Array.from(pointers.current.values());
        if (p.length >= 2) {
          const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
          const factor = dist / Math.max(1, pinchStart.current.dist);
          const newScale = Math.max(0.3, Math.min(5, pinchStart.current.scale * factor));
          const cx = pinchStart.current.mid.x;
          const cy = pinchStart.current.mid.y;
          const px = (cx - tgt.current.x) / tgt.current.s;
          const py = (cy - tgt.current.y) / tgt.current.s;
          tgt.current.s = newScale;
          tgt.current.x = cx - px * newScale;
          tgt.current.y = cy - py * newScale;
        }
      } else if (mode.current === 'tilt' && tiltStart.current && settings.tiltEnabled) {
        const dx = e.clientX - tiltStart.current.x;
        const dy = e.clientY - tiltStart.current.y;
        const sens = 0.32;
        tgt.current.ry = Math.max(-45, Math.min(45, tiltStart.current.ry + dx * sens));
        tgt.current.rx = Math.max(-45, Math.min(45, tiltStart.current.rx - dy * sens));
      } else if (mode.current === 'pan' && panStart.current) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        tgt.current.x = panStart.current.tx + dx;
        tgt.current.y = panStart.current.ty + dy;
      }
    },
    [settings.tiltEnabled]
  );

  const endPointer = useCallback((e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      mode.current = null;
      panStart.current = null;
      tiltStart.current = null;
    }
  }, []);

  // Zoom anchored around cursor position
  const onWheel = useCallback((e: ReactWheelEvent) => {
    e.preventDefault();
    anim.current = null;
    const vp = viewportRef.current;
    if (!vp) return;

    const rect = vp.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const zoomFactor = Math.exp(-e.deltaY * 0.0015);
    const newScale = Math.max(0.3, Math.min(6, tgt.current.s * zoomFactor));

    const px = (cx - tgt.current.x) / tgt.current.s;
    const py = (cy - tgt.current.y) / tgt.current.s;

    tgt.current.s = newScale;
    tgt.current.x = cx - px * newScale;
    tgt.current.y = cy - py * newScale;
  }, []);

  const onBackdropClick = useCallback(
    (e: ReactMouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const resolveAudioUrl = (fileId: string | null) => {
    if (!fileId) return null;
    return proxyMediaUrl(fileId, artwork.updated_at); // passthrough handles direct URLs
  };

  return (
    <div
      className="inspect-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Inspect: ${artwork.title}`}
      onClick={onBackdropClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <header className="inspect-lightbox__header">
        <div className="inspect-lightbox__title-info">
          <span className="eyebrow">Inspect Mode</span>
          <h2>{artwork.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
            {artwork.artist && <p className="artist" style={{ margin: 0 }}>{artwork.artist}</p>}
            {artwork.artist_profile && (
              <button
                type="button"
                className="btn btn--sm btn--ghost inspect-artist-link"
                onClick={() => onOpenArtist?.(artwork.artist_profile!)}
                title={`Read about ${artwork.artist_profile.name}`}
              >
                👤 About {artwork.artist_profile.name}
              </button>
            )}
          </div>
        </div>

        <div className="inspect-lightbox__header-actions">
          {hotspots.length > 0 && (
            <button
              type="button"
              className={`btn btn--sm ${showHotspotList ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setShowHotspotList((prev) => !prev)}
            >
              📍 Hotspots List ({hotspots.length})
            </button>
          )}

          <button
            type="button"
            className="inspect-lightbox__close"
            onClick={onClose}
            aria-label="Close inspect"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="inspect-lightbox__main-area">
        <div
          ref={viewportRef}
          className="inspect-lightbox__viewport"
          onPointerDown={artwork.artwork_type === 'VIDEO' ? undefined : onPointerDown}
          onPointerMove={artwork.artwork_type === 'VIDEO' ? undefined : onPointerMove}
          onPointerUp={artwork.artwork_type === 'VIDEO' ? undefined : endPointer}
          onPointerCancel={artwork.artwork_type === 'VIDEO' ? undefined : endPointer}
          onWheel={artwork.artwork_type === 'VIDEO' ? undefined : onWheel}
        >
          {artwork.artwork_type === 'VIDEO' && artwork.youtube_video_id ? (
            <div className="inspect-lightbox__cinema-wrapper">
              <div className="inspect-lightbox__cinema-player">
                <iframe
                  src={`https://www.youtube.com/embed/${artwork.youtube_video_id}?autoplay=1&rel=0`}
                  title={artwork.title}
                  className="inspect-lightbox__cinema-iframe"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          ) : (
            <div
              ref={tiltRef}
              className={`inspect-lightbox__tilt ${settings.tiltEnabled ? 'tilt-enabled' : ''}`}
            >
              <div ref={stageRef} className="inspect-lightbox__stage">
                {imageUrl && (
                  <div className="inspect-lightbox__slab">
                    {/* 3D Drop Shadow */}
                    <div className="inspect-lightbox__shadow" />

                    {/* 3D Bevel Frame Edges */}
                    <div className="inspect-lightbox__frame-top" />
                    <div className="inspect-lightbox__frame-bottom" />
                    <div className="inspect-lightbox__frame-left" />
                    <div className="inspect-lightbox__frame-right" />

                    <img
                      ref={imgRef}
                      src={imageUrl}
                      alt={artwork.title}
                      className="inspect-lightbox__image"
                      draggable={false}
                      onLoad={() => {
                        setImgLoaded(true);
                        fitToScreen(true);
                      }}
                    />

                    {/* Interactive Hotspots with Hover Tooltips & Auto-Fade */}
                    {imgLoaded && (
                      <HotspotOverlay
                        hotspots={hotspots}
                        activeHotspotId={activeHotspotIndex >= 0 ? hotspots[activeHotspotIndex]?.id : null}
                        hideFloatingCard={true}
                        onSelectHotspot={(id) => {
                          const idx = hotspots.findIndex((h) => h.id === id);
                          if (idx >= 0) {
                            focusHotspot(idx, false); // Direct zoom into pin
                            setShowHotspotList(false);
                          }
                        }}
                        onDismissActive={() => setActiveHotspotIndex(-1)}
                        onAudioSeek={onAudioSeek}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Side Panel: Active Hotspot Detail OR Hotspots List */}
        {(activeHotspot || showHotspotList) && (
          <aside
            className={`inspect-lightbox__sidebar ${
              !showHotspotList && isSidebarMinimized ? 'inspect-lightbox__sidebar--minimized' : ''
            }`}
            aria-label="Hotspot Details"
          >
            {showHotspotList ? (
              <div className="hotspots-list-view">
                <div className="sidebar-header">
                  <h3>📍 Hotspots Directory</h3>
                  <button
                    type="button"
                    className="sidebar-close"
                    onClick={() => setShowHotspotList(false)}
                  >
                    ✕
                  </button>
                </div>
                <p className="sidebar-subtitle">Click any detail point to zoom and inspect.</p>
                <div className="hotspots-list-items">
                  {hotspots.map((h, i) => (
                    <button
                      key={h.id}
                      type="button"
                      className={`hotspot-list-item ${activeHotspotIndex === i ? 'active' : ''}`}
                      onClick={() => {
                        focusHotspot(i, true); // Flight arc when browsing list
                        setShowHotspotList(false);
                      }}
                    >
                      <span className="item-badge">{String(i + 1).padStart(2, '0')}</span>
                      <div className="item-content">
                        <h4>{h.title}</h4>
                        <p>{h.description}</p>
                        {(h.audio_file_id || h.audio_timestamp_seconds != null) && (
                          <span className="item-audio-indicator">🎵 Audio Attached</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : activeHotspot ? (
              <div className="hotspot-detail-view">
                <div className="sidebar-header">
                  <span className="detail-badge">
                    Detail {String(activeHotspotIndex + 1).padStart(2, '0')} of {String(hotspots.length).padStart(2, '0')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className="sidebar-minimize-btn"
                      onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
                      title={isSidebarMinimized ? 'Expand full panel' : 'Minimize to compact text card'}
                    >
                      {isSidebarMinimized ? '🗖 Expand' : '🗕 Minimize'}
                    </button>
                    <button
                      type="button"
                      className="sidebar-close"
                      onClick={() => setActiveHotspotIndex(-1)}
                      title="Close panel"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <h3 className="hotspot-detail-title">{activeHotspot.title}</h3>
                <p className="hotspot-detail-description">{activeHotspot.description}</p>

                {/* Option 1: Dedicated Audio File Player */}
                {activeHotspot.audio_file_id && (
                  <div className="hotspot-audio-player">
                    <label className="audio-label">🎧 Dedicated Hotspot Audio</label>
                    <audio
                      controls
                      src={resolveAudioUrl(activeHotspot.audio_file_id)!}
                      className="hotspot-audio-element"
                    />
                  </div>
                )}

                {/* Option 2: Exhibition Audio Guide Timestamp Seek */}
                {activeHotspot.audio_timestamp_seconds != null && onAudioSeek && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm hotspot-seek-action"
                    onClick={() => onAudioSeek(activeHotspot.audio_timestamp_seconds!)}
                  >
                    ▶ Jump to {Math.floor(activeHotspot.audio_timestamp_seconds)}s in Main Audio Guide
                  </button>
                )}

                {/* Hotspot Prev/Next navigation */}
                <div className="sidebar-footer-nav">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      const nextIdx =
                        activeHotspotIndex <= 0 ? hotspots.length - 1 : activeHotspotIndex - 1;
                      focusHotspot(nextIdx, true); // Flight arc on prev
                    }}
                  >
                    ◀ Prev
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      const nextIdx =
                        activeHotspotIndex >= hotspots.length - 1 ? 0 : activeHotspotIndex + 1;
                      focusHotspot(nextIdx, true); // Flight arc on next
                    }}
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            ) : null}
          </aside>
        )}
      </div>

      {/* Bottom Carousel / Quick Navigator */}
      <footer className="inspect-lightbox__controls">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            tgt.current.rx = 0;
            tgt.current.ry = 0;
            fitToScreen(false);
          }}
        >
          ⟲ Reset View
        </button>

        {hotspots.length > 0 && (
          <div className="inspect-lightbox__carousel">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                const nextIdx =
                  activeHotspotIndex <= 0 ? hotspots.length - 1 : activeHotspotIndex - 1;
                focusHotspot(nextIdx, true); // Flight arc on prev
              }}
              title="Previous Detail"
            >
              ◀ Prev
            </button>

            <span className="carousel-counter">
              {activeHotspotIndex >= 0
                ? `Detail ${String(activeHotspotIndex + 1).padStart(2, '0')} / ${String(hotspots.length).padStart(2, '0')}: ${hotspots[activeHotspotIndex]?.title || ''}`
                : `Interactive Details (${hotspots.length})`}
            </span>

            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                const nextIdx =
                  activeHotspotIndex < 0 || activeHotspotIndex >= hotspots.length - 1
                    ? 0
                    : activeHotspotIndex + 1;
                focusHotspot(nextIdx, true); // Flight arc on next
              }}
              title="Next Detail"
            >
              Next ▶
            </button>
          </div>
        )}

        <span className="inspect-lightbox__hint">
          {artwork.artwork_type === 'VIDEO'
            ? '🎬 Cinema Mode · Press Esc or click ✕ to return to gallery'
            : settings.tiltEnabled
            ? '💡 Left-drag to Pan · Right-drag to Tilt in 3D · Scroll to Zoom'
            : '💡 Left-drag to Pan · Scroll to Zoom'}
        </span>
      </footer>
    </div>
  );
}
