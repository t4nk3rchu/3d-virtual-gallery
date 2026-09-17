/**
 * Task 7: Artwork factory — IMAGE_2D, VIDEO
 *
 * Spec §5.3:
 *   IMAGE_2D  → textured plane (proxy /api/media) + frame + placard + spotlight
 *   VIDEO     → screen plane + YouTube Player API
 */
import type { Scene, Mesh } from '@babylonjs/core';
import {
  MeshBuilder,
  StandardMaterial,
  Texture,
  Color3,
  Vector3,
  SpotLight,
  DynamicTexture,
  VertexBuffer,
} from '@babylonjs/core';

/** Longest side fixed at 1.0 m; the other derived from the image aspect (w/h). */
function aspectToDims(aspect: number): { w: number; h: number } {
  if (!isFinite(aspect) || aspect <= 0) return { w: 1.0, h: 0.75 };
  return aspect >= 1 ? { w: 1.0, h: 1.0 / aspect } : { w: aspect, h: 1.0 };
}

/** Reshape a plane's quad geometry in place (keeps the same mesh object + UVs). */
function reshapePlane(plane: Mesh, fromW: number, fromH: number, toW: number, toH: number) {
  const pos = plane.getVerticesData(VertexBuffer.PositionKind);
  if (!pos) return;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] = (pos[i] / fromW) * toW;
    pos[i + 1] = (pos[i + 1] / fromH) * toH;
  }
  plane.updateVerticesData(VertexBuffer.PositionKind, pos);
  plane.refreshBoundingInfo();
}
import type { Artwork } from '../../types/schema';
import { getImageUrl, proxyMediaUrl } from '../media/gdrive';
import { getYouTubeThumbnailUrl } from '../media/youtube';
import { calculateFrameDimensions, createProceduralFrame } from './frame-builder';
import { deserializeTransform } from '../studio/transform';

function parseFrameConfig(json: string) {
  try {
    return JSON.parse(json);
  } catch {
    return {
      frameType: 'wood',
      frameWidth: 0.05,
      matWidth: 0,
      matColor: '#FFFFFF',
      showPlacard: true,
    };
  }
}

/** Create a wall placard (title/artist/medium) via DynamicTexture */
function createPlacard(scene: Scene, artwork: Artwork, parentName: string, width: number, height: number) {
  const texW = 512;
  const texH = 160;
  const dt = new DynamicTexture(`${parentName}_placard_tex`, { width: texW, height: texH }, scene);
  const ctx = dt.getContext();

  // Parchment plaque background with subtle border
  ctx.fillStyle = '#F6EFDC';
  ctx.fillRect(0, 0, texW, texH);
  ctx.strokeStyle = '#D9C9A6';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, texW - 4, texH - 4);

  // Artwork metadata
  ctx.fillStyle = '#241A10';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(artwork.title || 'Untitled', 18, 42);

  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#3A2C1C';
  if (artwork.artist) ctx.fillText(artwork.artist, 18, 78);

  ctx.font = 'italic 16px sans-serif';
  ctx.fillStyle = '#7A6E57';
  const meta = [artwork.year, artwork.medium].filter(Boolean).join(' • ');
  if (meta) ctx.fillText(meta, 18, 116);
  else if (artwork.medium) ctx.fillText(artwork.medium, 18, 116);

  dt.update();

  const placard = MeshBuilder.CreatePlane(
    `${parentName}_placard`,
    { width, height },
    scene
  );
  const mat = new StandardMaterial(`${parentName}_placard_mat`, scene);
  mat.diffuseTexture = dt;
  mat.emissiveColor = Color3.White();
  placard.material = mat;
  placard.isPickable = false;
  return placard;
}

/** Attach a gallery spotlight above/front of an artwork */
function attachSpotlight(scene: Scene, position: Vector3, name: string) {
  const spot = new SpotLight(
    `${name}_spot`,
    position.add(new Vector3(0, 0.8, 0.3)),
    new Vector3(0, -1, -0.3).normalize(),
    Math.PI / 5.14,   // 35° (spec §5.2)
    2,
    scene
  );
  spot.intensity = 1.2;
  return spot;
}

// ─── IMAGE_2D ─────────────────────────────────────────────────────────────────

