/**
 * Task 10: Exhibition viewer — the main 3D viewer page
 *
 * Fetches exhibition by slug, builds scene, wires camera/interaction/scaler,
 * renders FocusPanel and InspectLightbox. Falls back to FallbackCatalog when
 * WebGL2 is unavailable.
 */
import { useEffect, useRef, useState } from 'react';
import type { ExhibitionDetail, ArtworkHotspot, Artist } from '../../types/schema';
import type { AbstractMesh } from '@babylonjs/core';
import type { InteractionController } from '../../lib/babylon/interaction';
import type { CameraController } from '../../lib/babylon/camera-controller';
import { isWebGLSupported, FallbackCatalog } from './FallbackCatalog';
import { FocusPanel } from './FocusPanel';
import { InspectLightbox } from './InspectLightbox';
import { ArtistDetailModal } from './ArtistDetailModal';
import { IntroVideoLoader } from './IntroVideoLoader';
import { ArtworkHoverTooltip } from './ArtworkHoverTooltip';
import { VirtualJoystick } from './VirtualJoystick';
import { SettingsModal, getStoredViewerSettings, type ViewerSettings } from './SettingsModal';
import { trackEvent } from '../../lib/analytics';
import { proxyMediaUrl } from '../../lib/media/gdrive';
import { parseSpawnPoint } from '../../lib/studio/spawn-point';
import { isArtworkPlaced } from '../../lib/studio/artwork-placement';

interface ExhibitionViewerProps {
  slug: string;
}

type LoadState = 'loading' | 'loaded' | 'error';
type ViewerArtwork = ExhibitionDetail['artworks'][number];

