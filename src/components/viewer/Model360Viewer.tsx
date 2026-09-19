/**
 * Task 7: 360° inspect viewer for MODEL_3D artworks
 *
 * A parallel, full-screen sibling to `InspectLightbox` (2D). Owns its own
 * Babylon engine + scene + ArcRotateCamera, loads the FULL-resolution model
 * (not the roam proxy) on demand, and projects the artwork's 3D-anchored
 * hotspots to absolutely-positioned DOM pins each frame. Everything Babylon
 * owns is disposed on close so the transient WebGL context + textures are
 * released.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Vector3,
  Matrix,
  Color4,
  Animation,
  ArcRotateCamera,
  CubicEase,
  ElasticEase,
  EasingFunction,
  type AbstractMesh,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { SceneLoader } from '@babylonjs/core';
import type { Artwork, ArtworkHotspot } from '../../types/schema';
import { proxyMediaUrl } from '../../lib/media/gdrive';
import { initScene, type SceneHandle } from '../../lib/babylon/engine';
import { isWebGLSupported } from './FallbackCatalog';
import { parseAnchor } from '../../lib/babylon/model-hotspot-anchor';
import { addKeyRimLights } from '../../lib/babylon/model-lights';
import { getModelBounds } from '../../lib/babylon/model-bounds';
import { getHotspotAnimation, type HotspotTransition } from '../../lib/viewer/hotspot-animations';
import { pinScaleForRadius, isPointFacingCamera } from '../../lib/babylon/model-hotspot-math';
import { InspectDesktopSidebar } from './InspectDesktopSidebar';
import { Icon } from '../ui';
import '../../styles/model-360.css';

interface Model360ViewerProps {
  artwork: Artwork;
  hotspots: ArtworkHotspot[];
  onClose(): void;
  onAudioSeek?(seconds: number, endSeconds?: number | null): void;
  onAudioStop?(): void;
}

interface ParsedHotspot {
  hotspot: ArtworkHotspot;
  p: Vector3;
  n: Vector3;
}

const PIN_MIN_PX = 14;
const PIN_MAX_PX = 40;

/** Map a hotspot transition preset to a Babylon easing for the 3D orbit fly-to.
 *  instant_cut -> no easing (1-frame jump); spring_overshoot -> elastic; else cubic in/out. */
function easingForTransition(id: HotspotTransition): EasingFunction | undefined {
  if (id === 'instant_cut') return undefined;
  if (id === 'spring_overshoot') {
    const e = new ElasticEase(1, 3);
    e.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    return e;
  }
  const e = new CubicEase();
  e.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
  return e;
}