function createImage2DArtwork(scene: Scene, artwork: Artwork, onTextureLoaded?: () => void) {
  const transform = deserializeTransform(artwork.transform_json);
  const frameConfig = parseFrameConfig(artwork.frame_config_json);
  // Mat control was removed; the artwork sits flush inside the frame (no gap).
  frameConfig.matWidth = 0;

  // Placeholder geometry; reshaped to the image's true aspect once the texture loads.
  const baseW = 1.0;
  const baseH = 0.75;

  // updatable geometry so reshapePlane can rewrite the quad to the image's aspect
  const plane = MeshBuilder.CreatePlane(artwork.id, { width: baseW, height: baseH, updatable: true }, scene);
  plane.position = new Vector3(...transform.position);
  plane.rotation = new Vector3(...transform.rotation);
  plane.scaling = new Vector3(...transform.scale);

  // Tag for picking (spec §5.1)
  plane.metadata = { artworkId: artwork.id };
  plane.isPickable = true;

  // Build the frame + placard + spotlight around the FINAL-sized plane. Called once,
  // after the aspect is known (or immediately when there's no texture to size from).
  let dressed = false;
  const buildDressing = (w: number, h: number) => {
    if (dressed) return;
    dressed = true;
    if (w !== baseW || h !== baseH) reshapePlane(plane, baseW, baseH, w, h);

    const dims = calculateFrameDimensions(w, h, frameConfig);
    createProceduralFrame(scene, dims, frameConfig, plane);

    if (frameConfig.showPlacard) {
      const placardWidth = Math.min(0.48, Math.max(0.32, dims.outerWidth * 0.55));
      const placardHeight = placardWidth * 0.32;
      const placard = createPlacard(scene, artwork, artwork.id, placardWidth, placardHeight);
      placard.parent = plane;
      placard.position.x = 0;
      placard.position.y = -(dims.outerHeight / 2 + 0.04 + placardHeight / 2);
      placard.position.z = -0.005;
    }

    attachSpotlight(scene, plane.position.clone(), artwork.id);
  };

  const mediaFileId = artwork.media_file_id;
  if (mediaFileId) {
    const mat = new StandardMaterial(`${artwork.id}_mat`, scene);
    const textureUrl = proxyMediaUrl(mediaFileId, artwork.updated_at);
    let notified = false;
    const notifyOnce = () => {
      if (!notified) {
        notified = true;
        onTextureLoaded?.();
      }
    };
    // Size the plane from the image's natural (pre-POT) dimensions, then dress it.
    const onReady = (t: Texture) => {
      const s = t.getBaseSize();
      const { w, h } = aspectToDims(s.width / s.height);
      buildDressing(w, h);
      notifyOnce();
    };

    const tex = new Texture(
      textureUrl,
      scene,
      false, // noMipmap
      true,  // invertY
      Texture.TRILINEAR_SAMPLINGMODE,
      () => onReady(tex), // onLoad
      () => {
        // Fallback to direct image CDN if the proxy fails
        const fallbackUrl = getImageUrl(mediaFileId, 'gallery');
        if (fallbackUrl && fallbackUrl !== textureUrl) {
          const ftex = new Texture(
            fallbackUrl,
            scene,
            false,
            true,
            Texture.TRILINEAR_SAMPLINGMODE,
            () => onReady(ftex),
            () => { buildDressing(baseW, baseH); notifyOnce(); }
          );
          mat.diffuseTexture = ftex;
        } else {
          buildDressing(baseW, baseH);
          notifyOnce();
        }
      }
    );
    mat.diffuseTexture = tex;
    mat.emissiveColor = new Color3(0.1, 0.1, 0.1);
    plane.material = mat;
  } else {
    buildDressing(baseW, baseH);
    onTextureLoaded?.();
  }

  return plane;
}

// ─── VIDEO (YouTube) ──────────────────────────────────────────────────────────

function createVideoArtwork(scene: Scene, artwork: Artwork, onTextureLoaded?: () => void) {
  const transform = deserializeTransform(artwork.transform_json);
  const frameConfig = parseFrameConfig(artwork.frame_config_json);
  frameConfig.matWidth = 0; // flush frame — no gap

  const artW = 1.6;
  const artH = 0.9;

  // Screen plane (16:9 ratio)
  const screen = MeshBuilder.CreatePlane(
    artwork.id,
    { width: artW, height: artH },
    scene
  );
  screen.position = new Vector3(...transform.position);
  screen.rotation = new Vector3(...transform.rotation);
  screen.scaling = new Vector3(...transform.scale);

  screen.metadata = {
    artworkId: artwork.id,
    youtubeVideoId: artwork.youtube_video_id,
    isVideoScreen: true,
  };
  screen.isPickable = true;

  // Render YouTube thumbnail on the 3D screen plane
  const mat = new StandardMaterial(`${artwork.id}_screen_mat`, scene);
  const ytThumb = getYouTubeThumbnailUrl(artwork.youtube_video_id);
  const customCover = artwork.media_file_id ? proxyMediaUrl(artwork.media_file_id, artwork.updated_at) : null;
  const textureUrl = ytThumb || customCover;

  if (textureUrl) {
    mat.diffuseTexture = new Texture(
      textureUrl,
      scene,
      false,
      true,
      Texture.TRILINEAR_SAMPLINGMODE,
      onTextureLoaded,
      onTextureLoaded
    );
    mat.emissiveColor = new Color3(0.15, 0.15, 0.15);
  } else {
    mat.emissiveColor = new Color3(0.04, 0.04, 0.04);
    onTextureLoaded?.();
  }
  screen.material = mat;

  // Procedural frame
  const dims = calculateFrameDimensions(artW, artH, frameConfig);
  createProceduralFrame(scene, dims, frameConfig, screen);

  // Placard placed below outer frame edge without intersecting
  if (frameConfig.showPlacard) {
    const placardWidth = Math.min(0.55, Math.max(0.35, dims.outerWidth * 0.45));
    const placardHeight = placardWidth * 0.32;
    const placard = createPlacard(scene, artwork, artwork.id, placardWidth, placardHeight);
    placard.parent = screen;
    placard.position.x = 0;
    placard.position.y = -(dims.outerHeight / 2 + 0.04 + placardHeight / 2);
    placard.position.z = -0.005;
  }

  // Spotlight
  attachSpotlight(scene, screen.position.clone(), artwork.id);

  return screen;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createArtworkMesh(scene: Scene, artwork: Artwork, onTextureLoaded?: () => void) {
  switch (artwork.artwork_type) {
    case 'IMAGE_2D':
      return createImage2DArtwork(scene, artwork, onTextureLoaded);
    case 'VIDEO':
      return createVideoArtwork(scene, artwork, onTextureLoaded);
    default:
      console.warn(`[artwork-factory] Unknown artwork type: ${(artwork as Artwork).artwork_type}`);
      onTextureLoaded?.();
      return null;
  }
}
