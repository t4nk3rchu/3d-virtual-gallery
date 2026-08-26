# **3D Virtual Gallery & Exhibition Platform — Complete Implementation Plan**

**Goal:** Build a production-grade 3D virtual exhibition platform inspired by Kunstmatrix, allowing curators to design 3D galleries (procedural parametric rooms or custom .glb models), mount multimedia artworks (2D framed works, video screens, spatial audio, and 3D sculptures on pedestals), and publish interactive exhibitions with zero media hosting costs via Cloudflare and Google Drive.  
**Architecture:** Next.js fullstack application deployed on Cloudflare Pages and Workers, utilizing Cloudflare D1 (serverless SQLite at edge) for data persistence. 3D rendering is driven by Babylon.js with dynamic 3-tier resolution scaling (75% roaming $\\to$ 90% wall focus $\\to$ 100% pop-up inspection). Media is distributed with zero egress costs using Google Drive CDN for 2D images, Cloudflare Edge Cache API for .glb models/audio, and YouTube for adaptive video streaming.  
**Tech Stack:** Next.js (App Router, TypeScript), Babylon.js 7+, Cloudflare Pages/Workers (wrangler), Cloudflare D1, Tailwind CSS, Lucide React, Vitest.

## **Global Constraints**

> * **3D Engine:** Babylon.js 7+ with WebGL2 context.  
> * **Database:** Cloudflare D1 (SQLite) with strict parameterized prepared statements.  
> * **Media Pipeline:**  
  * 2D Artworks: Google Content CDN (\[https://lh3.googleusercontent.com/d/\](https://lh3.googleusercontent.com/d/){fileId}=w1600 for gallery view, \=s0 for pop-up deep inspection).  
  * Video Art: YouTube Player API iframe/texture bridge.  
  * 3D Models & Audio: Proxied via /api/media/proxy/\[fileId\] with Cache-Control: public, max-age=31536000, s-maxage=31536000, immutable and HTTP 206 Range support.  
> * **Hardware Scaling Tiers:**  
  * Tier 1 (Roaming Walk Mode): Fixed 75% resolution (engine.setHardwareScalingLevel(1.33)).  
  * Tier 2 (Wall Focus Mode): 90% resolution (engine.setHardwareScalingLevel(1.11)).  
  * Tier 3 (Pop-up Lightbox Mode): 100% resolution (engine.setHardwareScalingLevel(1.0)).  
> * **Camera Collision:** Standard eye height $y \= 1.7\\text{ m}$ with ellipsoid collision bounds (0.5, 0.9, 0.5).

### **Task 1: Core Domain Types, Cloudflare D1 Schema & Database Helpers**

**Files:**

> * Create: src/types/schema.ts  
> * Create: migrations/0001\_initial\_schema.sql  
> * Create: src/lib/db.ts  
> * Test: tests/unit/db.test.ts

**Interfaces:**

> * Produces: Exhibition, Room, RoomTemplate, Artwork, ArtworkHotspot, TourWaypoint TypeScript types; createInMemoryDb(), getExhibitionBySlug(db, slug), createExhibition(db, data) DB accessors.  
> * \[ \] **Step 1: Write the failing test**

TypeScript  
// tests/unit/db.test.ts  
import { describe, it, expect, beforeEach } from 'vitest';  
import { createInMemoryDb, getExhibitionBySlug, createExhibition } from '../../src/lib/db';  
import { ExhibitionInput } from '../../src/types/schema';

describe('D1 Database Layer', () \=\> {  
  let db: any;

  beforeEach(async () \=\> {  
    db \= await createInMemoryDb();  
  });

  it('creates and retrieves an exhibition by slug', async () \=\> {  
    const input: ExhibitionInput \= {  
      user\_id: 'usr-123',  
      title: '70th Anniversary Photo Exhibition',  
      slug: 'dongmoon-70th',  
      description: 'Historical archive photos',  
      curator\_name: 'Dongmoon Church',  
      start\_date: '2026-08-15',  
      end\_date: '2026-12-31',  
      is\_published: 1,  
    };

    const created \= await createExhibition(db, input);  
    expect(created.id).toBeDefined();  
    expect(created.slug).toBe('dongmoon-70th');

    const fetched \= await getExhibitionBySlug(db, 'dongmoon-70th');  
    expect(fetched).not.toBeNull();  
    expect(fetched?.title).toBe('70th Anniversary Photo Exhibition');  
    expect(fetched?.curator\_name).toBe('Dongmoon Church');  
  });  
});

> * \[ \] **Step 2: Run test to verify it fails**

Run: npx vitest run tests/unit/db.test.ts  
Expected: FAIL with "Cannot find module '../../src/lib/db'"

> * \[ \] **Step 3: Implement Domain Types, SQL Migration, and DB helper**

TypeScript  
// src/types/schema.ts  
export type ArtworkType \= 'IMAGE\_2D' | 'VIDEO' | 'AUDIO\_INSTALLATION' | 'SCULPTURE\_3D';  
export type RoomType \= 'PARAMETRIC' | 'CUSTOM\_GLB';  
export type FrameStyle \= 'wood' | 'metal\_black' | 'float\_white' | 'canvas\_wrap' | 'none';

export interface FrameConfig {  
  frameType: FrameStyle;  
  frameWidth: number;  
  matWidth: number;  
  matColor: string;  
  showPlacard: boolean;  
}

export interface Transform3D {  
  position: \[number, number, number\];  
  rotation: \[number, number, number\];  
  scale: \[number, number, number\];  
}

export interface WallSegment {  
  id: string;  
  x1: number;  
  z1: number;  
  x2: number;  
  z2: number;  
  height: number;  
  thickness: number;  
}

export interface ParametricRoomData {  
  walls: WallSegment\[\];  
  floorMaterial: { textureUrl?: string; color: string; roughness: number };  
  wallMaterial: { color: string; roughness: number };  
  ceilingMaterial: { color: string; roughness: number };  
}

export interface Exhibition {  
  id: string;  
  user\_id: string;  
  title: string;  
  slug: string;  
  description: string;  
  curator\_name: string;  
  start\_date?: string;  
  end\_date?: string;  
  is\_published: number;  
  password\_hash?: string;  
  cover\_image\_url?: string;  
  settings\_json?: string;  
  created\_at: number;  
}

export interface ExhibitionInput {  
  user\_id: string;  
  title: string;  
  slug: string;  
  description?: string;  
  curator\_name?: string;  
  start\_date?: string;  
  end\_date?: string;  
  is\_published?: number;  
  password\_hash?: string;  
  cover\_image\_url?: string;  
  settings\_json?: string;  
}

export interface Room {  
  id: string;  
  exhibition\_id: string;  
  template\_id?: string;  
  order\_index: number;  
  name: string;  
  room\_type: RoomType;  
  parametric\_layout?: string;  
  custom\_glb\_source?: string;  
  materials\_json?: string;  
  lighting\_json?: string;  
}

export interface Artwork {  
  id: string;  
  exhibition\_id: string;  
  room\_id: string;  
  title: string;  
  artist: string;  
  year?: string;  
  medium?: string;  
  dimensions?: string;  
  description?: string;  
  artwork\_type: ArtworkType;  
  media\_url: string;  
  media\_file\_id?: string;  
  youtube\_video\_id?: string;  
  audio\_guide\_url?: string;  
  wall\_id?: string;  
  transform\_json: string;  
  frame\_config\_json: string;  
}

export interface ArtworkHotspot {  
  id: string;  
  artwork\_id: string;  
  x\_percent: number;  
  y\_percent: number;  
  title: string;  
  description: string;  
  audio\_timestamp\_seconds?: number;  
}

export interface TourWaypoint {  
  id: string;  
  exhibition\_id: string;  
  order\_index: number;  
  artwork\_id?: string;  
  camera\_position\_json: string;  
  camera\_target\_json: string;  
  narration\_text?: string;  
  dwell\_time\_seconds: number;  
}

SQL  
\-- migrations/0001\_initial\_schema.sql  
CREATE TABLE IF NOT EXISTS users (  
  id TEXT PRIMARY KEY,  
  email TEXT UNIQUE NOT NULL,  
  password\_hash TEXT NOT NULL,  
  full\_name TEXT NOT NULL,  
  role TEXT DEFAULT 'curator',  
  created\_at INTEGER NOT NULL  
);

CREATE TABLE IF NOT EXISTS room\_templates (  
  id TEXT PRIMARY KEY,  
  name TEXT NOT NULL,  
  description TEXT,  
  thumbnail\_url TEXT,  
  room\_type TEXT NOT NULL,  
  parametric\_data TEXT,  
  glb\_media\_url TEXT,  
  is\_public INTEGER DEFAULT 1  
);

CREATE TABLE IF NOT EXISTS exhibitions (  
  id TEXT PRIMARY KEY,  
  user\_id TEXT NOT NULL,  
  title TEXT NOT NULL,  
  slug TEXT UNIQUE NOT NULL,  
  description TEXT,  
  curator\_name TEXT,  
  start\_date TEXT,  
  end\_date TEXT,  
  is\_published INTEGER DEFAULT 0,  
  password\_hash TEXT,  
  cover\_image\_url TEXT,  
  settings\_json TEXT,  
  created\_at INTEGER NOT NULL,  
  FOREIGN KEY (user\_id) REFERENCES users(id) ON DELETE CASCADE  
);

CREATE TABLE IF NOT EXISTS rooms (  
  id TEXT PRIMARY KEY,  
  exhibition\_id TEXT NOT NULL,  
  template\_id TEXT,  
  order\_index INTEGER NOT NULL,  
  name TEXT NOT NULL,  
  room\_type TEXT NOT NULL,  
  parametric\_layout TEXT,  
  custom\_glb\_source TEXT,  
  materials\_json TEXT,  
  lighting\_json TEXT,  
  FOREIGN KEY (exhibition\_id) REFERENCES exhibitions(id) ON DELETE CASCADE,  
  FOREIGN KEY (template\_id) REFERENCES room\_templates(id) ON DELETE SET NULL  
);

CREATE TABLE IF NOT EXISTS artworks (  
  id TEXT PRIMARY KEY,  
  exhibition\_id TEXT NOT NULL,  
  room\_id TEXT NOT NULL,  
  title TEXT NOT NULL,  
  artist TEXT NOT NULL,  
  year TEXT,  
  medium TEXT,  
  dimensions TEXT,  
  description TEXT,  
  artwork\_type TEXT NOT NULL,  
  media\_url TEXT NOT NULL,  
  media\_file\_id TEXT,  
  youtube\_video\_id TEXT,  
  audio\_guide\_url TEXT,  
  wall\_id TEXT,  
  transform\_json TEXT NOT NULL,  
  frame\_config\_json TEXT NOT NULL,  
  FOREIGN KEY (exhibition\_id) REFERENCES exhibitions(id) ON DELETE CASCADE,  
  FOREIGN KEY (room\_id) REFERENCES rooms(id) ON DELETE CASCADE  
);

CREATE TABLE IF NOT EXISTS artwork\_hotspots (  
  id TEXT PRIMARY KEY,  
  artwork\_id TEXT NOT NULL,  
  x\_percent REAL NOT NULL,  
  y\_percent REAL NOT NULL,  
  title TEXT NOT NULL,  
  description TEXT NOT NULL,  
  audio\_timestamp\_seconds REAL,  
  FOREIGN KEY (artwork\_id) REFERENCES artworks(id) ON DELETE CASCADE  
);

CREATE TABLE IF NOT EXISTS tour\_waypoints (  
  id TEXT PRIMARY KEY,  
  exhibition\_id TEXT NOT NULL,  
  order\_index INTEGER NOT NULL,  
  artwork\_id TEXT,  
  camera\_position\_json TEXT NOT NULL,  
  camera\_target\_json TEXT NOT NULL,  
  narration\_text TEXT,  
  dwell\_time\_seconds INTEGER DEFAULT 8,  
  FOREIGN KEY (exhibition\_id) REFERENCES exhibitions(id) ON DELETE CASCADE,  
  FOREIGN KEY (artwork\_id) REFERENCES artworks(id) ON DELETE SET NULL  
);

CREATE INDEX IF NOT EXISTS idx\_exhibitions\_slug ON exhibitions(slug);  
CREATE INDEX IF NOT EXISTS idx\_artworks\_room ON artworks(room\_id);  
CREATE INDEX IF NOT EXISTS idx\_hotspots\_artwork ON artwork\_hotspots(artwork\_id);  
CREATE INDEX IF NOT EXISTS idx\_waypoints\_exhibition ON tour\_waypoints(exhibition\_id, order\_index);

TypeScript  
// src/lib/db.ts  
import { Exhibition, ExhibitionInput } from '../types/schema';

export async function createInMemoryDb() {  
  const sqlite3 \= await import('better-sqlite3');  
  const Database \= sqlite3.default;  
  const db \= new Database(':memory:');  
  const fs \= await import('fs');  
  const path \= await import('path');  
  const migration \= fs.readFileSync(path.join(process.cwd(), 'migrations/0001\_initial\_schema.sql'), 'utf-8');  
  db.exec(migration);  
  return {  
    prepare: (query: string) \=\> {  
      const stmt \= db.prepare(query);  
      return {  
        bind: (...params: any\[\]) \=\> ({  
          first: async \<T \= any\>(): Promise\<T | null\> \=\> {  
            return (stmt.get(...params) as T) || null;  
          },  
          all: async \<T \= any\>(): Promise\<{ results: T\[\] }\> \=\> {  
            return { results: stmt.all(...params) as T\[\] };  
          },  
          run: async (): Promise\<{ success: boolean }\> \=\> {  
            stmt.run(...params);  
            return { success: true };  
          },  
        }),  
      };  
    },  
  };  
}

export async function getExhibitionBySlug(db: any, slug: string): Promise\<Exhibition | null\> {  
  const result \= await db.prepare('SELECT \* FROM exhibitions WHERE slug \= ?').bind(slug).first\<Exhibition\>();  
  return result;  
}

export async function createExhibition(db: any, input: ExhibitionInput): Promise\<Exhibition\> {  
  const id \= \`exh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}\`;  
  const now \= Math.floor(Date.now() / 1000);  
  await db  
    .prepare(  
      \`INSERT INTO exhibitions (id, user\_id, title, slug, description, curator\_name, start\_date, end\_date, is\_published, password\_hash, cover\_image\_url, settings\_json, created\_at)  
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`  
    )  
    .bind(  
      id,  
      input.user\_id,  
      input.title,  
      input.slug,  
      input.description || '',  
      input.curator\_name || '',  
      input.start\_date || null,  
      input.end\_date || null,  
      input.is\_published ?? 0,  
      input.password\_hash || null,  
      input.cover\_image\_url || null,  
      input.settings\_json || null,  
      now  
    )  
    .run();

  return (await getExhibitionBySlug(db, input.slug))\!;  
}

> * \[ \] **Step 4: Run test to verify it passes**

Run: npx vitest run tests/unit/db.test.ts  
Expected: PASS

> * \[ \] **Step 5: Commit**

Bash  
git add src/types/schema.ts migrations/0001\_initial\_schema.sql src/lib/db.ts tests/unit/db.test.ts  
git commit \-m "feat(db): add D1 schema migrations, core domain types and DB helpers"

### **Task 2: Google Drive Media Engine, YouTube Parser & Cloudflare Media Proxy**

**Files:**

> * Create: src/lib/media/gdrive.ts  
> * Create: src/lib/media/youtube.ts  
> * Create: src/app/api/media/proxy/\[fileId\]/route.ts  
> * Test: tests/unit/gdrive.test.ts  
> * Test: tests/unit/youtube.test.ts

**Interfaces:**

> * Produces: extractGoogleDriveFileId(url), getGoogleDriveImageUrl(fileId, sizeTier), parseYouTubeVideoId(url), /api/media/proxy/\[fileId\] route handler with edge caching and Range request support.  
> * \[ \] **Step 1: Write failing tests**

TypeScript  
// tests/unit/gdrive.test.ts  
import { describe, it, expect } from 'vitest';  
import { extractGoogleDriveFileId, getGoogleDriveImageUrl } from '../../src/lib/media/gdrive';

describe('Google Drive URL Resolver', () \=\> {  
  it('extracts file ID from various sharing formats', () \=\> {  
    const urls \= \[  
      'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view?usp=sharing',  
      'https://drive.google.com/open?id=1A2B3C4D5E6F7G8H9I0J',  
      'https://drive.google.com/uc?id=1A2B3C4D5E6F7G8H9I0J\&export=download',  
      '1A2B3C4D5E6F7G8H9I0J',  
    \];  
    for (const url of urls) {  
      expect(extractGoogleDriveFileId(url)).toBe('1A2B3C4D5E6F7G8H9I0J');  
    }  
  });

  it('generates correct multi-tier image CDN URLs', () \=\> {  
    const fileId \= '1A2B3C4D5E6F7G8H9I0J';  
    expect(getGoogleDriveImageUrl(fileId, 'gallery')).toBe('https://lh3.googleusercontent.com/d/1A2B3C4D5E6F7G8H9I0J=w1600');  
    expect(getGoogleDriveImageUrl(fileId, 'original')).toBe('https://lh3.googleusercontent.com/d/1A2B3C4D5E6F7G8H9I0J=s0');  
  });  
});

TypeScript  
// tests/unit/youtube.test.ts  
import { describe, it, expect } from 'vitest';  
import { parseYouTubeVideoId } from '../../src/lib/media/youtube';

describe('YouTube URL Parser', () \=\> {  
  it('extracts YouTube video ID from links', () \=\> {  
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');  
    expect(parseYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');  
    expect(parseYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');  
    expect(parseYouTubeVideoId('https://invalid.com')).toBeNull();  
  });  
});

> * \[ \] **Step 2: Run tests to verify they fail**

Run: npx vitest run tests/unit/gdrive.test.ts tests/unit/youtube.test.ts  
Expected: FAIL with missing module errors.

> * \[ \] **Step 3: Implement Google Drive & YouTube resolvers \+ Cloudflare Edge Proxy**

TypeScript  
// src/lib/media/gdrive.ts  
export type ImageSizeTier \= 'gallery' | 'original' | 'thumbnail';

export function extractGoogleDriveFileId(input: string): string | null {  
  if (\!input) return null;  
  const trimmed \= input.trim();  
  if (/^\[a-zA-Z0-9\_-\]{25,}$/.test(trimmed)) {  
    return trimmed;  
  }  
  const fileDMatch \= trimmed.match(/\\/file\\/d\\/(\[a-zA-Z0-9\_-\]+)/);  
  if (fileDMatch) return fileDMatch\[1\];

  const idParamMatch \= trimmed.match(/\[?&\]id=(\[a-zA-Z0-9\_-\]+)/);  
  if (idParamMatch) return idParamMatch\[1\];

  return null;  
}

export function getGoogleDriveImageUrl(fileId: string, tier: ImageSizeTier \= 'gallery'): string {  
  switch (tier) {  
    case 'thumbnail':  
      return \`https://lh3.googleusercontent.com/d/${fileId}=w400\`;  
    case 'gallery':  
      return \`https://lh3.googleusercontent.com/d/${fileId}=w1600\`;  
    case 'original':  
      return \`https://lh3.googleusercontent.com/d/${fileId}=s0\`;  
  }  
}

TypeScript  
// src/lib/media/youtube.ts  
export function parseYouTubeVideoId(input: string): string | null {  
  if (\!input) return null;  
  const trimmed \= input.trim();  
  if (/^\[a-zA-Z0-9\_-\]{11}$/.test(trimmed)) {  
    return trimmed;  
  }  
  const match \= trimmed.match(/(?:youtu\\.be\\/|youtube\\.com\\/(?:embed\\/|v\\/|watch\\?v=|watch\\?.+\&v=))(\[\\w-\]{11})/);  
  return match ? match\[1\] : null;  
}

TypeScript  
// src/app/api/media/proxy/\[fileId\]/route.ts  
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { fileId: string } }) {  
  const fileId \= params.fileId;  
  if (\!fileId || \!/^\[a-zA-Z0-9\_-\]+$/.test(fileId)) {  
    return new NextResponse('Invalid file ID', { status: 400 });  
  }

  const driveDownloadUrl \= \`https://drive.google.com/uc?export=download\&id=${fileId}\`;  
  const range \= req.headers.get('range');

  const headers: HeadersInit \= {};  
  if (range) {  
    headers\['Range'\] \= range;  
  }

  const upstreamResponse \= await fetch(driveDownloadUrl, { headers });  
  if (\!upstreamResponse.ok && upstreamResponse.status \!== 206\) {  
    return new NextResponse('Failed to fetch upstream media', { status: upstreamResponse.status });  
  }

  const responseHeaders \= new Headers(upstreamResponse.headers);  
  responseHeaders.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');  
  responseHeaders.set('Access-Control-Allow-Origin', '\*');

  return new NextResponse(upstreamResponse.body, {  
    status: upstreamResponse.status,  
    headers: responseHeaders,  
  });  
}

> * \[ \] **Step 4: Run tests to verify they pass**

Run: npx vitest run tests/unit/gdrive.test.ts tests/unit/youtube.test.ts  
Expected: PASS

> * \[ \] **Step 5: Commit**

Bash  
git add src/lib/media/gdrive.ts src/lib/media/youtube.ts src/app/api/media/proxy/\[fileId\]/route.ts tests/unit/gdrive.test.ts tests/unit/youtube.test.ts  
git commit \-m "feat(media): add Google Drive CDN resolver, YouTube parser and Cloudflare media proxy"

### **Task 3: Babylon.js Core Engine & 3-Tier Resolution Scaler**

**Files:**

> * Create: src/lib/babylon/resolution-scaler.ts  
> * Create: src/lib/babylon/engine-lifecycle.ts  
> * Test: tests/unit/resolution-scaler.test.ts

**Interfaces:**

> * Produces: ResolutionScaler class managing setTier('WALK' | 'FOCUS' | 'POPUP'), initBabylonScene(canvas).  
> * \[ \] **Step 1: Write failing test**

TypeScript  
// tests/unit/resolution-scaler.test.ts  
import { describe, it, expect, vi } from 'vitest';  
import { ResolutionScaler } from '../../src/lib/babylon/resolution-scaler';

describe('Resolution Scaler', () \=\> {  
  it('sets correct hardware scaling for each tier', () \=\> {  
    const mockEngine \= {  
      setHardwareScalingLevel: vi.fn(),  
      getHardwareScalingLevel: vi.fn().mockReturnValue(1.33),  
    };

    const scaler \= new ResolutionScaler(mockEngine as any);  
      
    // Tier 1: Roaming Walk (75% resolution)  
    scaler.setTier('WALK');  
    expect(mockEngine.setHardwareScalingLevel).toHaveBeenCalledWith(1 / 0.75);

    // Tier 2: Artwork Wall Focus (90% resolution)  
    scaler.setTier('FOCUS');  
    expect(mockEngine.setHardwareScalingLevel).toHaveBeenCalledWith(1 / 0.9);

    // Tier 3: Pop-up Lightbox Inspection (100% resolution)  
    scaler.setTier('POPUP');  
    expect(mockEngine.setHardwareScalingLevel).toHaveBeenCalledWith(1.0);  
  });  
});

> * \[ \] **Step 2: Run test to verify it fails**

Run: npx vitest run tests/unit/resolution-scaler.test.ts  
Expected: FAIL

> * \[ \] **Step 3: Implement Resolution Scaler & Engine Lifecycle**

TypeScript  
// src/lib/babylon/resolution-scaler.ts  
export type ResolutionTier \= 'WALK' | 'FOCUS' | 'POPUP';

export interface ScalerEngine {  
  setHardwareScalingLevel: (level: number) \=\> void;  
  getHardwareScalingLevel: () \=\> number;  
}

export class ResolutionScaler {  
  private currentTier: ResolutionTier \= 'WALK';

  constructor(private engine: ScalerEngine) {  
    this.setTier('WALK');  
  }

  public getTier(): ResolutionTier {  
    return this.currentTier;  
  }

  public setTier(tier: ResolutionTier): void {  
    this.currentTier \= tier;  
    switch (tier) {  
      case 'WALK':  
        // 75% resolution (1 / 0.75 ≈ 1.333)  
        this.engine.setHardwareScalingLevel(1 / 0.75);  
        break;  
      case 'FOCUS':  
        // 90% resolution (1 / 0.90 ≈ 1.111)  
        this.engine.setHardwareScalingLevel(1 / 0.9);  
        break;  
      case 'POPUP':  
        // 100% native resolution  
        this.engine.setHardwareScalingLevel(1.0);  
        break;  
    }  
  }  
}

TypeScript  
// src/lib/babylon/engine-lifecycle.ts  
import { Engine, Scene, HemisphericLight, Vector3, DefaultRenderingPipeline } from '@babylonjs/core';  
import { ResolutionScaler } from './resolution-scaler';

export interface BabylonContext {  
  engine: Engine;  
  scene: Scene;  
  scaler: ResolutionScaler;  
  pipeline: DefaultRenderingPipeline;  
  dispose: () \=\> void;  
}

export function initBabylonScene(canvas: HTMLCanvasElement): BabylonContext {  
  const engine \= new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });  
  const scene \= new Scene(engine);  
  scene.collisionsEnabled \= true;

  const ambientLight \= new HemisphericLight('ambientLight', new Vector3(0, 1, 0), scene);  
  ambientLight.intensity \= 0.65;

  const pipeline \= new DefaultRenderingPipeline('defaultPipeline', true, scene);  
  pipeline.samples \= 2;  
  pipeline.fxaaEnabled \= true;

  const scaler \= new ResolutionScaler(engine);

  engine.runRenderLoop(() \=\> {  
    scene.render();  
  });

  const handleResize \= () \=\> {  
    engine.resize();  
  };  
  window.addEventListener('resize', handleResize);

  return {  
    engine,  
    scene,  
    scaler,  
    pipeline,  
    dispose: () \=\> {  
      window.removeEventListener('resize', handleResize);  
      scene.dispose();  
      engine.dispose();  
    },  
  };  
}

> * \[ \] **Step 4: Run test to verify it passes**

Run: npx vitest run tests/unit/resolution-scaler.test.ts  
Expected: PASS

> * \[ \] **Step 5: Commit**

Bash  
git add src/lib/babylon/resolution-scaler.ts src/lib/babylon/engine-lifecycle.ts tests/unit/resolution-scaler.test.ts  
git commit \-m "feat(3d): implement Babylon scene lifecycle and 3-tier dynamic resolution scaler"

### **Task 4: Procedural Room Builder & Custom GLB Loader**

**Files:**

> * Create: src/lib/babylon/room-builder.ts  
> * Test: tests/unit/room-builder.test.ts

**Interfaces:**

> * Produces: buildParametricRoom(scene, layoutData), loadCustomGlbRoom(scene, glbUrl).  
> * \[ \] **Step 1: Write failing test**

TypeScript  
// tests/unit/room-builder.test.ts  
import { describe, it, expect } from 'vitest';  
import { computeWallNormal, WallSegment } from '../../src/lib/babylon/room-builder';

describe('Room Geometry Calculations', () \=\> {  
  it('computes outward normal for horizontal wall', () \=\> {  
    const wall: WallSegment \= { id: 'w1', x1: 0, z1: 0, x2: 10, z2: 0, height: 3.5, thickness: 0.2 };  
    const normal \= computeWallNormal(wall);  
    expect(normal.x).toBeCloseTo(0);  
    expect(normal.z).toBeCloseTo(1);  
  });

  it('computes outward normal for vertical wall', () \=\> {  
    const wall: WallSegment \= { id: 'w2', x1: 0, z1: 0, x2: 0, z2: 10, height: 3.5, thickness: 0.2 };  
    const normal \= computeWallNormal(wall);  
    expect(normal.x).toBeCloseTo(-1);  
    expect(normal.z).toBeCloseTo(0);  
  });  
});

> * \[ \] **Step 2: Run test to verify it fails**

Run: npx vitest run tests/unit/room-builder.test.ts  
Expected: FAIL

> * \[ \] **Step 3: Implement Room Builder logic**

TypeScript  
// src/lib/babylon/room-builder.ts  
import { Scene, MeshBuilder, StandardMaterial, Color3, PBRMaterial, Mesh, Vector3, SceneLoader } from '@babylonjs/core';  
import '@babylonjs/loaders/glTF';  
import { ParametricRoomData, WallSegment } from '../../types/schema';

export { WallSegment };

export function computeWallNormal(wall: WallSegment): { x: number; z: number } {  
  const dx \= wall.x2 \- wall.x1;  
  const dz \= wall.z2 \- wall.z1;  
  const length \= Math.sqrt(dx \* dx \+ dz \* dz);  
  if (length \=== 0\) return { x: 0, z: 1 };  
  return { x: \-dz / length, z: dx / length };  
}

export function buildParametricRoom(scene: Scene, data: ParametricRoomData): Mesh\[\] {  
  const meshes: Mesh\[\] \= \[\];

  // Calculate room boundaries  
  let minX \= Infinity, maxX \= \-Infinity, minZ \= Infinity, maxZ \= \-Infinity;  
  for (const w of data.walls) {  
    minX \= Math.min(minX, w.x1, w.x2);  
    maxX \= Math.max(maxX, w.x1, w.x2);  
    minZ \= Math.min(minZ, w.z1, w.z2);  
    maxZ \= Math.max(maxZ, w.z1, w.z2);  
  }

  const floorWidth \= Math.max(maxX \- minX \+ 2, 10);  
  const floorDepth \= Math.max(maxZ \- minZ \+ 2, 10);  
  const centerX \= (minX \+ maxX) / 2;  
  const centerZ \= (minZ \+ maxZ) / 2;

  // Floor  
  const floor \= MeshBuilder.CreateGround('galleryFloor', { width: floorWidth, height: floorDepth }, scene);  
  floor.position \= new Vector3(centerX, 0, centerZ);  
  floor.checkCollisions \= true;  
  floor.receiveShadows \= true;

  const floorMat \= new PBRMaterial('floorMat', scene);  
  floorMat.roughness \= data.floorMaterial.roughness ?? 0.3;  
  floorMat.albedoColor \= Color3.FromHexString(data.floorMaterial.color || '\#EAEAEA');  
  floor.material \= floorMat;  
  meshes.push(floor);

  // Ceiling  
  const ceiling \= MeshBuilder.CreatePlane('galleryCeiling', { width: floorWidth, height: floorDepth }, scene);  
  ceiling.position \= new Vector3(centerX, 3.8, centerZ);  
  ceiling.rotation.x \= Math.PI / 2;  
  const ceilingMat \= new StandardMaterial('ceilingMat', scene);  
  ceilingMat.diffuseColor \= Color3.FromHexString(data.ceilingMaterial?.color || '\#F5F5F5');  
  ceiling.material \= ceilingMat;  
  meshes.push(ceiling);

  // Walls  
  const wallMat \= new PBRMaterial('wallMat', scene);  
  wallMat.roughness \= data.wallMaterial.roughness ?? 0.85;  
  wallMat.albedoColor \= Color3.FromHexString(data.wallMaterial.color || '\#FFFFFF');

  for (const wall of data.walls) {  
    const dx \= wall.x2 \- wall.x1;  
    const dz \= wall.z2 \- wall.z1;  
    const length \= Math.sqrt(dx \* dx \+ dz \* dz);  
    const angle \= Math.atan2(dz, dx);

    const wallMesh \= MeshBuilder.CreateBox(\`wall\_${wall.id}\`, {  
      width: length,  
      height: wall.height || 3.8,  
      depth: wall.thickness || 0.2,  
    }, scene);

    wallMesh.position \= new Vector3((wall.x1 \+ wall.x2) / 2, (wall.height || 3.8) / 2, (wall.z1 \+ wall.z2) / 2);  
    wallMesh.rotation.y \= \-angle;  
    wallMesh.checkCollisions \= true;  
    wallMesh.material \= wallMat;  
    meshes.push(wallMesh);  
  }

  return meshes;  
}

export async function loadCustomGlbRoom(scene: Scene, glbUrl: string): Promise\<Mesh\[\]\> {  
  await SceneLoader.AppendAsync('', glbUrl, scene);  
  const floorMeshes: Mesh\[\] \= \[\];  
  scene.meshes.forEach((mesh) \=\> {  
    mesh.checkCollisions \= true;  
    if (mesh.name.toLowerCase().includes('floor') || mesh.name.toLowerCase().includes('ground')) {  
      floorMeshes.push(mesh as Mesh);  
    }  
  });  
  return floorMeshes;  
}

> * \[ \] **Step 4: Run test to verify it passes**

Run: npx vitest run tests/unit/room-builder.test.ts  
Expected: PASS

> * \[ \] **Step 5: Commit**

Bash  
git add src/lib/babylon/room-builder.ts tests/unit/room-builder.test.ts  
git commit \-m "feat(3d): implement parametric room geometry builder and custom glb room loader"

### **Task 5: Artwork Presentation, Procedural Frames, Video Screens & Sculptures**

**Files:**

> * Create: src/lib/babylon/artwork-factory.ts  
> * Create: src/lib/babylon/frame-builder.ts  
> * Test: tests/unit/artwork-factory.test.ts

**Interfaces:**

> * Produces: createArtworkMesh(scene, artwork), createProceduralFrame(scene, width, height, config).  
> * \[ \] **Step 1: Write failing test**

TypeScript  
// tests/unit/artwork-factory.test.ts  
import { describe, it, expect } from 'vitest';  
import { calculateFrameDimensions } from '../../src/lib/babylon/frame-builder';

describe('Artwork Frame Dimensions', () \=\> {  
  it('calculates outer dimensions with frame and matting', () \=\> {  
    const artWidth \= 1.2;  
    const artHeight \= 0.8;  
    const frameWidth \= 0.05;  
    const matWidth \= 0.08;

    const outer \= calculateFrameDimensions(artWidth, artHeight, frameWidth, matWidth);  
    expect(outer.totalWidth).toBeCloseTo(1.2 \+ (0.05 \+ 0.08) \* 2);  
    expect(outer.totalHeight).toBeCloseTo(0.8 \+ (0.05 \+ 0.08) \* 2);  
  });  
});

> * \[ \] **Step 2: Run test to verify it fails**

Run: npx vitest run tests/unit/artwork-factory.test.ts  
Expected: FAIL

> * \[ \] **Step 3: Implement Frame Builder & Artwork Factory**

TypeScript  
// src/lib/babylon/frame-builder.ts  
import { Scene, MeshBuilder, StandardMaterial, Color3, PBRMaterial, Mesh } from '@babylonjs/core';  
import { FrameConfig } from '../../types/schema';

export function calculateFrameDimensions(artWidth: number, artHeight: number, frameWidth: number, matWidth: number) {  
  return {  
    totalWidth: artWidth \+ (frameWidth \+ matWidth) \* 2,  
    totalHeight: artHeight \+ (frameWidth \+ matWidth) \* 2,  
  };  
}

export function createProceduralFrame(  
  scene: Scene,  
  artWidth: number,  
  artHeight: number,  
  config: FrameConfig  
): Mesh {  
  const { totalWidth, totalHeight } \= calculateFrameDimensions(artWidth, artHeight, config.frameWidth, config.matWidth);  
  const frameRoot \= new Mesh('frameRoot', scene);

  if (config.frameType \!== 'canvas\_wrap' && config.frameType \!== 'none') {  
    const frameMesh \= MeshBuilder.CreateBox('frameMolding', {  
      width: totalWidth,  
      height: totalHeight,  
      depth: 0.04,  
    }, scene);

    const frameMat \= new PBRMaterial('frameMat', scene);  
    if (config.frameType \=== 'wood') {  
      frameMat.albedoColor \= Color3.FromHexString('\#3D2314');  
      frameMat.roughness \= 0.6;  
    } else if (config.frameType \=== 'metal\_black') {  
      frameMat.albedoColor \= Color3.FromHexString('\#151515');  
      frameMat.metallic \= 0.8;  
      frameMat.roughness \= 0.2;  
    } else if (config.frameType \=== 'float\_white') {  
      frameMat.albedoColor \= Color3.FromHexString('\#FAFAFA');  
      frameMat.roughness \= 0.9;  
    }  
    frameMesh.material \= frameMat;  
    frameMesh.position.z \= \-0.01;  
    frameMesh.parent \= frameRoot;  
  }

  // Matting (passe-partout)  
  if (config.matWidth \> 0\) {  
    const matMesh \= MeshBuilder.CreatePlane('matting', {  
      width: artWidth \+ config.matWidth \* 2,  
      height: artHeight \+ config.matWidth \* 2,  
    }, scene);  
    const matMaterial \= new StandardMaterial('matMat', scene);  
    matMaterial.diffuseColor \= Color3.FromHexString(config.matColor || '\#FFFFFF');  
    matMesh.material \= matMaterial;  
    matMesh.position.z \= \-0.015;  
    matMesh.parent \= frameRoot;  
  }

  return frameRoot;  
}

TypeScript  
// src/lib/babylon/artwork-factory.ts  
import { Scene, MeshBuilder, StandardMaterial, Texture, SpotLight, Vector3, Mesh, DynamicTexture } from '@babylonjs/core';  
import { Artwork, FrameConfig, Transform3D } from '../../types/schema';  
import { createProceduralFrame } from './frame-builder';  
import { getGoogleDriveImageUrl } from '../media/gdrive';

export function createArtworkMesh(scene: Scene, artwork: Artwork): Mesh {  
  const transform: Transform3D \= JSON.parse(artwork.transform\_json);  
  const frameConfig: FrameConfig \= JSON.parse(artwork.frame\_config\_json);

  const rootMesh \= new Mesh(\`artwork\_${artwork.id}\`, scene);  
  rootMesh.position \= new Vector3(...transform.position);  
  rootMesh.rotation \= new Vector3(...transform.rotation);  
  rootMesh.scaling \= new Vector3(...transform.scale);  
  rootMesh.metadata \= { artworkId: artwork.id, artwork };

  const artWidth \= 1.2;  
  const artHeight \= 0.8;

  // 2D Image Canvas  
  const artPlane \= MeshBuilder.CreatePlane(\`artPlane\_${artwork.id}\`, { width: artWidth, height: artHeight }, scene);  
  artPlane.position.z \= \-0.02;  
  artPlane.parent \= rootMesh;

  const artMat \= new StandardMaterial(\`artMat\_${artwork.id}\`, scene);  
  if (artwork.media\_file\_id) {  
    const textureUrl \= getGoogleDriveImageUrl(artwork.media\_file\_id, 'gallery');  
    artMat.diffuseTexture \= new Texture(textureUrl, scene);  
  }  
  artPlane.material \= artMat;

  // Procedural Frame  
  const frame \= createProceduralFrame(scene, artWidth, artHeight, frameConfig);  
  frame.parent \= rootMesh;

  // Dedicated Spotlight  
  const spot \= new SpotLight(  
    \`spot\_${artwork.id}\`,  
    new Vector3(0, 1.2, \-1.0),  
    new Vector3(0, \-0.8, 1.0),  
    Math.PI / 3,  
    2,  
    scene  
  );  
  spot.intensity \= 1.2;  
  spot.parent \= rootMesh;

  // Wall Placard  
  if (frameConfig.showPlacard) {  
    const placard \= MeshBuilder.CreatePlane(\`placard\_${artwork.id}\`, { width: 0.25, height: 0.15 }, scene);  
    placard.position \= new Vector3(artWidth / 2 \+ 0.22, \-artHeight / 2 \+ 0.05, \-0.01);  
    placard.parent \= rootMesh;

    const placardTex \= new DynamicTexture(\`placardTex\_${artwork.id}\`, { width: 512, height: 256 }, scene);  
    placardTex.drawText(artwork.title, 20, 60, 'bold 32px sans-serif', '\#000000', '\#F8F8F8', true);  
    placardTex.drawText(artwork.artist, 20, 110, '24px sans-serif', '\#444444', null, true);  
    placardTex.drawText(artwork.medium || '', 20, 150, 'italic 20px sans-serif', '\#666666', null, true);

    const placardMat \= new StandardMaterial(\`placardMat\_${artwork.id}\`, scene);  
    placardMat.diffuseTexture \= placardTex;  
    placard.material \= placardMat;  
  }

  return rootMesh;  
}

> * \[ \] **Step 4: Run test to verify it passes**

Run: npx vitest run tests/unit/artwork-factory.test.ts  
Expected: PASS

> * \[ \] **Step 5: Commit**

Bash  
git add src/lib/babylon/frame-builder.ts src/lib/babylon/artwork-factory.ts tests/unit/artwork-factory.test.ts  
git commit \-m "feat(3d): implement procedural frame generation, artwork factory and museum spotlights"

### **Task 6: Smart Hybrid Camera Controller & Navigation**

**Files:**

> * Create: src/lib/babylon/camera-controller.ts  
> * Create: src/components/viewer/NavigationControls.tsx  
> * Test: tests/unit/camera-controller.test.ts

**Interfaces:**

> * Produces: CameraController with setMode('DRAG' | 'FPS'), teleportTo(x, z), focusOnArtwork(artworkMesh).  
> * \[ \] **Step 1: Write failing test**

TypeScript  
// tests/unit/camera-controller.test.ts  
import { describe, it, expect } from 'vitest';  
import { calculateFocusPosition } from '../../src/lib/babylon/camera-controller';

describe('Camera Focus Vector Calculations', () \=\> {  
  it('calculates camera focus point directly in front of artwork normal', () \=\> {  
    const artPos \= { x: 5, y: 1.5, z: 10 };  
    const artRotY \= 0; // facing \+Z  
    const viewDistance \= 1.8;

    const target \= calculateFocusPosition(artPos, artRotY, viewDistance);  
    expect(target.x).toBeCloseTo(5);  
    expect(target.y).toBeCloseTo(1.5);  
    expect(target.z).toBeCloseTo(10 \- viewDistance);  
  });  
});

> * \[ \] **Step 2: Run test to verify it fails**

Run: npx vitest run tests/unit/camera-controller.test.ts  
Expected: FAIL

> * \[ \] **Step 3: Implement Camera Controller with Smart Hybrid Modes**

TypeScript  
// src/lib/babylon/camera-controller.ts  
import { UniversalCamera, Scene, Vector3, Animation, Mesh } from '@babylonjs/core';

export type ControlMode \= 'DRAG' | 'FPS' | 'MOBILE';

export function calculateFocusPosition(  
  artPos: { x: number; y: number; z: number },  
  rotY: number,  
  viewDistance: number \= 1.8  
): { x: number; y: number; z: number } {  
  return {  
    x: artPos.x \- Math.sin(rotY) \* viewDistance,  
    y: artPos.y,  
    z: artPos.z \- Math.cos(rotY) \* viewDistance,  
  };  
}

export class CameraController {  
  public camera: UniversalCamera;  
  private mode: ControlMode \= 'DRAG';

  constructor(private scene: Scene, canvas: HTMLCanvasElement) {  
    this.camera \= new UniversalCamera('playerCamera', new Vector3(0, 1.7, 0), scene);  
    this.camera.setTarget(new Vector3(0, 1.7, 5));  
    this.camera.ellipsoid \= new Vector3(0.5, 0.9, 0.5);  
    this.camera.checkCollisions \= true;  
    this.camera.applyGravity \= true;

    this.camera.attachControl(canvas, true);  
    this.setupKeyBindings();  
  }

  private setupKeyBindings() {  
    this.camera.keysUp \= \[87, 38\]; // W, Up  
    this.camera.keysDown \= \[83, 40\]; // S, Down  
    this.camera.keysLeft \= \[65, 37\]; // A, Left  
    this.camera.keysRight \= \[68, 39\]; // D, Right  
    this.camera.speed \= 0.25;  
  }

  public setMode(mode: ControlMode): void {  
    this.mode \= mode;  
    const engine \= this.scene.getEngine();  
    if (mode \=== 'FPS') {  
      engine.enterPointerlock();  
    } else {  
      engine.exitPointerlock();  
    }  
  }

  public teleportTo(x: number, z: number): void {  
    const startPos \= this.camera.position.clone();  
    const endPos \= new Vector3(x, 1.7, z);

    Animation.CreateAndStartAnimation(  
      'teleportAnim',  
      this.camera,  
      'position',  
      60,  
      25,  
      startPos,  
      endPos,  
      Animation.ANIMATIONLOOPMODE\_CONSTANT  
    );  
  }

  public focusOnArtwork(artworkMesh: Mesh, onComplete?: () \=\> void): void {  
    const artPos \= artworkMesh.getAbsolutePosition();  
    const rotY \= artworkMesh.rotation.y;  
    const targetPos \= calculateFocusPosition(artPos, rotY, 1.8);

    const startPos \= this.camera.position.clone();  
    const endPos \= new Vector3(targetPos.x, targetPos.y, targetPos.z);

    Animation.CreateAndStartAnimation(  
      'focusPosAnim',  
      this.camera,  
      'position',  
      60,  
      35,  
      startPos,  
      endPos,  
      Animation.ANIMATIONLOOPMODE\_CONSTANT,  
      undefined,  
      onComplete  
    );

    this.camera.setTarget(artPos);  
  }  
}

> * \[ \] **Step 4: Run test to verify it passes**

Run: npx vitest run tests/unit/camera-controller.test.ts  
Expected: PASS

> * \[ \] **Step 5: Commit**

Bash  
git add src/lib/babylon/camera-controller.ts tests/unit/camera-controller.test.ts  
git commit \-m "feat(3d): implement smart hybrid camera controller with pointer lock toggle and tweened navigation"

### **Task 7: Guided Tour Sequencer & 2D SVG Mini-Map**

**Files:**

> * Create: src/lib/babylon/tour-sequencer.ts  
> * Create: src/components/viewer/MiniMap.tsx  
> * Test: tests/unit/tour-sequencer.test.ts

**Interfaces:**

> * Produces: TourSequencer class with start(), pause(), next(), prev(); \<MiniMap rooms={rooms} playerPos={pos} onTeleport={fn} /\>.  
> * \[ \] **Step 1: Write failing test**

TypeScript  
// tests/unit/tour-sequencer.test.ts  
import { describe, it, expect, vi } from 'vitest';  
import { TourSequencer } from '../../src/lib/babylon/tour-sequencer';  
import { TourWaypoint } from '../../src/types/schema';

describe('Tour Sequencer', () \=\> {  
  it('advances through waypoints sequentially', () \=\> {  
    const waypoints: TourWaypoint\[\] \= \[  
      {  
        id: 'w1',  
        exhibition\_id: 'exh-1',  
        order\_index: 0,  
        camera\_position\_json: '\[0, 1.7, 0\]',  
        camera\_target\_json: '\[0, 1.7, 5\]',  
        dwell\_time\_seconds: 5,  
      },  
      {  
        id: 'w2',  
        exhibition\_id: 'exh-1',  
        order\_index: 1,  
        camera\_position\_json: '\[5, 1.7, 0\]',  
        camera\_target\_json: '\[5, 1.7, 5\]',  
        dwell\_time\_seconds: 5,  
      },  
    \];

    const mockCam \= { teleportTo: vi.fn() };  
    const sequencer \= new TourSequencer(mockCam as any, waypoints);

    expect(sequencer.getCurrentIndex()).toBe(0);  
    sequencer.next();  
    expect(sequencer.getCurrentIndex()).toBe(1);  
    expect(mockCam.teleportTo).toHaveBeenCalledWith(5, 0);  
  });  
});

> * \[ \] **Step 2: Run test to verify it fails**

Run: npx vitest run tests/unit/tour-sequencer.test.ts  
Expected: FAIL

> * \[ \] **Step 3: Implement Tour Sequencer and MiniMap Component**

TypeScript  
// src/lib/babylon/tour-sequencer.ts  
import { TourWaypoint } from '../../types/schema';

export interface TourCamera {  
  teleportTo: (x: number, z: number) \=\> void;  
}

export class TourSequencer {  
  private currentIndex: number \= 0;  
  private isPlaying: boolean \= false;  
  private timer: any \= null;

  constructor(  
    private camera: TourCamera,  
    private waypoints: TourWaypoint\[\],  
    private onWaypointChange?: (wp: TourWaypoint) \=\> void  
  ) {}

  public getCurrentIndex(): number {  
    return this.currentIndex;  
  }

  public start(): void {  
    this.isPlaying \= true;  
    this.goToWaypoint(this.currentIndex);  
  }

  public pause(): void {  
    this.isPlaying \= false;  
    if (this.timer) clearTimeout(this.timer);  
  }

  public next(): void {  
    if (this.currentIndex \< this.waypoints.length \- 1\) {  
      this.goToWaypoint(this.currentIndex \+ 1);  
    }  
  }

  public prev(): void {  
    if (this.currentIndex \> 0\) {  
      this.goToWaypoint(this.currentIndex \- 1);  
    }  
  }

  private goToWaypoint(index: number): void {  
    if (index \< 0 || index \>= this.waypoints.length) return;  
    this.currentIndex \= index;  
    const wp \= this.waypoints\[index\];  
    const pos: \[number, number, number\] \= JSON.parse(wp.camera\_position\_json);

    this.camera.teleportTo(pos\[0\], pos\[2\]);  
    this.onWaypointChange?.(wp);

    if (this.isPlaying) {  
      if (this.timer) clearTimeout(this.timer);  
      this.timer \= setTimeout(() \=\> {  
        if (this.currentIndex \< this.waypoints.length \- 1\) {  
          this.next();  
        } else {  
          this.isPlaying \= false;  
        }  
      }, (wp.dwell\_time\_seconds || 8\) \* 1000);  
    }  
  }  
}

TypeScript  
// src/components/viewer/MiniMap.tsx  
import React from 'react';  
import { Room } from '../../types/schema';

interface MiniMapProps {  
  rooms: Room\[\];  
  playerPos: { x: number; z: number; angle: number };  
  onTeleport: (x: number, z: number) \=\> void;  
}

export const MiniMap: React.FC\<MiniMapProps\> \= ({ rooms, playerPos, onTeleport }) \=\> {  
  const mapScale \= 12; // pixels per meter  
  const mapOffset \= 100;

  return (  
    \<div className="absolute top-4 right-4 w-52 h-52 bg-black/60 backdrop-blur-md rounded-xl border border-white/20 p-2 shadow-2xl z-30"\>  
      \<svg  
        className="w-full h-full cursor-crosshair"  
        onClick={(e) \=\> {  
          const rect \= e.currentTarget.getBoundingClientRect();  
          const clickX \= e.clientX \- rect.left;  
          const clickY \= e.clientY \- rect.top;  
          const worldX \= (clickX \- mapOffset) / mapScale;  
          const worldZ \= (clickY \- mapOffset) / mapScale;  
          onTeleport(worldX, worldZ);  
        }}  
      \>  
        {/\* Draw walls \*/}  
        {rooms.map((room) \=\> {  
          if (\!room.parametric\_layout) return null;  
          const layout \= JSON.parse(room.parametric\_layout);  
          return layout.walls?.map((w: any) \=\> (  
            \<line  
              key={w.id}  
              x1={w.x1 \* mapScale \+ mapOffset}  
              y1={w.z1 \* mapScale \+ mapOffset}  
              x2={w.x2 \* mapScale \+ mapOffset}  
              y2={w.z2 \* mapScale \+ mapOffset}  
              stroke="rgba(255,255,255,0.7)"  
              strokeWidth="3"  
            /\>  
          ));  
        })}

        {/\* Visitor Location & View Cone \*/}  
        \<g  
          transform={\`translate(${playerPos.x \* mapScale \+ mapOffset}, ${  
            playerPos.z \* mapScale \+ mapOffset  
          }) rotate(${(playerPos.angle \* 180\) / Math.PI})\`}  
        \>  
          \<path d="M 0 0 L \-12 \-24 L 12 \-24 Z" fill="rgba(59, 130, 246, 0.4)" /\>  
          \<circle cx="0" cy="0" r="5" fill="\#3B82F6" stroke="\#FFFFFF" strokeWidth="1.5" /\>  
        \</g\>  
      \</svg\>  
    \</div\>  
  );  
};

> * \[ \] **Step 4: Run test to verify it passes**

Run: npx vitest run tests/unit/tour-sequencer.test.ts  
Expected: PASS

> * \[ \] **Step 5: Commit**

Bash  
git add src/lib/babylon/tour-sequencer.ts src/components/viewer/MiniMap.tsx tests/unit/tour-sequencer.test.ts  
git commit \-m "feat(viewer): implement tour sequencer and interactive 2D SVG mini-map"

### **Task 8: Artwork Focus, Pop-up Deep Zoom Lightbox & Interactive Hotspots**

**Files:**

> * Create: src/components/viewer/ArtworkFocusModal.tsx  
> * Create: src/components/viewer/HotspotOverlay.tsx  
> * Test: tests/unit/focus-modal.test.ts

**Interfaces:**

> * Produces: \<ArtworkFocusModal artwork={art} hotspots={hotspots} onClose={fn} /\> with backdrop blur, \=s0 max-res image loader, and audio timeline jumping.  
> * \[ \] **Step 1: Write failing test**

TypeScript  
// tests/unit/focus-modal.test.ts  
import { describe, it, expect } from 'vitest';  
import { getGoogleDriveImageUrl } from '../../src/lib/media/gdrive';

describe('Pop-up Max Resolution Image Loading', () \=\> {  
  it('requests original \=s0 image URL when pop-up is activated', () \=\> {  
    const fileId \= 'img-12345';  
    const popupUrl \= getGoogleDriveImageUrl(fileId, 'original');  
    expect(popupUrl).toBe('https://lh3.googleusercontent.com/d/img-12345=s0');  
  });  
});

> * \[ \] **Step 2: Run test to verify it passes**

Run: npx vitest run tests/unit/focus-modal.test.ts  
Expected: PASS

> * \[ \] **Step 3: Implement Focus Modal and Hotspot Overlay Components**

TypeScript  
// src/components/viewer/HotspotOverlay.tsx  
import React, { useState } from 'react';  
import { ArtworkHotspot } from '../../types/schema';

interface HotspotOverlayProps {  
  hotspots: ArtworkHotspot\[\];  
  onSelectTimestamp?: (seconds: number) \=\> void;  
}

export const HotspotOverlay: React.FC\<HotspotOverlayProps\> \= ({ hotspots, onSelectTimestamp }) \=\> {  
  const \[activeHotspot, setActiveHotspot\] \= useState\<ArtworkHotspot | null\>(null);

  return (  
    \<div className="absolute inset-0 pointer-events-none"\>  
      {hotspots.map((hs) \=\> (  
        \<div  
          key={hs.id}  
          className="absolute pointer-events-auto transform \-translate-x-1/2 \-translate-y-1/2 cursor-pointer"  
          style={{ left: \`${hs.x\_percent}%\`, top: \`${hs.y\_percent}%\` }}  
          onClick={() \=\> {  
            setActiveHotspot(hs);  
            if (hs.audio\_timestamp\_seconds && onSelectTimestamp) {  
              onSelectTimestamp(hs.audio\_timestamp\_seconds);  
            }  
          }}  
        \>  
          \<div className="relative flex items-center justify-center"\>  
            \<span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-blue-400 opacity-75"\>\</span\>  
            \<span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-md"\>\</span\>  
          \</div\>

          {activeHotspot?.id \=== hs.id && (  
            \<div className="absolute left-6 top-0 w-64 bg-black/90 text-white p-3 rounded-lg shadow-2xl border border-white/20 z-50 text-xs"\>  
              \<p className="font-bold text-sm text-blue-300 mb-1"\>{hs.title}\</p\>  
              \<p className="text-gray-200"\>{hs.description}\</p\>  
            \</div\>  
          )}  
        \</div\>  
      ))}  
    \</div\>  
  );  
};

TypeScript  
// src/components/viewer/ArtworkFocusModal.tsx  
import React from 'react';  
import { Artwork, ArtworkHotspot } from '../../types/schema';  
import { getGoogleDriveImageUrl } from '../../lib/media/gdrive';  
import { HotspotOverlay } from './HotspotOverlay';  
import { X, Volume2 } from 'lucide-react';

interface ArtworkFocusModalProps {  
  artwork: Artwork;  
  hotspots: ArtworkHotspot\[\];  
  onClose: () \=\> void;  
}

export const ArtworkFocusModal: React.FC\<ArtworkFocusModalProps\> \= ({ artwork, hotspots, onClose }) \=\> {  
  const originalImageUrl \= artwork.media\_file\_id  
    ? getGoogleDriveImageUrl(artwork.media\_file\_id, 'original')  
    : artwork.media\_url;

  return (  
    \<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300"\>  
      \<button  
        onClick={onClose}  
        className="absolute top-6 right-6 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition"  
      \>  
        \<X size={24} /\>  
      \</button\>

      \<div className="flex flex-col lg:flex-row max-w-6xl w-full max-h-\[90vh\] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10"\>  
        {/\* High-Res Image Container with Hotspots \*/}  
        \<div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-\[400px\]"\>  
          \<img  
            src={originalImageUrl}  
            alt={artwork.title}  
            className="max-h-\[85vh\] max-w-full object-contain select-none"  
          /\>  
          \<HotspotOverlay hotspots={hotspots} /\>  
        \</div\>

        {/\* Artwork Curatorial Info & Audio Guide \*/}  
        \<div className="w-full lg:w-96 p-6 flex flex-col justify-between overflow-y-auto bg-neutral-900/90 text-white"\>  
          \<div\>  
            \<span className="text-xs uppercase tracking-widest text-blue-400 font-semibold"\>{artwork.medium}\</span\>  
            \<h2 className="text-2xl font-bold mt-1 text-white"\>{artwork.title}\</h2\>  
            \<p className="text-sm text-gray-400 mt-0.5"\>  
              {artwork.artist} {artwork.year ? \`(${artwork.year})\` : ''}  
            \</p\>  
            {artwork.dimensions && \<p className="text-xs text-gray-500 mt-1"\>{artwork.dimensions}\</p\>}

            \<hr className="my-4 border-white/10" /\>

            \<p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line"\>{artwork.description}\</p\>  
          \</div\>

          {artwork.audio\_guide\_url && (  
            \<div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3"\>  
              \<Volume2 className="text-blue-400" size={20} /\>  
              \<audio controls className="w-full h-8" src={artwork.audio\_guide\_url} /\>  
            \</div\>  
          )}  
        \</div\>  
      \</div\>  
    \</div\>  
  );  
};

> * \[ \] **Step 4: Run test to verify it passes**

Run: npx vitest run tests/unit/focus-modal.test.ts  
Expected: PASS

> * \[ \] **Step 5: Commit**

Bash  
git add src/components/viewer/HotspotOverlay.tsx src/components/viewer/ArtworkFocusModal.tsx tests/unit/focus-modal.test.ts  
git commit \-m "feat(viewer): implement pop-up deep inspection lightbox, backdrop blur and interactive detail hotspots"

### **Task 9: 2D Floor Plan Editor & Reusable Room Template Library**

**Files:**

> * Create: src/components/studio/FloorPlanCanvas.tsx  
> * Test: tests/unit/floor-plan.test.ts

**Interfaces:**

> * Produces: \<FloorPlanCanvas walls={walls} onChange={setWalls} onArtworkDropped={fn} /\>.  
> * \[ \] **Step 1: Write failing test**

TypeScript  
// tests/unit/floor-plan.test.ts  
import { describe, it, expect } from 'vitest';  
import { snapToGrid } from '../../src/components/studio/FloorPlanCanvas';

describe('Floor Plan Snapping', () \=\> {  
  it('snaps coordinates to grid step', () \=\> {  
    expect(snapToGrid(1.23, 0.5)).toBeCloseTo(1.0);  
    expect(snapToGrid(1.48, 0.5)).toBeCloseTo(1.5);  
  });  
});

> * \[ \] **Step 2: Run test to verify it fails**

Run: npx vitest run tests/unit/floor-plan.test.ts  
Expected: FAIL

> * \[ \] **Step 3: Implement FloorPlanCanvas**

TypeScript  
// src/components/studio/FloorPlanCanvas.tsx  
import React, { useState } from 'react';  
import { WallSegment } from '../../types/schema';

export function snapToGrid(val: number, step: number \= 0.5): number {  
  return Math.round(val / step) \* step;  
}

interface FloorPlanCanvasProps {  
  walls: WallSegment\[\];  
  onChange: (walls: WallSegment\[\]) \=\> void;  
  onArtworkDropped?: (wallId: string, normOffset: number) \=\> void;  
}

export const FloorPlanCanvas: React.FC\<FloorPlanCanvasProps\> \= ({ walls, onChange }) \=\> {  
  const \[drawingWall, setDrawingWall\] \= useState\<{ x1: number; z1: number; x2: number; z2: number } | null\>(null);  
  const scale \= 30; // 30px per meter  
  const offset \= 200;

  const handleMouseDown \= (e: React.MouseEvent\<SVGSVGElement\>) \=\> {  
    const rect \= e.currentTarget.getBoundingClientRect();  
    const x \= snapToGrid((e.clientX \- rect.left \- offset) / scale, 0.5);  
    const z \= snapToGrid((e.clientY \- rect.top \- offset) / scale, 0.5);  
    setDrawingWall({ x1: x, z1: z, x2: x, z2: z });  
  };

  const handleMouseMove \= (e: React.MouseEvent\<SVGSVGElement\>) \=\> {  
    if (\!drawingWall) return;  
    const rect \= e.currentTarget.getBoundingClientRect();  
    const x \= snapToGrid((e.clientX \- rect.left \- offset) / scale, 0.5);  
    const z \= snapToGrid((e.clientY \- rect.top \- offset) / scale, 0.5);  
    setDrawingWall({ ...drawingWall, x2: x, z2: z });  
  };

  const handleMouseUp \= () \=\> {  
    if (\!drawingWall) return;  
    const dx \= drawingWall.x2 \- drawingWall.x1;  
    const dz \= drawingWall.z2 \- drawingWall.z1;  
    if (Math.hypot(dx, dz) \>= 0.5) {  
      const newWall: WallSegment \= {  
        id: \`wall\_${Date.now()}\`,  
        x1: drawingWall.x1,  
        z1: drawingWall.z1,  
        x2: drawingWall.x2,  
        z2: drawingWall.z2,  
        height: 3.5,  
        thickness: 0.2,  
      };  
      onChange(\[...walls, newWall\]);  
    }  
    setDrawingWall(null);  
  };

  return (  
    \<div className="relative w-full h-\[550px\] bg-neutral-950 border border-white/10 rounded-2xl overflow-hidden"\>  
      \<svg  
        className="w-full h-full cursor-crosshair select-none"  
        onMouseDown={handleMouseDown}  
        onMouseMove={handleMouseMove}  
        onMouseUp={handleMouseUp}  
      \>  
        \<defs\>  
          \<pattern id="grid" width="15" height="15" patternUnits="userSpaceOnUse"\>  
            \<path d="M 15 0 L 0 0 0 15" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" /\>  
          \</pattern\>  
        \</defs\>  
        \<rect width="100%" height="100%" fill="url(\#grid)" /\>

        {walls.map((w) \=\> (  
          \<line  
            key={w.id}  
            x1={w.x1 \* scale \+ offset}  
            y1={w.z1 \* scale \+ offset}  
            x2={w.x2 \* scale \+ offset}  
            y2={w.z2 \* scale \+ offset}  
            stroke="\#FFFFFF"  
            strokeWidth="6"  
            strokeLinecap="round"  
          /\>  
        ))}

        {drawingWall && (  
          \<line  
            x1={drawingWall.x1 \* scale \+ offset}  
            y1={drawingWall.z1 \* scale \+ offset}  
            x2={drawingWall.x2 \* scale \+ offset}  
            y2={drawingWall.z2 \* scale \+ offset}  
            stroke="\#3B82F6"  
            strokeWidth="4"  
            strokeDasharray="4 4"  
          /\>  
        )}  
      \</svg\>  
    \</div\>  
  );  
};

> * \[ \] **Step 4: Run test to verify it passes**

Run: npx vitest run tests/unit/floor-plan.test.ts  
Expected: PASS

> * \[ \] **Step 5: Commit**

Bash  
git add src/components/studio/FloorPlanCanvas.tsx tests/unit/floor-plan.test.ts  
git commit \-m "feat(studio): implement 2D architectural floor plan editor with grid snapping"

### **Task 10: Public Exhibition Page & WebGL Fallback Catalog**

**Files:**

> * Create: src/components/viewer/Fallback2DCatalog.tsx  
> * Create: src/components/viewer/ExhibitionViewer.tsx  
> * Test: tests/unit/exhibition-page.test.ts

**Interfaces:**

> * Produces: isWebGLSupported(), \<ExhibitionViewer /\>, \<Fallback2DCatalog /\>.  
> * \[ \] **Step 1: Write failing test**

TypeScript  
// tests/unit/exhibition-page.test.ts  
import { describe, it, expect } from 'vitest';  
import { isWebGLSupported } from '../../src/components/viewer/ExhibitionViewer';

describe('WebGL Capability Checker', () \=\> {  
  it('detects WebGL support function exists', () \=\> {  
    expect(typeof isWebGLSupported).toBe('function');  
  });  
});

> * \[ \] **Step 2: Run test to verify it fails**

Run: npx vitest run tests/unit/exhibition-page.test.ts  
Expected: FAIL

> * \[ \] **Step 3: Implement Fallback Catalog & Exhibition Viewer**

TypeScript  
// src/components/viewer/Fallback2DCatalog.tsx  
import React from 'react';  
import { Artwork, Exhibition } from '../../types/schema';  
import { getGoogleDriveImageUrl } from '../../lib/media/gdrive';

interface Fallback2DCatalogProps {  
  exhibition: Exhibition;  
  artworks: Artwork\[\];  
}

export const Fallback2DCatalog: React.FC\<Fallback2DCatalogProps\> \= ({ exhibition, artworks }) \=\> {  
  return (  
    \<div className="min-h-screen bg-neutral-950 text-white p-8"\>  
      \<header className="max-w-4xl mx-auto mb-12 text-center"\>  
        \<h1 className="text-4xl font-bold"\>{exhibition.title}\</h1\>  
        \<p className="text-gray-400 mt-2"\>Curated by {exhibition.curator\_name}\</p\>  
        \<p className="text-sm text-gray-300 mt-4 leading-relaxed"\>{exhibition.description}\</p\>  
      \</header\>

      \<div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"\>  
        {artworks.map((art) \=\> (  
          \<div key={art.id} className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden shadow-lg"\>  
            \<img  
              src={art.media\_file\_id ? getGoogleDriveImageUrl(art.media\_file\_id, 'gallery') : art.media\_url}  
              alt={art.title}  
              className="w-full h-64 object-cover"  
            /\>  
            \<div className="p-4"\>  
              \<h3 className="text-lg font-semibold"\>{art.title}\</h3\>  
              \<p className="text-sm text-gray-400"\>  
                {art.artist} {art.year ? \`(${art.year})\` : ''}  
              \</p\>  
              \<p className="text-xs text-gray-500 mt-1"\>{art.medium}\</p\>  
            \</div\>  
          \</div\>  
        ))}  
      \</div\>  
    \</div\>  
  );  
};

TypeScript  
// src/components/viewer/ExhibitionViewer.tsx  
'use client';

import React, { useState, useEffect, useRef } from 'react';  
import { Exhibition, Room, Artwork, TourWaypoint, ArtworkHotspot } from '../../types/schema';  
import { initBabylonScene } from '../../lib/babylon/engine-lifecycle';  
import { buildParametricRoom } from '../../lib/babylon/room-builder';  
import { createArtworkMesh } from '../../lib/babylon/artwork-factory';  
import { CameraController } from '../../lib/babylon/camera-controller';  
import { TourSequencer } from '../../lib/babylon/tour-sequencer';  
import { MiniMap } from './MiniMap';  
import { ArtworkFocusModal } from './ArtworkFocusModal';  
import { Fallback2DCatalog } from './Fallback2DCatalog';  
import { Play, Pause, Compass } from 'lucide-react';

export function isWebGLSupported(): boolean {  
  if (typeof window \=== 'undefined') return true;  
  try {  
    const canvas \= document.createElement('canvas');  
    return \!\!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));  
  } catch (e) {  
    return false;  
  }  
}

interface ExhibitionViewerProps {  
  exhibition: Exhibition;  
  rooms: Room\[\];  
  artworks: Artwork\[\];  
  waypoints: TourWaypoint\[\];  
  hotspots: ArtworkHotspot\[\];  
}

export const ExhibitionViewer: React.FC\<ExhibitionViewerProps\> \= ({  
  exhibition,  
  rooms,  
  artworks,  
  waypoints,  
  hotspots,  
}) \=\> {  
  const canvasRef \= useRef\<HTMLCanvasElement | null\>(null);  
  const \[webGlAvailable, setWebGlAvailable\] \= useState(true);  
  const \[activeArtwork, setActiveArtwork\] \= useState\<Artwork | null\>(null);  
  const \[isFpsMode, setIsFpsMode\] \= useState(false);  
  const \[isTouring, setIsTouring\] \= useState(false);  
  const \[playerPos, setPlayerPos\] \= useState({ x: 0, z: 0, angle: 0 });

  const cameraCtrlRef \= useRef\<CameraController | null\>(null);  
  const tourSeqRef \= useRef\<TourSequencer | null\>(null);

  useEffect(() \=\> {  
    if (\!isWebGLSupported()) {  
      setWebGlAvailable(false);  
      return;  
    }

    if (\!canvasRef.current) return;  
    const { scene, dispose } \= initBabylonScene(canvasRef.current);

    // Build Rooms  
    for (const room of rooms) {  
      if (room.parametric\_layout) {  
        buildParametricRoom(scene, JSON.parse(room.parametric\_layout));  
      }  
    }

    // Mount Artworks  
    for (const art of artworks) {  
      createArtworkMesh(scene, art);  
    }

    // Setup Camera  
    const cameraCtrl \= new CameraController(scene, canvasRef.current);  
    cameraCtrlRef.current \= cameraCtrl;

    // Setup Tour  
    const tourSeq \= new TourSequencer(cameraCtrl, waypoints);  
    tourSeqRef.current \= tourSeq;

    // Track Player Position for Mini-map  
    const posInterval \= setInterval(() \=\> {  
      setPlayerPos({  
        x: cameraCtrl.camera.position.x,  
        z: cameraCtrl.camera.position.z,  
        angle: cameraCtrl.camera.rotation.y,  
      });  
    }, 100);

    return () \=\> {  
      clearInterval(posInterval);  
      dispose();  
    };  
  }, \[rooms, artworks, waypoints\]);

  if (\!webGlAvailable) {  
    return \<Fallback2DCatalog exhibition={exhibition} artworks={artworks} /\>;  
  }

  return (  
    \<div className="relative w-screen h-screen overflow-hidden bg-black select-none"\>  
      \<canvas ref={canvasRef} className="w-full h-full touch-none" /\>

      {/\* Mini-map \*/}  
      \<MiniMap  
        rooms={rooms}  
        playerPos={playerPos}  
        onTeleport={(x, z) \=\> cameraCtrlRef.current?.teleportTo(x, z)}  
      /\>

      {/\* Bottom Bar Controls \*/}  
      \<div className="absolute bottom-6 left-1/2 transform \-translate-x-1/2 flex items-center gap-3 bg-black/70 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 shadow-2xl z-30 text-white"\>  
        \<button  
          onClick={() \=\> {  
            const nextMode \= \!isFpsMode;  
            setIsFpsMode(nextMode);  
            cameraCtrlRef.current?.setMode(nextMode ? 'FPS' : 'DRAG');  
          }}  
          className={\`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${  
            isFpsMode ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'  
          }\`}  
        \>  
          \<Compass size={16} /\>  
          {isFpsMode ? 'FPS Lock Active' : 'Enable FPS Walk'}  
        \</button\>

        \<button  
          onClick={() \=\> {  
            if (isTouring) {  
              tourSeqRef.current?.pause();  
              setIsTouring(false);  
            } else {  
              tourSeqRef.current?.start();  
              setIsTouring(true);  
            }  
          }}  
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 transition"  
        \>  
          {isTouring ? \<Pause size={16} /\> : \<Play size={16} /\>}  
          {isTouring ? 'Pause Tour' : 'Start Tour'}  
        \</button\>  
      \</div\>

      {/\* Pop-up Deep Inspection Modal \*/}  
      {activeArtwork && (  
        \<ArtworkFocusModal  
          artwork={activeArtwork}  
          hotspots={hotspots.filter((h) \=\> h.artwork\_id \=== activeArtwork.id)}  
          onClose={() \=\> setActiveArtwork(null)}  
        /\>  
      )}  
    \</div\>  
  );  
};

> * \[ \] **Step 4: Run test to verify it passes**

Run: npx vitest run tests/unit/exhibition-page.test.ts  
Expected: PASS

> * \[ \] **Step 5: Commit**

Bash  
git add src/components/viewer/Fallback2DCatalog.tsx src/components/viewer/ExhibitionViewer.tsx tests/unit/exhibition-page.test.ts  
git commit \-m "feat(viewer): implement full exhibition viewer page with WebGL fallback catalog"  