export function Model360Viewer({ artwork, hotspots, onClose, onAudioSeek, onAudioStop }: Model360ViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showHotspotList, setShowHotspotList] = useState(false);
  const [activeHotspotIndex, setActiveHotspotIndex] = useState<number>(-1);

  const pinRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const rootMeshRef = useRef<AbstractMesh | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const parsedHotspotsRef = useRef<ParsedHotspot[]>([]);

  const activeHotspot = activeHotspotIndex >= 0 ? hotspots[activeHotspotIndex] : null;

  // The curator-chosen camera transition, stored per artwork (same field the 2D
  // inspect reads). Drives the fly-to duration + easing below.
  const hotspotTransition: HotspotTransition = (() => {
    try {
      return (JSON.parse(artwork.frame_config_json || '{}').hotspotTransition as HotspotTransition) || 'arc_dip';
    } catch {
      return 'arc_dip';
    }
  })();

  const setPinRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) pinRefs.current.set(id, el);
    else pinRefs.current.delete(id);
  }, []);

  // Fly the camera so the hotspot's surface normal faces the viewer, then open its card.
  const focusHotspot = useCallback(
    (index: number) => {
      if (index < 0 || index >= hotspots.length) {
        setActiveHotspotIndex(-1);
        return;
      }
      const h = hotspots[index];
      setActiveHotspotIndex(index);

      const camera = cameraRef.current;
      const root = rootMeshRef.current;
      const parsed = parseAnchor(h.anchor_3d_json);
      if (camera && parsed) {
        // Face the camera toward the outward normal direction, transformed into
        // world space the same way the render loop does (root may carry a baked
        // Y-up/Z-up correction, scale, or authored rotation).
        let n = parsed.n;
        if (root) {
          root.computeWorldMatrix();
          const normalMatrix = Matrix.Transpose(Matrix.Invert(root.getWorldMatrix()));
          n = Vector3.TransformNormal(parsed.n, normalMatrix).normalize();
        }
        const targetAlpha = Math.atan2(n.z, n.x);
        const horizLen = Math.sqrt(n.x * n.x + n.z * n.z);
        const targetBeta = Math.max(0.1, Math.min(Math.PI - 0.1, Math.atan2(horizLen, n.y)));

        // Zoom in toward the hotspot (the 3D equivalent of the 2D inspect zoom):
        // move to ~1.7x the closest allowed radius.
        const lower = camera.lowerRadiusLimit ?? camera.radius * 0.5;
        const targetRadius = Math.max(lower, lower * 1.7);

        // Honor the curator's chosen transition: its duration + an easing that
        // matches its character (so different presets actually feel different).
        const preset = getHotspotAnimation(hotspotTransition);
        const fps = 60;
        const frames = preset.durationMs <= 0 ? 1 : Math.max(1, Math.round((preset.durationMs / 1000) * fps));
        const ease = easingForTransition(hotspotTransition);
        const LOOP = Animation.ANIMATIONLOOPMODE_CONSTANT;

        Animation.CreateAndStartAnimation('model360-focus-alpha', camera, 'alpha', fps, frames, camera.alpha, targetAlpha, LOOP, ease);
        Animation.CreateAndStartAnimation('model360-focus-beta', camera, 'beta', fps, frames, camera.beta, targetBeta, LOOP, ease);
        Animation.CreateAndStartAnimation('model360-focus-radius', camera, 'radius', fps, frames, camera.radius, targetRadius, LOOP, ease);
      }

      if (h.audio_timestamp_seconds != null && onAudioSeek) {
        onAudioSeek(h.audio_timestamp_seconds, h.audio_timestamp_end_seconds);
      } else {
        onAudioStop?.();
      }
    },
    [hotspots, onAudioSeek, onAudioStop, hotspotTransition]
  );

  // Re-parse hotspot anchors whenever the hotspots prop changes, independent of the
  // engine/model setup effect below — so the render loop never reads a stale snapshot
  // without forcing a model reload.
  useEffect(() => {
    parsedHotspotsRef.current = hotspots
      .map((hotspot) => {
        const a = parseAnchor(hotspot.anchor_3d_json);
        return a ? { hotspot, p: a.p, n: a.n } : null;
      })
      .filter((v): v is ParsedHotspot => v !== null);
  }, [hotspots]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isWebGLSupported()) return;

    let disposed = false;
    let sceneHandle: SceneHandle | null = null;
    let camera: ArcRotateCamera | null = null;
    let renderObserver: (() => void) | null = null;

    sceneHandle = initScene(canvas);
    const { scene, engine } = sceneHandle;
    // Clear transparent so the CSS radial studio backdrop (on __stage) shows
    // through and the object reads against a soft glow instead of flat black.
    scene.clearColor = new Color4(0, 0, 0, 0);

    camera = new ArcRotateCamera('model360Camera', -Math.PI / 2, Math.PI / 2.4, 5, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 40;
    camera.panningSensibility = 0;
    cameraRef.current = camera;

    // Key + rim lights so dark artifacts (bronze, lacquer) read against the
    // dark sơn-mài backdrop instead of blending in. Key follows the camera so
    // the viewed side stays lit as the visitor orbits.
    addKeyRimLights(scene, camera);

    const url = artwork.media_file_id ? proxyMediaUrl(artwork.media_file_id, artwork.updated_at) : '';

    if (!url) {
      setLoadError('No model file available.');
      setLoading(false);
    } else {
      SceneLoader.ImportMesh(
        '', url, '', scene,
        (meshes) => {
          if (disposed) return;
          const root = meshes[0] ?? null;
          rootMeshRef.current = root;
          if (root) {
            const { center, size } = getModelBounds(root);
            const boundRadius = Math.max(0.5, size * 0.75);
            camera!.setTarget(center);
            camera!.radius = boundRadius * 2;
            // Keep the camera outside the model surface so zooming can't clip
            // through it (matches the studio editor's boundary).
            camera!.lowerRadiusLimit = boundRadius;
            camera!.upperRadiusLimit = boundRadius * 4;
            for (const m of meshes) m.isPickable = false;
          }
          setLoading(false);
        },
        undefined,
        (_s, msg) => {
          if (disposed) return;
          setLoadError(msg || 'Failed to load 3D model.');
          setLoading(false);
        }
      );
    }

    const observer = scene.onBeforeRenderObservable.add(() => {
      const root = rootMeshRef.current;
      const cam = cameraRef.current;
      if (!root || !cam) return;

      root.computeWorldMatrix();
      const world = root.getWorldMatrix();
      const normalMatrix = Matrix.Transpose(Matrix.Invert(world));

      // Project into the canvas's CSS-pixel space, not the render buffer. The
      // ResolutionScaler / devicePixelRatio make the WebGL buffer a different
      // size than the CSS box, and the DOM pins are positioned in CSS px — using
      // render px offsets every pin from the top-left origin.
      const cssW = canvas.clientWidth || engine.getRenderWidth();
      const cssH = canvas.clientHeight || engine.getRenderHeight();
      const viewport = cam.viewport.toGlobal(cssW, cssH);
      const identity = Matrix.Identity();
      const transformMatrix = scene.getTransformMatrix();

      const lower = cam.lowerRadiusLimit ?? cam.radius * 0.5;
      const upper = cam.upperRadiusLimit ?? cam.radius * 2;
      const diameter = pinScaleForRadius(cam.radius, lower, upper, PIN_MIN_PX, PIN_MAX_PX);

      for (const { hotspot, p, n } of parsedHotspotsRef.current) {
        const el = pinRefs.current.get(hotspot.id);
        if (!el) continue;

        const worldPoint = Vector3.TransformCoordinates(p, world);
        const worldNormal = Vector3.TransformNormal(n, normalMatrix).normalize();

        const screen = Vector3.Project(worldPoint, identity, transformMatrix, viewport);
        el.style.left = `${screen.x}px`;
        el.style.top = `${screen.y}px`;
        el.style.width = `${diameter}px`;
        el.style.height = `${diameter}px`;

        const facing = isPointFacingCamera(worldPoint, worldNormal, cam.position) && screen.z < 1;
        el.style.opacity = facing ? '1' : '0';
        el.style.pointerEvents = facing ? 'auto' : 'none';
      }
    });
    renderObserver = () => scene.onBeforeRenderObservable.remove(observer);

    return () => {
      disposed = true;
      renderObserver?.();
      cameraRef.current = null;
      rootMeshRef.current = null;
      sceneHandle?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artwork.media_file_id, artwork.updated_at]);

  return (
    <div className="model-360-viewer" role="dialog" aria-modal="true" aria-label={`360° inspect: ${artwork.title}`}>
      <header className="model-360-viewer__header">
        <div className="model-360-viewer__title-info">
          <span className="eyebrow">360&deg; Inspect</span>
          <h2 className="model-360-viewer__title">{artwork.title}</h2>
        </div>
        <div className="model-360-viewer__header-actions">
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
            className="model-360-viewer__close"
            onClick={() => {
              onAudioStop?.();
              onClose();
            }}
            aria-label="Close 360 inspect"
            title="Exit 360 Inspect"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </header>

      <div className="model-360-viewer__stage">
        <canvas
          ref={canvasRef}
          className="model-360-viewer__canvas"
          onContextMenu={(e) => e.preventDefault()}
        />

        {loading && !loadError && (
          <div className="model-360-viewer__loading">
            <p>Loading 3D model&hellip;</p>
          </div>
        )}
        {loadError && (
          <div className="model-360-viewer__error">
            <p>Failed to load 3D model: {loadError}</p>
          </div>
        )}

        {!loading && !loadError && hotspots.map((h, i) => {
          const parsed = parseAnchor(h.anchor_3d_json);
          if (!parsed) return null;
          return (
            <button
              key={h.id}
              type="button"
              ref={(el) => setPinRef(h.id, el)}
              className={`hotspot-pin model-360-pin ${activeHotspotIndex === i ? 'active' : ''} ${h.audio_file_id ? 'audio' : ''}`}
              aria-label={`Hotspot: ${h.title}`}
              onClick={() => {
                focusHotspot(i);
                setShowHotspotList(false);
              }}
            >
              <span className="hotspot-pin__tooltip">{h.title}</span>
            </button>
          );
        })}

        {showHotspotList && (
          <aside className="inspect-lightbox__drawer model-360-viewer__drawer" role="dialog" aria-label="Hotspots Directory">
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
            <p className="sidebar-subtitle">Click any detail point to orbit and inspect.</p>
            <div className="hotspots-list-items">
              {hotspots.map((h, i) => (
                <button
                  key={h.id}
                  type="button"
                  className={`hotspot-list-item ${activeHotspotIndex === i ? 'active' : ''}`}
                  onClick={() => {
                    focusHotspot(i);
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
        )}

        {activeHotspot && (
          <InspectDesktopSidebar
            key={activeHotspot.id}
            activeHotspot={activeHotspot}
            activeHotspotIndex={activeHotspotIndex}
            totalHotspots={hotspots.length}
            onClose={() => setActiveHotspotIndex(-1)}
            onNavigate={(idx) => focusHotspot(idx)}
            onAudioSeek={onAudioSeek}
          />
        )}
      </div>

      <footer className="model-360-viewer__hint">
        Left-drag to orbit &middot; Scroll to zoom
      </footer>
    </div>
  );
}