export function ExhibitionViewer({ slug }: ExhibitionViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [exhibition, setExhibition] = useState<ExhibitionDetail | null>(null);
  const [focusedArtwork, setFocusedArtwork] = useState<ViewerArtwork | null>(null);
  const [hoveredArtwork, setHoveredArtwork] = useState<{
    artwork: ViewerArtwork;
    position: { x: number; y: number };
  } | null>(null);
  const [inspectedArtwork, setInspectedArtwork] = useState<ViewerArtwork | null>(null);
  const [inspectedHotspots, setInspectedHotspots] = useState<ArtworkHotspot[]>([]);
  const [activeArtistProfile, setActiveArtistProfile] = useState<Artist | null>(null);
  const [isIntroDismissed, setIsIntroDismissed] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [settings, setSettings] = useState<ViewerSettings>(getStoredViewerSettings);
  const [showSettings, setShowSettings] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const interactionRef = useRef<InteractionController | null>(null);
  const cameraControllerRef = useRef<CameraController | null>(null);
  const sceneRef = useRef<import('@babylonjs/core').Scene | null>(null);
  const dwellStartRef = useRef<{ artworkId: string; artworkType?: ViewerArtwork['artwork_type']; startTime: number } | null>(null);

  const webglSupported = isWebGLSupported();

  // Fetch exhibition data
  useEffect(() => {
    fetch(`/api/exhibitions/by-slug/${slug}`, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Not found');
        return (await r.json()) as ExhibitionDetail;
      })
      .then((data) => {
        setExhibition(data);
        setLoadState('loaded');
      })
      .catch(() => setLoadState('error'));
  }, [slug]);

  // Analytics dwell helper
  const flushDwell = () => {
    if (dwellStartRef.current && exhibition) {
      const dwellSeconds = Math.round((Date.now() - dwellStartRef.current.startTime) / 1000);
      if (dwellSeconds > 0) {
        trackEvent({
          kind: 'artwork_dwell',
          exhibition_id: exhibition.id,
          room_id: exhibition.room_id,
          artwork_id: dwellStartRef.current.artworkId,
          artwork_type: dwellStartRef.current.artworkType,
          dwell_seconds: dwellSeconds,
        });
      }
      dwellStartRef.current = null;
    }
  };

  // Mount Babylon scene once exhibition data is loaded and WebGL is available
  useEffect(() => {
    if (!exhibition || !webglSupported || !canvasRef.current) return;

    let disposed = false;
    let sceneHandle: import('../../lib/babylon/engine').SceneHandle | null = null;

    (async () => {
      const { initScene } = await import('../../lib/babylon/engine');
      const { loadGlbRoom } = await import('../../lib/babylon/room-loader');
      const { createArtworkMesh } = await import('../../lib/babylon/artwork-factory');
      const { CameraController } = await import('../../lib/babylon/camera-controller');
      const { wireInteraction } = await import('../../lib/babylon/interaction');

      if (disposed || !canvasRef.current) return;

      sceneHandle = initScene(canvasRef.current);
      const { scene, scaler } = sceneHandle;
      const cameraController = new CameraController(scene, canvasRef.current);
      cameraController.updateConfig(settings);
      cameraControllerRef.current = cameraController;

      cameraController.onMovement = () => {
        flushDwell();
        interactionRef.current?.leaveFocus();
        setFocusedArtwork(null);
        setInspectedArtwork(null);
      };

      // Auto focus canvas so WASD works immediately without extra click
      canvasRef.current.focus();

      // Apply custom exhibition spawn position (or fallback to room default)
      const customSpawn = parseSpawnPoint(exhibition.settings_json, exhibition.room.spawn_json);
      cameraController.applySpawn(customSpawn);

      // Load GLB
      try {
        await loadGlbRoom(
          scene,
          exhibition.room.glb_file_id,
          (p) => {
            setLoadProgress(Math.round(p.fraction * 100));
          },
          exhibition.room.created_at
        );
      } catch (e) {
        console.error('[viewer] GLB load failed:', e);
      }

      // Place artworks
      for (const artwork of exhibition.artworks) {
        if (isArtworkPlaced(artwork)) {
          createArtworkMesh(scene, artwork);
        }
      }

      sceneRef.current = scene;
      setIsSceneReady(true);

      // Wire interaction controller
      interactionRef.current = wireInteraction(scene, cameraController, scaler, {
        onArtworkFocus: (artworkId, _mesh: AbstractMesh) => {
          flushDwell();
          const art = exhibition.artworks.find((a) => a.id === artworkId);
          setFocusedArtwork(art ?? null);
          setInspectedArtwork(null);
          setHoveredArtwork(null);

          if (art) {
            dwellStartRef.current = {
              artworkId: art.id,
              artworkType: art.artwork_type,
              startTime: Date.now(),
            };
            trackEvent({
              kind: 'artwork_focus',
              exhibition_id: exhibition.id,
              room_id: exhibition.room_id,
              artwork_id: art.id,
              artwork_type: art.artwork_type,
            });
          }
        },
        onArtworkInspect: (artworkId: string) => {
          const art = exhibition.artworks.find((a) => a.id === artworkId);
          if (!art) return;
          setInspectedArtwork(art);
          setInspectedHotspots(art.hotspots ?? []);
          setHoveredArtwork(null);

          trackEvent({
            kind: 'artwork_inspect',
            exhibition_id: exhibition.id,
            room_id: exhibition.room_id,
            artwork_id: art.id,
            artwork_type: art.artwork_type,
          });
        },
        onArtworkHover: (artworkId, pos) => {
          if (!artworkId || !pos) {
            setHoveredArtwork(null);
            return;
          }
          const art = exhibition.artworks.find((a) => a.id === artworkId);
          if (art) {
            setHoveredArtwork({ artwork: art, position: pos });
          } else {
            setHoveredArtwork(null);
          }
        },
        onStateChange: (state) => {
          if (state === 'ROAM') {
            flushDwell();
            setFocusedArtwork(null);
            setInspectedArtwork(null);
          }
        },
      });
    })();

    return () => {
      disposed = true;
      flushDwell();
      interactionRef.current?.dispose();
      sceneHandle?.dispose();
      sceneRef.current = null;
    };
  }, [exhibition, webglSupported]);

  // Analytics: fire exhibition_view event on mount
  useEffect(() => {
    if (!exhibition) return;
    trackEvent({
      kind: 'exhibition_view',
      exhibition_id: exhibition.id,
      room_id: exhibition.room_id,
    });
  }, [exhibition]);

  if (loadState === 'loading') {
    return (
      <div className="viewer-loading" role="status" aria-live="polite">
        Loading exhibition…
      </div>
    );
  }

  if (loadState === 'error' || !exhibition) {
    return (
      <div className="viewer-error" role="alert">
        Exhibition not found or not yet published.
      </div>
    );
  }

  const handleNavigateArtwork = (direction: 'prev' | 'next') => {
    if (!exhibition || !focusedArtwork || exhibition.artworks.length <= 1) return;
    const currentIdx = exhibition.artworks.findIndex((a) => a.id === focusedArtwork.id);
    if (currentIdx === -1) return;

    const len = exhibition.artworks.length;
    const targetIdx = direction === 'next' ? (currentIdx + 1) % len : (currentIdx - 1 + len) % len;
    const nextArt = exhibition.artworks[targetIdx];
    if (!nextArt) return;

    const scene = sceneRef.current;
    const mesh = scene ? scene.getMeshByName(nextArt.id) : null;
    if (mesh && interactionRef.current) {
      interactionRef.current.focusArtwork(nextArt.id, mesh);
    } else {
      setFocusedArtwork(nextArt);
    }
  };

  if (!webglSupported) {
    return (
      <FallbackCatalog
        title={exhibition.title}
        curatorName={exhibition.curator_name}
        description={exhibition.description}
        artworks={exhibition.artworks}
      />
    );
  }

  return (
    <div className="viewer" aria-label={`3D exhibition: ${exhibition.title}`}>
      {/* Intro Video Loader (plays at start to hide loading screen) */}
      {exhibition.intro_video_file_id && !isIntroDismissed && (
        <IntroVideoLoader
          videoFileId={exhibition.intro_video_file_id}
          isSceneReady={isSceneReady}
          transitionStyle={settings.introTransition}
          onEnterGallery={() => setIsIntroDismissed(true)}
        />
      )}

      {/* Loading progress (if no intro video or intro dismissed during loading) */}
      {(!exhibition.intro_video_file_id || isIntroDismissed) && loadProgress < 100 && (
        <div
          className="viewer-progress"
          role="progressbar"
          aria-valuenow={loadProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="viewer-progress__bar" style={{ width: `${loadProgress}%` }} />
          <span className="viewer-progress__label">Loading room… {loadProgress}%</span>
        </div>
      )}

      {/* 3D canvas */}
      <canvas
        ref={canvasRef}
        className="viewer__canvas"
        aria-label="3D gallery"
        tabIndex={0}
      />

      {/* Artwork Hover Tooltip (Roam Mode - Image 1) */}
      {!focusedArtwork && !inspectedArtwork && hoveredArtwork && (
        <ArtworkHoverTooltip
          artwork={hoveredArtwork.artwork}
          position={hoveredArtwork.position}
        />
      )}

      {/* Focus panel slide-out & Top-Right Compact Bar (Images 2 & 3) */}
      {focusedArtwork && !inspectedArtwork && (
        <FocusPanel
          artwork={focusedArtwork}
          onInspect={() => {
            interactionRef.current?.inspectArtwork(focusedArtwork.id);
            setInspectedArtwork(focusedArtwork);
            setInspectedHotspots(focusedArtwork.hotspots ?? []);
          }}
          onOpenArtist={(artist) => setActiveArtistProfile(artist)}
          onPreviousArtwork={exhibition.artworks.length > 1 ? () => handleNavigateArtwork('prev') : undefined}
          onNextArtwork={exhibition.artworks.length > 1 ? () => handleNavigateArtwork('next') : undefined}
          onClose={() => {
            flushDwell();
            interactionRef.current?.leaveFocus();
            setFocusedArtwork(null);
          }}
        />
      )}

      {/* Inspect lightbox */}
      {inspectedArtwork && (
        <InspectLightbox
          artwork={inspectedArtwork}
          hotspots={inspectedHotspots}
          settings={settings}
          onOpenArtist={(artist) => setActiveArtistProfile(artist)}
          onClose={() => {
            interactionRef.current?.leaveInspect();
            setInspectedArtwork(null);
          }}
          onAudioSeek={(seconds) => {
            if (audioRef.current && inspectedArtwork) {
              const audioSrc =
                inspectedArtwork.audio_guide_file_id ||
                (inspectedArtwork.artwork_type === 'AUDIO' ? inspectedArtwork.media_file_id : null);
              if (audioSrc) {
                const url = proxyMediaUrl(audioSrc, inspectedArtwork.updated_at);
                if (!audioRef.current.src.endsWith(url)) {
                  audioRef.current.src = url;
                }
                audioRef.current.currentTime = seconds;
                audioRef.current.play().catch(() => { });
              }
            }
          }}
        />
      )}

      {/* Fullscreen Artist Detail Profile Modal */}
      {activeArtistProfile && (
        <ArtistDetailModal
          artist={activeArtistProfile}
          onClose={() => setActiveArtistProfile(null)}
        />
      )}

      {/* Mobile Virtual Joystick */}
      {!focusedArtwork && !inspectedArtwork && !activeArtistProfile && (!exhibition.intro_video_file_id || isIntroDismissed) && (
        <VirtualJoystick
          onMove={(x, y) => {
            cameraControllerRef.current?.move(x, y);
          }}
        />
      )}

      {/* Gallery Controls HUD & Settings (Desktop) */}
      <div className="viewer-controls-hint">
        <span>🕹️ <strong>WASD</strong> to walk</span>
        <span>🖱️ <strong>Click &amp; Drag</strong> to look</span>
        <span>🖼️ <strong>Click Artwork</strong> to focus (90°)</span>
        <span>🎯 <strong>Click Floor</strong> to teleport</span>
        <button
          type="button"
          className="btn-settings-hud"
          onClick={() => setShowSettings(true)}
          title="Gallery &amp; Control Settings"
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Floating Settings Button for Mobile */}
      {!focusedArtwork && !inspectedArtwork && !activeArtistProfile && (!exhibition.intro_video_file_id || isIntroDismissed) && (
        <button
          type="button"
          className="btn-mobile-settings"
          onClick={() => setShowSettings(true)}
          title="Gallery Settings"
          aria-label="Gallery Settings"
        >
          ⚙️
        </button>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onChange={(newSettings) => {
            setSettings(newSettings);
            cameraControllerRef.current?.updateConfig(newSettings);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
