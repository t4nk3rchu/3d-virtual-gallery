/**
 * Task 10: Exhibition viewer — the main 3D viewer page
 *
 * Fetches exhibition by slug, builds scene, wires camera/interaction/scaler,
 * renders FocusPanel and InspectLightbox. Falls back to FallbackCatalog when
 * WebGL2 is unavailable.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { SettingsModal, getStoredViewerSettings, type ViewerSettings, type CameraControlMode } from './SettingsModal';
import { trackEvent } from '../../lib/analytics';
import { proxyMediaUrl } from '../../lib/media/gdrive';
import { registerMediaTokens } from '../../lib/media/media-tokens';
import { parseSpawnPoint } from '../../lib/studio/spawn-point';
import { isArtworkPlaced } from '../../lib/studio/artwork-placement';
import { Icon } from '../ui';
import { LoadingCurtain } from './LoadingCurtain';
import { ViewerErrorView, type ViewerErrorType } from './ViewerErrorView';
import type { IntroTransition } from '../../lib/viewer/intro-animations';

interface ExhibitionViewerProps {
  slug: string;
}

type LoadState = 'loading' | 'loaded' | 'error';
type ViewerArtwork = ExhibitionDetail['artworks'][number];

export function ExhibitionViewer({ slug }: ExhibitionViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorType, setErrorType] = useState<ViewerErrorType>('not_found');
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
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [canStartSceneLoad, setCanStartSceneLoad] = useState(false);
  const [settings, setSettings] = useState<ViewerSettings>(getStoredViewerSettings);
  const [controlMode, setControlMode] = useState<CameraControlMode>(() => getStoredViewerSettings().controlMode || 'gallery');
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  // Cleanup for the "stop at end timestamp" watcher on the seek audio element
  const seekEndCleanupRef = useRef<(() => void) | null>(null);
  const interactionRef = useRef<InteractionController | null>(null);
  const cameraControllerRef = useRef<CameraController | null>(null);
  const sceneRef = useRef<import('@babylonjs/core').Scene | null>(null);
  const dwellStartRef = useRef<{ artworkId: string; artworkType?: ViewerArtwork['artwork_type']; startTime: number } | null>(null);
  /** Remembers if we were in FPS mode before entering focus/inspect, so we can restore it on return to ROAM */
  const wasFpsModeRef = useRef<boolean>(false);

  const webglSupported = isWebGLSupported();

  // Fetch exhibition data
  const fetchExhibition = () => {
    setLoadState('loading');
    fetch(`/api/exhibitions/by-slug/${slug}`, { credentials: 'include' })
      .then(async (r) => {
        if (r.status === 403) {
          setErrorType('private');
          throw new Error('Private exhibition');
        }
        if (!r.ok) {
          setErrorType('not_found');
          throw new Error('Not found');
        }
        return (await r.json()) as ExhibitionDetail;
      })
      .then((data) => {
        registerMediaTokens(data.media_tokens);
        setExhibition(data);
        setLoadState('loaded');
        if (!data.intro_video_file_id) {
          setCanStartSceneLoad(true);
        }
      })
      .catch((err) => {
        if (err.message !== 'Private exhibition' && err.message !== 'Not found') {
          setErrorType('network_error');
        }
        setLoadState('error');
      });
  };

  useEffect(() => {
    fetchExhibition();
  }, [slug]);

  // Ambient room audio — create and pre-buffer as soon as scene load is allowed
  useEffect(() => {
    if (!exhibition || !canStartSceneLoad) return;
    let fileId: string | null = null;
    try { fileId = JSON.parse(exhibition.settings_json ?? '{}')?.backgroundAudioFileId ?? null; } catch {}
    if (!fileId) return;

    const audio = new Audio(proxyMediaUrl(fileId));
    audio.loop = true;
    audio.volume = 0.35;
    audio.preload = 'auto';
    ambientAudioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      ambientAudioRef.current = null;
    };
  }, [exhibition, canStartSceneLoad]);

  // Start playing once the intro is dismissed (audio is already buffered above)
  useEffect(() => {
    if (!isIntroDismissed || !ambientAudioRef.current) return;
    ambientAudioRef.current.play().catch(() => {
      // Autoplay blocked — retry on first user interaction
      const resume = () => { ambientAudioRef.current?.play().catch(() => {}); };
      document.addEventListener('click', resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
      return () => {
        document.removeEventListener('click', resume);
        document.removeEventListener('keydown', resume);
      };
    });
  }, [isIntroDismissed]);

  // Duck ambient volume when artwork audio guide is in focus, restore when leaving
  useEffect(() => {
    if (!ambientAudioRef.current) return;
    ambientAudioRef.current.volume = focusedArtwork?.audio_guide_file_id ? 0.08 : 0.35;
  }, [focusedArtwork]);

  // The audio-guide-seek element (audioRef) is driven by onAudioSeek during inspect mode.
  // It must stop the moment inspect mode ends, or it plays on to the end of the track.
  useEffect(() => {
    if (!inspectedArtwork) {
      seekEndCleanupRef.current?.();
      seekEndCleanupRef.current = null;
      audioRef.current?.pause();
    }
  }, [inspectedArtwork]);

  const stopSeekAudio = useCallback(() => {
    seekEndCleanupRef.current?.();
    seekEndCleanupRef.current = null;
    audioRef.current?.pause();
  }, []);

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
    if (!exhibition || !webglSupported || !canvasRef.current || !canStartSceneLoad) return;

    let disposed = false;
    let sceneHandle: import('../../lib/babylon/engine').SceneHandle | null = null;
    let unsubscribePointerLock: (() => void) | null = null;

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

      // Load GLB (0% - 80% progress)
      try {
        await loadGlbRoom(
          scene,
          exhibition.room.glb_file_id,
          (p) => {
            setLoadProgress(Math.round(p.fraction * 80));
          },
          exhibition.room.created_at
        );
      } catch (e) {
        console.error('[viewer] GLB load failed:', e);
      }

      setLoadProgress(85);

      // Place artworks and wait for textures to decode before opening curtain
      const placedArtworks = exhibition.artworks.filter(isArtworkPlaced);
      if (placedArtworks.length > 0) {
        const texturePromises = placedArtworks.map((artwork) => {
          return new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 6000); // 6s safeguard against network drop
            createArtworkMesh(scene, artwork, () => {
              clearTimeout(timer);
              resolve();
            });
          });
        });
        await Promise.all(texturePromises);
      }

      setLoadProgress(100);
      sceneRef.current = scene;
      setIsSceneReady(true);

    // Sync control mode and pointer lock changes
    cameraController.updateConfig({ controlMode });
    unsubscribePointerLock = cameraController.onPointerLockChange((locked) => {
      setIsPointerLocked(locked);
    });

    // Wire interaction controller
    interactionRef.current = wireInteraction(scene, cameraController, scaler, {
      onArtworkFocus: (artworkId, _mesh: AbstractMesh) => {
        flushDwell();
        // Remember if FPS was active before entering focus, so we can restore it on return to ROAM
        wasFpsModeRef.current = cameraControllerRef.current?.isPointerLocked ?? false;
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
        // Also release pointer lock here — covers the FocusPanel "Inspect" button path
        // (the interaction.ts inspectArtwork covers the in-scene click path)
        cameraControllerRef.current?.exitPointerLock();

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
    unsubscribePointerLock?.();
    interactionRef.current?.dispose();
    sceneHandle?.dispose();
    sceneRef.current = null;
  };
}, [exhibition, webglSupported, canStartSceneLoad]);

  // Mode switching & Escape key safety listener
  const toggleControlMode = (targetMode?: CameraControlMode) => {
    const nextMode = targetMode ?? (controlMode === 'gallery' ? 'fps' : 'gallery');
    setControlMode(nextMode);
    const updatedSettings = { ...settings, controlMode: nextMode };
    setSettings(updatedSettings);
    cameraControllerRef.current?.updateConfig({ controlMode: nextMode });

    if (nextMode === 'fps') {
      cameraControllerRef.current?.requestPointerLock();
    } else {
      cameraControllerRef.current?.exitPointerLock();
    }
  };

  useEffect(() => {
    const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in forms or dialogs
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // CRITICAL ESCAPE SAFETY: If pointer is locked and user presses ESC, stop propagation
      // so parent containers or dialogs never receive an unhandled Escape to exit the exhibition
      if (e.key === 'Escape' && isPointerLocked) {
        e.stopPropagation();
        return;
      }

      // WASD / Arrow keys while in focus or inspect -> walk away and restore FPS if needed
      if (MOVE_KEYS.has(e.key.toLowerCase())) {
        const restoreFps = () => {
          if (wasFpsModeRef.current) {
            cameraControllerRef.current?.requestPointerLock();
          }
        };
        if (inspectedArtwork) {
          // Inspect -> FOCUS -> then immediately ROAM (two-step unwinding)
          interactionRef.current?.leaveInspect();
          setInspectedArtwork(null);
          // Allow one frame for state to settle, then leave focus too
          requestAnimationFrame(() => {
            interactionRef.current?.leaveFocus(restoreFps);
            setFocusedArtwork(null);
          });
          return;
        }
        if (focusedArtwork) {
          interactionRef.current?.leaveFocus(restoreFps);
          setFocusedArtwork(null);
          return;
        }
      }

      // Hotkey 'C' toggles between Gallery and FPS mode
      if (e.key === 'c' || e.key === 'C') {
        // Only toggle when not focused on an artwork or inspecting
        if (!focusedArtwork && !inspectedArtwork && !activeArtistProfile && !showSettings) {
          e.preventDefault();
          toggleControlMode();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [controlMode, isPointerLocked, focusedArtwork, inspectedArtwork, activeArtistProfile, showSettings, settings]);

  // Analytics: fire exhibition_view event on mount
  useEffect(() => {
    if (!exhibition) return;
    trackEvent({
      kind: 'exhibition_view',
      exhibition_id: exhibition.id,
      room_id: exhibition.room_id,
    });
  }, [exhibition]);

  // Dynamic transition style configured in exhibition settings (fallback to settings or slide_up)
  let configuredTransition: IntroTransition = settings.introTransition || 'slide_up';
  if (exhibition?.settings_json) {
    try {
      const parsed = JSON.parse(exhibition.settings_json);
      if (parsed.introTransition) {
        configuredTransition = parsed.introTransition;
      }
    } catch {}
  }

  if (loadState === 'error' || (!exhibition && loadState === 'loaded')) {
    return <ViewerErrorView type={errorType} onRetry={fetchExhibition} />;
  }

  if (loadState === 'loading' && !exhibition) {
    return (
      <div
        className="viewer-init-veil"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#0a0a0a',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        role="status"
        aria-label="Opening exhibition…"
      >
        <div className="intro-video-spinner" style={{ width: 28, height: 28, borderWidth: 2 }} />
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

  if (!webglSupported && exhibition) {
    return (
      <FallbackCatalog
        title={exhibition.title}
        curatorName={exhibition.curator_name}
        description={exhibition.description}
        artworks={exhibition.artworks}
      />
    );
  }

  if (!exhibition) return null;

  const hasIntroVideo = Boolean(exhibition.intro_video_file_id && !videoUnavailable);

  return (
    <div className="viewer" aria-label={`3D exhibition: ${exhibition.title}`}>
      {/* Intro Video Loader (plays when configured) */}
      {hasIntroVideo && !isIntroDismissed && (
        <IntroVideoLoader
          title={exhibition.title}
          curatorName={exhibition.curator_name}
          videoFileId={exhibition.intro_video_file_id!}
          isSceneReady={isSceneReady}
          transitionStyle={configuredTransition}
          onVideoStarted={() => setCanStartSceneLoad(true)}
          onVideoError={() => {
            setVideoUnavailable(true);
            setCanStartSceneLoad(true);
          }}
          onEnterGallery={() => setIsIntroDismissed(true)}
        />
      )}

      {/* Loading Curtain (fallback when no intro video is configured or video is unavailable) */}
      {!hasIntroVideo && !isIntroDismissed && (
        <LoadingCurtain
          title={exhibition.title}
          curatorName={exhibition.curator_name}
          progress={loadProgress}
          isReady={isSceneReady}
          transitionStyle={configuredTransition}
          onRevealed={() => setIsIntroDismissed(true)}
        />
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
          key={focusedArtwork.id}
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
            interactionRef.current?.leaveFocus(() => {
              // If the user was in FPS mode before entering focus, re-engage pointer lock
              if (wasFpsModeRef.current) {
                cameraControllerRef.current?.requestPointerLock();
              }
            });
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
            // If user was in FPS mode before focus, re-engage pointer lock when returning to focus panel
            // (leaveFocus will eventually restore it fully when they close the focus panel too)
          }}
          onAudioStop={stopSeekAudio}
          onAudioSeek={(seconds, endSeconds) => {
            const audio = audioRef.current;
            if (!audio || !inspectedArtwork) return;
            const audioSrc = inspectedArtwork.audio_guide_file_id;
            if (!audioSrc) return;
            const url = proxyMediaUrl(audioSrc, inspectedArtwork.updated_at);
            if (!audio.src.endsWith(url)) audio.src = url;
            // Drop any previous end-of-segment watcher before starting a new segment
            seekEndCleanupRef.current?.();
            seekEndCleanupRef.current = null;
            audio.currentTime = seconds;
            audio.play().catch(() => {});
            // Stop at the segment end if one was configured
            if (endSeconds != null && endSeconds > seconds) {
              const onTime = () => {
                if (audio.currentTime >= endSeconds) stopSeekAudio();
              };
              audio.addEventListener('timeupdate', onTime);
              seekEndCleanupRef.current = () => audio.removeEventListener('timeupdate', onTime);
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

      {/* FPS Crosshair Reticle (active in FPS mode while roaming) */}
      {controlMode === 'fps' && !focusedArtwork && !inspectedArtwork && !activeArtistProfile && isPointerLocked && (
        <div
          className={`viewer__crosshair ${hoveredArtwork ? 'viewer__crosshair--active' : ''}`}
          aria-hidden="true"
        >
          <div className="viewer__crosshair-dot" />
        </div>
      )}

      {/* Gallery Controls HUD & Settings (Desktop) */}
      {!focusedArtwork && !inspectedArtwork && !activeArtistProfile && (!exhibition.intro_video_file_id || isIntroDismissed) && (
        <div className="viewer-controls-hint">
          {/* Mode Switcher Pill */}
          <button
            type="button"
            className={`btn btn--sm btn-mode-toggle ${controlMode === 'fps' ? 'btn-mode-toggle--fps' : ''}`}
            onClick={() => toggleControlMode()}
            title="Toggle Camera Mode (Shortcut: C)"
          >
            <Icon name={controlMode === 'fps' ? 'target' : 'mouse'} size={14} />
            <span>{controlMode === 'fps' ? 'FPS Mode' : 'Gallery Mode'}</span>
            <kbd className="mode-hotkey">C</kbd>
          </button>

          <span><Icon name="walk" size={15} /> <kbd>WASD</kbd> walk</span>

          {controlMode === 'fps' ? (
            <>
              <span><Icon name="mouse" size={15} /> Mouse looks</span>
              <span><Icon name="frame" size={15} /> Click art to focus</span>
              <span><kbd>ESC</kbd> unlock cursor</span>
            </>
          ) : (
            <>
              <span><Icon name="mouse" size={15} /> <strong>Drag</strong> look</span>
              <span><Icon name="frame" size={15} /> <strong>Click art</strong> to focus (90°)</span>
              <span><Icon name="target" size={15} /> <strong>Click floor</strong> to teleport</span>
            </>
          )}

          <button
            type="button"
            className="btn btn--ghost btn--sm btn-settings-hud"
            onClick={() => setShowSettings(true)}
            title="Gallery &amp; Control Settings"
          >
            <Icon name="gear" size={15} /> Settings
          </button>
        </div>
      )}

      {/* Floating Settings Button for Mobile */}
      {!focusedArtwork && !inspectedArtwork && !activeArtistProfile && (!exhibition.intro_video_file_id || isIntroDismissed) && (
        <button
          type="button"
          className="btn-mobile-settings"
          onClick={() => setShowSettings(true)}
          title="Gallery Settings"
          aria-label="Gallery Settings"
        >
          <Icon name="gear" size={20} />
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
