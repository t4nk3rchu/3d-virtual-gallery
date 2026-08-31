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
import { getImageUrl, proxyMediaUrl, resolveAudioUrl } from '../../lib/media/gdrive';
import { HotspotOverlay } from './HotspotOverlay';
import { InspectDesktopSidebar } from './InspectDesktopSidebar';
import { type ViewerSettings, getStoredViewerSettings } from './SettingsModal';
import { Icon } from '../ui';
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
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 || window.innerHeight <= 520 : false
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || window.innerHeight <= 520);
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const frameConfig = useMemo<FrameConfig | null>(() => {
    try {
      return artwork.frame_config_json ? JSON.parse(artwork.frame_config_json) : null;
    } catch {
      return null;
    }
  }, [artwork.frame_config_json]);

  const isTiltEnabled =
    artwork.artwork_type === 'IMAGE_2D' &&
    frameConfig?.allowTilt !== false &&
    settings.tiltEnabled !== false;
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

  const primaryUrl = artwork.media_file_id
    ? proxyMediaUrl(artwork.media_file_id, artwork.updated_at)
    : null;
  const fallbackUrl = artwork.media_file_id
    ? getImageUrl(artwork.media_file_id, 'original')
    : null;

  const [currentSrc, setCurrentSrc] = useState<string | null>(primaryUrl);

  useEffect(() => {
    setCurrentSrc(primaryUrl);
  }, [primaryUrl]);

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

    const marginW = vw < 640 ? 0.94 : 0.88;
    const marginH = vh < 500 ? 0.92 : 0.86;
    const scale = Math.min((vw * marginW) / iw, (vh * marginH) / ih);
    const clampedScale = Math.max(0.001, scale);
    const toX = (vw - iw * clampedScale) / 2;
    const toY = (vh - ih * clampedScale) / 2;

    tgt.current = { s: clampedScale, x: toX, y: toY, rx: 0, ry: 0 };
    if (snap) {
      cur.current = { ...tgt.current };
    }
  }, []);

  // Handle window resize / orientation changes
  useEffect(() => {
    const handleResize = () => {
      fitToScreen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitToScreen]);

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
        overviewScale = Math.min((vw * 0.88) / img.naturalWidth, (vh * 0.86) / img.naturalHeight);
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

      const toX = vw / 2 - px * targetScale;
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
        (e.target as HTMLElement).closest('.inspect-hotspot-info-modal') ||
        (e.target as HTMLElement).closest('.inspect-lightbox__drawer') ||
        (e.target as HTMLElement).closest('.inspect-lightbox__controls') ||
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
      } else if (e.button === 2 && isTiltEnabled) {
        // Right-click drag: 3D perspective tilt
        mode.current = 'tilt';
        tiltStart.current = {
          x: e.clientX,
          y: e.clientY,
          rx: cur.current.rx,
          ry: cur.current.ry,
        };
        panStart.current = null;
      } else if (e.button === 0 || e.pointerType === 'touch') {
        // Left-click / Touch drag: Pan
        mode.current = 'pan';
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          tx: cur.current.x,
          ty: cur.current.y,
        };
        tiltStart.current = null;
      }
    },
    [isTiltEnabled]
  );

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const vp = viewportRef.current;
    if (!vp) return;

    if (mode.current === 'pinch' && pinchStart.current && pointers.current.size >= 2) {
      const p = Array.from(pointers.current.values());
      const currentDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (pinchStart.current.dist > 0) {
        const factor = currentDist / pinchStart.current.dist;
        const newScale = Math.max(0.1, Math.min(8, pinchStart.current.scale * factor));
        const ds = newScale - cur.current.s;
        tgt.current.x -= (pinchStart.current.mid.x - cur.current.x) * (ds / cur.current.s);
        tgt.current.y -= (pinchStart.current.mid.y - cur.current.y) * (ds / cur.current.s);
        tgt.current.s = newScale;
      }
    } else if (mode.current === 'pan' && panStart.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      tgt.current.x = panStart.current.tx + dx;
      tgt.current.y = panStart.current.ty + dy;
    } else if (mode.current === 'tilt' && tiltStart.current) {
      const dx = e.clientX - tiltStart.current.x;
      const dy = e.clientY - tiltStart.current.y;
      // Max tilt clamp [-25deg, 25deg]
      tgt.current.ry = Math.max(-25, Math.min(25, tiltStart.current.ry + dx * 0.15));
      tgt.current.rx = Math.max(-25, Math.min(25, tiltStart.current.rx - dy * 0.15));
    }
  }, []);

  const endPointer = useCallback((e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    const vp = viewportRef.current;
    if (vp) {
      try {
        vp.releasePointerCapture(e.pointerId);
      } catch {}
    }

    if (pointers.current.size === 0) {
      mode.current = null;
      panStart.current = null;
      tiltStart.current = null;
      pinchStart.current = null;
    } else if (pointers.current.size === 1) {
      // Revert to panning with remaining pointer
      mode.current = 'pan';
      const [remaining] = Array.from(pointers.current.values());
      panStart.current = {
        x: remaining.x,
        y: remaining.y,
        tx: cur.current.x,
        ty: cur.current.y,
      };
      pinchStart.current = null;
      tiltStart.current = null;
    }
  }, []);

  // Mouse wheel zoom to cursor
  const onWheel = useCallback((e: ReactWheelEvent) => {
    e.preventDefault();
    const vp = viewportRef.current;
    if (!vp) return;

    const rect = vp.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newScale = Math.max(0.1, Math.min(8, tgt.current.s * zoomFactor));
    const ds = newScale - tgt.current.s;

    tgt.current.x -= (mouseX - tgt.current.x) * (ds / tgt.current.s);
    tgt.current.y -= (mouseY - tgt.current.y) * (ds / tgt.current.s);
    tgt.current.s = newScale;
  }, []);

  // Keyboard navigation & ESC close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDescExpanded) {
          setIsDescExpanded(false);
        } else if (showHotspotList) {
          setShowHotspotList(false);
        } else if (activeHotspotIndex >= 0) {
          setActiveHotspotIndex(-1);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (hotspots.length > 0) {
          const nextIdx =
            activeHotspotIndex < 0 || activeHotspotIndex >= hotspots.length - 1
              ? 0
              : activeHotspotIndex + 1;
          focusHotspot(nextIdx, true);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (hotspots.length > 0) {
          const nextIdx =
            activeHotspotIndex <= 0 ? hotspots.length - 1 : activeHotspotIndex - 1;
          focusHotspot(nextIdx, true);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeHotspotIndex, focusHotspot, hotspots.length, onClose, isDescExpanded, showHotspotList]);

  const onBackdropClick = (e: ReactMouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Audio playback handler
  const toggleAudio = useCallback(() => {
    const audio = audioPlayerRef.current;
    if (!audio) return;
    if (isPlayingAudio) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  }, [isPlayingAudio]);

  // When changing hotspot, stop current audio and collapse expanded description
  useEffect(() => {
    setIsPlayingAudio(false);
    setIsDescExpanded(false);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
  }, [activeHotspotIndex]);

  return (
    <div
      className="inspect-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Inspect: ${artwork.title}`}
      onClick={onBackdropClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Header Bar */}
      <header className={`inspect-lightbox__header ${isMobile && isDescExpanded ? 'inspect-lightbox__header--expanded' : ''}`}>
        <div className="inspect-lightbox__title-info">
          {isMobile && activeHotspot ? (
            <div className={`inspect-header-dynamic-hotspot ${isDescExpanded ? 'is-expanded' : ''}`}>
              <span className="eyebrow eyebrow--hotspot">
                <Icon name="pin" size={12} /> Detail {String(activeHotspotIndex + 1).padStart(2, '0')} of {String(hotspots.length).padStart(2, '0')}
              </span>
              <h2 className="inspect-header-title">{activeHotspot.title}</h2>
              {activeHotspot.description && (
                <div className="inspect-header-desc-container">
                  {isDescExpanded ? (
                    <div className="inspect-header-desc-expanded">
                      <p className="inspect-header-desc-full">{activeHotspot.description}</p>
                      <button
                        type="button"
                        className="inspect-desc-toggle-btn"
                        onClick={() => setIsDescExpanded(false)}
                      >
                        <Icon name="chevronUp" size={12} /> See less
                      </button>
                    </div>
                  ) : (
                    <div className="inspect-header-desc-wrapper">
                      <p className="inspect-header-desc inspect-header-desc--1line">
                        {activeHotspot.description}
                      </p>
                      {activeHotspot.description.length > 40 && (
                        <button
                          type="button"
                          className="inspect-desc-more-btn"
                          onClick={() => setIsDescExpanded(true)}
                          title="See full description"
                        >
                          ... See more
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="inspect-header-dynamic-artwork">
              <span className="eyebrow">Inspect Mode</span>
              <h2 className="inspect-header-title">{artwork.title}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                {artwork.artist && <p className="artist" style={{ margin: 0 }}>{artwork.artist}</p>}
                {artwork.artist_profile && (
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost inspect-artist-link"
                    onClick={() => onOpenArtist?.(artwork.artist_profile!)}
                    title={`Read about ${artwork.artist_profile.name}`}
                  >
                    <Icon name="user" size={13} /> About {artwork.artist_profile.name}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="inspect-lightbox__header-actions">
          {hotspots.length > 0 && (
            <button
              type="button"
              className={`btn btn--sm ${showHotspotList ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setShowHotspotList((prev) => !prev)}
              title="Toggle Hotspots Directory"
            >
              <Icon name="pin" size={13} /> Hotspots List ({hotspots.length})
            </button>
          )}

          <button
            type="button"
            className="inspect-lightbox__close"
            onClick={onClose}
            aria-label="Close inspect"
            title="Exit Inspect Mode"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </header>

      {/* Subtle Screen Dimmer Backdrop Layer (almost transparent, 2px blur) for Mobile */}
      {isMobile && isDescExpanded && activeHotspot && (
        <div
          className="inspect-desc-blur-backdrop"
          onClick={() => setIsDescExpanded(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Artwork Viewport Canvas Area */}
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
              className={`inspect-lightbox__tilt ${isTiltEnabled ? 'tilt-enabled' : ''}`}
            >
              <div ref={stageRef} className="inspect-lightbox__stage">
                {currentSrc && (
                  <div className="inspect-lightbox__slab">
                    <div className="inspect-lightbox__shadow" />
                    <div className="inspect-lightbox__frame-top" />
                    <div className="inspect-lightbox__frame-bottom" />
                    <div className="inspect-lightbox__frame-left" />
                    <div className="inspect-lightbox__frame-right" />

                    <img
                      ref={imgRef}
                      src={currentSrc}
                      alt={artwork.title}
                      className="inspect-lightbox__image"
                      draggable={false}
                      onLoad={() => {
                        setImgLoaded(true);
                        fitToScreen(true);
                      }}
                      onError={() => {
                        if (currentSrc !== fallbackUrl && fallbackUrl) {
                          setCurrentSrc(fallbackUrl);
                        }
                      }}
                    />

                    {imgLoaded && (
                      <HotspotOverlay
                        hotspots={hotspots}
                        activeHotspotId={activeHotspotIndex >= 0 ? hotspots[activeHotspotIndex]?.id : null}
                        hideFloatingCard={true}
                        onSelectHotspot={(id) => {
                          const idx = hotspots.findIndex((h) => h.id === id);
                          if (idx >= 0) {
                            focusHotspot(idx, false);
                            setShowHotspotList(false);
                          }
                        }}
                        onDismissActive={() => {
                          setActiveHotspotIndex(-1);
                        }}
                        onAudioSeek={onAudioSeek}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Slide-Over Right Drawer for Hotspots Directory */}
        {showHotspotList && (
          <>
            <div
              className="inspect-drawer-backdrop"
              onClick={() => setShowHotspotList(false)}
            />
            <aside
              className="inspect-lightbox__drawer"
              role="dialog"
              aria-label="Hotspots Directory"
            >
              <div className="sidebar-header">
                <h3><Icon name="pin" size={15} /> Hotspots Directory</h3>
                <button
                  type="button"
                  className="sidebar-close"
                  onClick={() => setShowHotspotList(false)}
                  aria-label="Close directory"
                >
                  <Icon name="close" size={15} />
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
                       focusHotspot(i, true);
                       setShowHotspotList(false);
                    }}
                  >
                    <span className="item-badge">{String(i + 1).padStart(2, '0')}</span>
                    <div className="item-content">
                      <h4>{h.title}</h4>
                      <p>{h.description}</p>
                      {(h.audio_file_id || h.audio_timestamp_seconds != null) && (
                        <span className="item-audio-indicator"><Icon name="audio" size={12} /> Audio Attached</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </aside>
          </>
        )}

        {/* Desktop Side Panel: Active Hotspot Detail (Draggable & Minimizable) */}
        {!isMobile && activeHotspot && (
          <InspectDesktopSidebar
            activeHotspot={activeHotspot}
            activeHotspotIndex={activeHotspotIndex}
            totalHotspots={hotspots.length}
            onClose={() => setActiveHotspotIndex(-1)}
            onNavigate={(idx) => focusHotspot(idx, true)}
            onAudioSeek={onAudioSeek}
          />
        )}
      </div>

      {/* Direct Bottom-Bar Controls with Navigation & Dedicated Audio Listening */}
      <footer className="inspect-lightbox__controls">
        <button
          type="button"
          className="btn btn--ghost btn--sm inspect-btn-reset"
          onClick={() => {
            tgt.current.rx = 0;
            tgt.current.ry = 0;
            setActiveHotspotIndex(-1);
            fitToScreen(false);
          }}
          title="Reset zoom and framing"
        >
          <Icon name="reset" size={14} /> Reset View
        </button>

        {hotspots.length > 0 && (
          <div className="inspect-lightbox__carousel">
            <button
              type="button"
              className="btn btn--secondary btn--sm inspect-nav-btn"
              onClick={() => {
                const nextIdx =
                  activeHotspotIndex <= 0 ? hotspots.length - 1 : activeHotspotIndex - 1;
                focusHotspot(nextIdx, true);
              }}
              title="Previous Detail"
            >
              <Icon name="chevronLeft" size={13} /> Prev
            </button>

            <button
              type="button"
              className={`carousel-counter-btn ${activeHotspotIndex >= 0 ? 'active' : ''}`}
              onClick={() => {
                if (activeHotspotIndex >= 0) {
                  const nextIdx = (activeHotspotIndex + 1) % hotspots.length;
                  focusHotspot(nextIdx, true);
                } else {
                  setShowHotspotList((prev) => !prev);
                }
              }}
              title={activeHotspotIndex >= 0 ? 'Click to go to next detail' : 'Click to open hotspots directory'}
            >
              {activeHotspotIndex >= 0 ? (
                <>
                  <span className="carousel-counter-tag">
                    <Icon name="pin" size={12} /> {String(activeHotspotIndex + 1).padStart(2, '0')}/{String(hotspots.length).padStart(2, '0')}
                  </span>
                  <span className="carousel-counter-title">{hotspots[activeHotspotIndex]?.title || ''}</span>
                </>
              ) : (
                <>
                  <span className="carousel-counter-tag"><Icon name="pin" size={12} /> Details ({hotspots.length})</span>
                  <span className="carousel-counter-info-icon"><Icon name="list" size={13} /></span>
                </>
              )}
            </button>

            <button
              type="button"
              className="btn btn--secondary btn--sm inspect-nav-btn"
              onClick={() => {
                const nextIdx =
                  activeHotspotIndex < 0 || activeHotspotIndex >= hotspots.length - 1
                    ? 0
                    : activeHotspotIndex + 1;
                focusHotspot(nextIdx, true);
              }}
              title="Next Detail"
            >
              Next <Icon name="chevronRight" size={13} />
            </button>

            {/* Inline Audio Listening Button on Mobile if Hotspot has Audio */}
            {isMobile && activeHotspot?.audio_file_id && (
              <>
                <audio
                  ref={audioPlayerRef}
                  src={resolveAudioUrl(activeHotspot.audio_file_id)!}
                  onPlay={() => setIsPlayingAudio(true)}
                  onPause={() => setIsPlayingAudio(false)}
                  onEnded={() => setIsPlayingAudio(false)}
                />
                <button
                  type="button"
                  className={`btn btn--sm ${isPlayingAudio ? 'btn--primary' : 'btn--secondary'} inspect-audio-btn`}
                  onClick={toggleAudio}
                  title={isPlayingAudio ? 'Pause Audio' : 'Listen to Audio Commentary'}
                >
                  {isPlayingAudio
                    ? (<><Icon name="pause" size={13} /> Pause</>)
                    : (<><Icon name="audio" size={13} /> Listen</>)}
                </button>
              </>
            )}

            {isMobile && activeHotspot?.audio_timestamp_seconds != null && onAudioSeek && (
              <button
                type="button"
                className="btn btn--sm btn--secondary inspect-audio-btn"
                onClick={() => onAudioSeek(activeHotspot.audio_timestamp_seconds!)}
                title={`Jump to ${Math.floor(activeHotspot.audio_timestamp_seconds)}s in Main Audio Guide`}
              >
                <Icon name="audio" size={13} /> Guide ({Math.floor(activeHotspot.audio_timestamp_seconds)}s)
              </button>
            )}
          </div>
        )}

        <span className="inspect-lightbox__hint">
          {artwork.artwork_type === 'VIDEO'
            ? 'Cinema Mode · Press Esc or click to return to gallery'
            : isTiltEnabled
            ? 'Left-drag to Pan · Right-drag to Tilt in 3D · Scroll to Zoom'
            : 'Left-drag to Pan · Scroll to Zoom'}
        </span>
      </footer>
    </div>
  );
}
