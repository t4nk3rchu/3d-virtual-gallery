/**
 * Task 7: Artwork factory — IMAGE_2D, VIDEO
 *
 * Spec §5.3:
 *   IMAGE_2D  → textured plane (proxy /api/media) + frame + placard + spotlight
 *   VIDEO     → screen plane + YouTube Player API
 */
import type { Scene } from '@babylonjs/core';
import {
  MeshBuilder,
  StandardMaterial,
  Texture,
  Color3,
  Vector3,
  SpotLight,
  DynamicTexture,
} from '@babylonjs/core';
import type { Artwork } from '../../types/schema';
import { getImageUrl, proxyMediaUrl } from '../media/gdrive';
import { getYouTubeThumbnailUrl } from '../media/youtube';
import { calculateFrameDimensions, createProceduralFrame } from './frame-builder';

function parseTransform(json: string): {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
} {
  try {
    return JSON.parse(json);
  } catch {
    return { position: [0, 1.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
  }
}

function parseFrameConfig(json: string) {
  try {
    return JSON.parse(json);
  } catch {
    return {
      frameType: 'wood',
      frameWidth: 0.05,
      matWidth: 0.03,
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
  ctx.fillStyle = '#FAF7EE';
  ctx.fillRect(0, 0, texW, texH);
  ctx.strokeStyle = '#D3C6A8';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, texW - 4, texH - 4);

  // Artwork metadata
  ctx.fillStyle = '#1A1813';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(artwork.title || 'Untitled', 18, 42);

  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#4A4639';
  if (artwork.artist) ctx.fillText(artwork.artist, 18, 78);

  ctx.font = 'italic 16px sans-serif';
  ctx.fillStyle = '#7A7566';
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

function createImage2DArtwork(scene: Scene, artwork: Artwork) {
  const transform = parseTransform(artwork.transform_json);
  const frameConfig = parseFrameConfig(artwork.frame_config_json);

  // Default artwork plane size (1.0 × 0.75 m); scale applied via transform
  const artW = 1.0;
  const artH = 0.75;

  const plane = MeshBuilder.CreatePlane(artwork.id, { width: artW, height: artH }, scene);
  plane.position = new Vector3(...transform.position);
  plane.rotation = new Vector3(...transform.rotation);
  plane.scaling = new Vector3(...transform.scale);

  // Tag for picking (spec §5.1)
  plane.metadata = { artworkId: artwork.id };
  plane.isPickable = true;

  // Texture from CORS-enabled media proxy / image CDN
  const mediaFileId = artwork.media_file_id;
  if (mediaFileId) {
    const mat = new StandardMaterial(`${artwork.id}_mat`, scene);
    const textureUrl = proxyMediaUrl(mediaFileId, artwork.updated_at);
    const tex = new Texture(
      textureUrl,
      scene,
      false, // noMipmap
      true,  // invertY
      Texture.TRILINEAR_SAMPLINGMODE,
      undefined, // onLoad
      () => {
        // Fallback to direct image CDN if proxy fails
        const fallbackUrl = getImageUrl(mediaFileId, 'gallery');
        if (fallbackUrl && fallbackUrl !== textureUrl) {
          mat.diffuseTexture = new Texture(fallbackUrl, scene);
        }
      }
    );
    mat.diffuseTexture = tex;
    mat.emissiveColor = new Color3(0.1, 0.1, 0.1);
    plane.material = mat;
  }

  // Procedural frame
  const dims = calculateFrameDimensions(artW, artH, frameConfig);
  createProceduralFrame(scene, dims, frameConfig, plane);

  // Placard placed below outer frame edge without intersecting
  if (frameConfig.showPlacard) {
    const placardWidth = Math.min(0.48, Math.max(0.32, dims.outerWidth * 0.55));
    const placardHeight = placardWidth * 0.32;
    const placard = createPlacard(scene, artwork, artwork.id, placardWidth, placardHeight);
    placard.parent = plane;
    placard.position.x = 0;
    placard.position.y = -(dims.outerHeight / 2 + 0.04 + placardHeight / 2);
    placard.position.z = -0.005;
  }

  // Spotlight
  attachSpotlight(scene, plane.position.clone(), artwork.id);

  return plane;
}

// ─── VIDEO (YouTube) ──────────────────────────────────────────────────────────

function createVideoArtwork(scene: Scene, artwork: Artwork) {
  const transform = parseTransform(artwork.transform_json);
  const frameConfig = parseFrameConfig(artwork.frame_config_json);

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
    mat.diffuseTexture = new Texture(textureUrl, scene);
    mat.emissiveColor = new Color3(0.15, 0.15, 0.15);
  } else {
    mat.emissiveColor = new Color3(0.04, 0.04, 0.04);
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

export function createArtworkMesh(scene: Scene, artwork: Artwork) {
  switch (artwork.artwork_type) {
    case 'IMAGE_2D':
      return createImage2DArtwork(scene, artwork);
    case 'VIDEO':
      return createVideoArtwork(scene, artwork);
    default:
      console.warn(`[artwork-factory] Unknown artwork type: ${(artwork as Artwork).artwork_type}`);
      return null;
  }
}
