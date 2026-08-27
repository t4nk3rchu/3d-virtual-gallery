/**
 * Domain types — spec §3
 * All IDs are crypto.randomUUID() strings.
 * No TourWaypoint, no exhibition password_hash (both deferred to phase 2).
 */

// ─── Users ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;                      // crypto.randomUUID()
  email: string;
  full_name: string;
  auth_provider: 'google' | 'password';
  google_sub: string | null;       // null for password accounts
  password_hash: string | null;    // PBKDF2 (WebCrypto); null for google accounts
  role: 'admin' | 'curator';
  created_at: number;              // unix epoch
}

export type UserInput = Omit<User, 'id' | 'created_at'>;

// ─── Rooms ────────────────────────────────────────────────────────────────────
export interface Room {
  id: string;
  owner_user_id: string | null;    // null = platform library room
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  glb_file_id: string;             // Google Drive file ID of the GLB
  glb_source: 'curator_drive' | 'platform_drive';
  spawn_json: string | null;       // JSON: { position:[x,y,z], target:[x,y,z] }
  is_public: 0 | 1;
  created_at: number;
}

export type RoomInput = Omit<Room, 'id' | 'created_at'>;

// ─── Exhibitions ──────────────────────────────────────────────────────────────
export interface Exhibition {
  id: string;
  user_id: string;
  room_id: string;
  title: string;
  slug: string;                    // unique; public URL /e/{slug}
  description: string | null;
  curator_name: string | null;
  start_date: string | null;       // ISO string
  end_date: string | null;
  is_published: 0 | 1;
  cover_image_url: string | null;
  settings_json: string | null;    // JSON: { backgroundAudioFileId?, ambientLightIntensity?, defaultEyeHeight? }
  intro_video_file_id: string | null;
  curation_type: 'solo' | 'group';
  created_at: number;
  // No password_hash — phase 2
}

export type ExhibitionInput = Omit<Exhibition, 'id' | 'created_at'>;

// ─── Artists ──────────────────────────────────────────────────────────────────
export interface Artist {
  id: string;
  exhibition_id: string;
  name: string;
  life_dates?: string | null;
  quote?: string | null;
  biography?: string | null;
  contact_info?: string | null;
  portrait_file_id?: string | null;
  order_index: number;
  created_at: number;
}

export type ArtistInput = Omit<Artist, 'id' | 'created_at'>;

// ─── Artworks ─────────────────────────────────────────────────────────────────
export type ArtworkType = 'IMAGE_2D' | 'VIDEO' | 'AUDIO';
// SCULPTURE_3D deliberately excluded from phase 1

export interface Artwork {
  id: string;
  exhibition_id: string;
  artist_id?: string | null;
  title: string;
  artist: string;
  year: string | null;
  medium: string | null;
  dimensions: string | null;
  description: string | null;
  artwork_type: ArtworkType;
  media_file_id: string | null;     // Drive file ID (image / audio)
  youtube_video_id: string | null;  // for VIDEO type
  audio_guide_file_id: string | null;
  transform_json: string;           // JSON: { position:[x,y,z], rotation:[x,y,z], scale:[x,y,z] }
  frame_config_json: string;        // JSON: FrameConfig (see below)
  order_index: number;
  updated_at: number;   // unix epoch; bumped on every edit (media cache versioning)
}

export type ArtworkInput = Omit<Artwork, 'id' | 'updated_at'>;

export type HotspotTransition =
  | 'arc_dip'
  | 'linear_glide'
  | 'deep_pullback'
  | 'instant_cut'
  | 'spring_overshoot';

export interface FrameConfig {
  frameType: 'wood' | 'metal_black' | 'float_white' | 'canvas_wrap' | 'none';
  frameWidth: number;
  matWidth: number;
  matColor: string;
  showPlacard: boolean;
  hotspotTransition?: HotspotTransition;
}

// ─── Hotspots ─────────────────────────────────────────────────────────────────
export interface ArtworkHotspot {
  id: string;
  artwork_id: string;
  x_percent: number;   // 0–100
  y_percent: number;   // 0–100
  title: string;
  description: string;
  audio_timestamp_seconds: number | null;
  audio_file_id: string | null;
}

export type ArtworkHotspotInput = Omit<ArtworkHotspot, 'id'>;

// ─── API shapes ───────────────────────────────────────────────────────────────

/** Public exhibition payload (includes room + artworks + hotspots + artists) */
export interface ExhibitionDetail extends Exhibition {
  room: Room;
  artists?: Artist[];
  artworks: Array<
    Artwork & {
      hotspots: ArtworkHotspot[];
      artist_profile?: Artist | null;
    }
  >;
}

/** Analytics event types sent to /api/events */
export type EventKind =
  | 'exhibition_view'
  | 'artwork_focus'
  | 'artwork_inspect'
  | 'artwork_dwell';

export interface EngagementEvent {
  kind: EventKind;
  exhibition_id: string;
  room_id: string;
  artwork_id?: string;
  artwork_type?: ArtworkType;
  dwell_seconds?: number;
}
