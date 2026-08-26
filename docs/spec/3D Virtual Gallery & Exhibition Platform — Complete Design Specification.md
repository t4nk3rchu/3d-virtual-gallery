# **3D Virtual Gallery & Exhibition Platform — Complete Design Specification**

**Target Stack:** Next.js (App Router, TypeScript), Babylon.js, Cloudflare Pages & Workers, Cloudflare D1 (Edge SQLite), Google Drive CDN & Cloudflare Edge Cache, YouTube Player API  
**Reference Model:** [Kunstmatrix 3D Exhibition System](https://artspaces.kunstmatrix.com/en/exhibition/15801607/dongmungyohoe-70junyeon-sajinjeon-je7gwan)

## **1\. System Overview & Architecture**

                          ┌──────────────────────────────────────────────┐  
                          │         Cloudflare Global Edge Network       │  
                          │                                              │  
                          │   ┌──────────────────────────────────────┐   │  
                          │   │           Cloudflare Pages           │   │  
                          │   │   (Next.js App / Babylon.js Client)  │   │  
                          │   └──────────────────┬───────────────────┘   │  
                          │                      │                       │  
                          │   ┌──────────────────▼───────────────────┐   │  
                          │   │       Cloudflare Workers & D1        │   │  
                          │   │  • /api/exhibitions (D1 Edge Query)  │   │  
                          │   │  • /api/media/proxy (Edge Cache API) │   │  
                          │   │  • /api/auth (JWT Session Worker)    │   │  
                          │   └──────────────────┬───────────────────┘   │  
                          └──────────────────────┼───────────────────────┘  
                                                 │  
                   ┌─────────────────────────────┼─────────────────────────────┐  
                   ▼                             ▼                             ▼  
       ┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐  
       │     Google Drive     │      │ Google Image CDN     │      │       YouTube        │  
       │  (.glb models, MP3s) │      │ (2D Artwork Textures)│      │  (Video Art Streams) │  
       │  \*Cached at CF Edge\* │      │  lh3.googleuser...   │      │  \*Unlimited Egress\*  │  
       └──────────────────────┘      └──────────────────────┘      └──────────────────────┘

The platform is divided into three core subsystems:

> 1. **3D Exhibition Viewer Engine**: A lightweight, high-performance WebGL client powered by Babylon.js that renders realistic architectural gallery rooms, lighting, wall-mounted artworks, 3D sculptures, guided tours, and interactive hotspots.  
> 2. **Dual-Mode Curator Studio & CMS**: A web-based creation suite featuring a 2D floor plan editor, direct 3D in-scene placement, custom .glb room importing, and a reusable room template library.  
> 3. **Zero-Cost Media & Edge Infrastructure**: A serverless deployment running entirely on Cloudflare (Pages, Workers, D1 database), streaming video via YouTube, serving 2D images via Google's high-speed image CDN, and caching .glb models and audio guides at Cloudflare's edge to avoid download quotas.

## **2\. Database Schema (Cloudflare D1 / SQLite)**

### **2.1 users**

Stores curator and administrator credentials.

> * id (TEXT PRIMARY KEY): Unique user UUID.  
> * email (TEXT UNIQUE NOT NULL): Account email address.  
> * password\_hash (TEXT NOT NULL): Salted hash (Argon2 / Bcrypt).  
> * full\_name (TEXT NOT NULL): Curator display name.  
> * role (TEXT DEFAULT 'curator'): 'admin' or 'curator'.  
> * created\_at (INTEGER NOT NULL): Unix epoch timestamp.

### **2.2 room\_templates**

Pre-configured parametric rooms and uploaded .glb spaces that can be reused across exhibitions.

> * id (TEXT PRIMARY KEY): Unique template UUID.  
> * name (TEXT NOT NULL): Template title (e.g., "Modern White Cube", "Cathedral Gallery").  
> * description (TEXT): Layout and dimension details.  
> * thumbnail\_url (TEXT): Preview thumbnail URL.  
> * room\_type (TEXT NOT NULL): 'PARAMETRIC' or 'CUSTOM\_GLB'.  
> * parametric\_data (TEXT): JSON array of wall segments, dimensions, and materials.  
> * glb\_media\_url (TEXT): Google Drive URL for custom .glb room models.  
> * is\_public (INTEGER DEFAULT 1): 1 for public library templates, 0 for private.

### **2.3 exhibitions**

Main exhibition records.

> * id (TEXT PRIMARY KEY): Unique exhibition UUID.  
> * user\_id (TEXT NOT NULL): Owner foreign key (users.id).  
> * title (TEXT NOT NULL): Title of the exhibition.  
> * slug (TEXT UNIQUE NOT NULL): URL slug (e.g., /exhibition/dongmoon-70th-anniversary).  
> * description (TEXT): Curatorial statement and background text.  
> * curator\_name (TEXT): Display text for organization or curator.  
> * start\_date (TEXT) / end\_date (TEXT): Exhibition run dates (ISO strings).  
> * is\_published (INTEGER DEFAULT 0): 1 for live public access, 0 for draft.  
> * password\_hash (TEXT): Optional password hash for private exhibits.  
> * cover\_image\_url (TEXT): Header/catalog thumbnail.  
> * settings\_json (TEXT): JSON configuration (background audio URL, fog, default eye height).  
> * created\_at (INTEGER NOT NULL): Unix timestamp.

### **2.4 rooms**

Specific rooms instantiated within an exhibition.

> * id (TEXT PRIMARY KEY): Unique room UUID.  
> * exhibition\_id (TEXT NOT NULL): Foreign key (exhibitions.id).  
> * template\_id (TEXT): Optional source template foreign key (room\_templates.id).  
> * order\_index (INTEGER NOT NULL): Navigation sequence order.  
> * name (TEXT NOT NULL): Room title (e.g., "Hall 7 \- Historical Archives").  
> * room\_type (TEXT NOT NULL): 'PARAMETRIC' or 'CUSTOM\_GLB'.  
> * parametric\_layout (TEXT): JSON defining wall segments \[{x1, z1, x2, z2, height, thickness}\].  
> * custom\_glb\_source (TEXT): Google Drive file ID/URL for custom room mesh.  
> * materials\_json (TEXT): Floor, wall, and ceiling PBR textures and roughness values.  
> * lighting\_json (TEXT): Ambient intensity, directional sun, and spotlight coordinates.

### **2.5 artworks**

All artworks mounted in rooms.

> * id (TEXT PRIMARY KEY): Unique artwork UUID.  
> * exhibition\_id (TEXT NOT NULL): Foreign key (exhibitions.id).  
> * room\_id (TEXT NOT NULL): Foreign key (rooms.id).  
> * title (TEXT NOT NULL): Artwork title.  
> * artist (TEXT NOT NULL): Artist name.  
> * year (TEXT): Creation year.  
> * medium (TEXT): Artwork medium (e.g., "Archival Pigment Print").  
> * dimensions (TEXT): Physical dimensions (e.g., "120 x 80 cm").  
> * description (TEXT): Detailed interpretive text.  
> * artwork\_type (TEXT NOT NULL): 'IMAGE\_2D', 'VIDEO', 'AUDIO\_INSTALLATION', 'SCULPTURE\_3D'.  
> * media\_url (TEXT): Google Drive sharing URL.  
> * media\_file\_id (TEXT): Extracted Google Drive File ID.  
> * youtube\_video\_id (TEXT): YouTube ID for video installations.  
> * audio\_guide\_url (TEXT): URL for audio narration file.  
> * wall\_id (TEXT): Wall identifier the artwork is anchored to.  
> * transform\_json (TEXT): JSON: { position: \[x,y,z\], rotation: \[x,y,z\], scale: \[x,y,z\] }.  
> * frame\_config\_json (TEXT): JSON: frame style (wood, metal\_black, float\_white, canvas\_wrap), mat width, placard visibility.

### **2.6 artwork\_hotspots**

Interactive points of interest on an artwork.

> * id (TEXT PRIMARY KEY): Unique hotspot UUID.  
> * artwork\_id (TEXT NOT NULL): Foreign key (artworks.id).  
> * x\_percent (REAL NOT NULL): Horizontal coordinate (0.0 to 100.0%).  
> * y\_percent (REAL NOT NULL): Vertical coordinate (0.0 to 100.0%).  
> * title (TEXT NOT NULL): Hotspot headline.  
> * description (TEXT NOT NULL): Curatorial note or historical context for that detail.  
> * audio\_timestamp\_seconds (REAL): Jump timestamp in the linked audio track.

### **2.7 tour\_waypoints**

Automated guided tour route stops.

> * id (TEXT PRIMARY KEY): Unique waypoint UUID.  
> * exhibition\_id (TEXT NOT NULL): Foreign key (exhibitions.id).  
> * order\_index (INTEGER NOT NULL): Sequence position in the tour.  
> * artwork\_id (TEXT): Optional linked artwork (artworks.id).  
> * camera\_position\_json (TEXT NOT NULL): Camera coordinates \[x, y, z\].  
> * camera\_target\_json (TEXT NOT NULL): Look-at target coordinates \[x, y, z\].  
> * narration\_text (TEXT): Subtitle or voice narration text.  
> * dwell\_time\_seconds (INTEGER DEFAULT 8): Dwell duration at this stop.

## **3\. 3D Exhibition Viewer Engine (Babylon.js)**

### **3.1 Three-Tier Hardware Resolution Scaling**

To guarantee sustained 60 FPS performance and minimize device memory usage, the engine dynamically adjusts canvas scaling and texture resolution across three distinct interaction states:

| State | Canvas Hardware Scale | Texture Resolution Loaded | Background Scene |
| :---- | :---- | :---- | :---- |
| **Tier 1: Roaming / Walk Mode** | **75% Native** (setHardwareScalingLevel(1.33)) | Web-optimized texture (=w1600) | Full 3D rendering with lighting & FXAA |
| **Tier 2: Artwork Focus Mode** | **90% Native** (setHardwareScalingLevel(1.11)) | Web-optimized texture (=w1600) | Camera smoothly glides perpendicular to wall |
| **Tier 3: Pop-up Deep Inspection** | **100% Native** (setHardwareScalingLevel(1.00)) | Original full resolution (=s0) | 3D scene paused and blurred (backdrop-blur-md bg-black/75) |

### **3.2 Room Construction & Shading Pipeline**

> * **Parametric Generation**: Parses the room's wall coordinates from D1 and generates solid meshes using MeshBuilder.ExtrudePolygon. Openings for doorways are subtracted using Babylon CSG.  
> * **Custom GLB Spaces**: Imported using SceneLoader.AppendAsync. Floor geometry is automatically identified, given collision tags (checkCollisions \= true), and added to the raycast teleport target list.  
> * **Lighting Model**:  
  * Hemispheric ambient light provides soft base room illumination.  
  * Dedicated SpotLight meshes are generated above each artwork, angled at 35° downward with soft shadow maps to emulate physical gallery spotlights.

### **3.3 Artwork Presentation & Framing**

> * **2D Framed Art**:  
  * Image plane textured from Google Drive image CDN.  
  * Procedural frame geometry with customizable molding materials: Dark Walnut, Matte Black Aluminum, White Float Frame, or Frameless Canvas Wrap.  
  * Beveled matting (passe-partout) with adjustable border width.  
  * 3D physical wall placard placed next to the frame containing title, artist, year, and medium.  
> * **Video Installations**: Plane screen meshes with Babylon VideoTexture or synchronized HTML overlay bound to the YouTube Player API.  
> * **3D Sculptures**: Procedural marble or hardwood plinths/pedestals hosting imported .glb models.

### **3.4 Camera Navigation & Controls (Smart Hybrid)**

> * **UniversalCamera** placed at standard human eye height ($y \= 1.7\\text{ m}$) with ellipsoid collision bounds (0.5, 0.9, 0.5).  
> * **Desktop Controls**:  
  * *Default Web Mode*: Free cursor. Left-click and drag anywhere to rotate the camera. WASD or arrow keys to walk. Left-clicking the floor casts a ray and initiates smooth camera tweening to that position.  
  * *FPS Walk Mode (Toggle)*: Clicking the "FPS Mode" button or pressing Space locks the cursor for continuous first-person mouse look with a center reticle. Clicking an artwork automatically unlocks the cursor.  
> * **Mobile Controls**: Touch drag to rotate camera, on-screen virtual movement joystick, and double-tap on the floor to teleport.  
> * **Automated Guided Tour**: Waypoint sequencer using Catmull-Rom spline camera interpolation to smoothly fly visitors from artwork to artwork, pausing for narration.  
> * **Interactive 2D Mini-Map**: Top-down SVG overlay displaying the room layout, visitor location cone, and clickable teleport pins.

### **3.5 Pop-up Inspection & Hotspots**

> * When an artwork is in focus, clicking it again triggers the **Pop-up Inspection Lightbox**:  
  * The 3D canvas is blurred in the background.  
  * The image switches to max-resolution (=s0) with deep pan-and-zoom controls.  
  * Interactive pulsing hotspot markers (artwork\_hotspots) appear over specific details. Clicking a hotspot opens an interpretive card and can jump audio narration to a specific timestamp.

## **4\. Dual-Mode Curator Studio & CMS**

### **4.1 2D Architectural Floor Plan Editor**

> * Canvas/SVG grid with configurable snapping (0.25m / 0.5m).  
> * Wall drawing tool to build custom rooms, corridors, and doorways.  
> * **Direct GLB Room Upload**: Curators can upload a .glb architectural model directly; the editor renders the space and generates a 2D floor footprint.  
> * **Room Template Library**: Save any designed room or uploaded .glb space as a reusable template in room\_templates.  
> * **Artwork Tray**: Unassigned artworks appear in a dock; curators drag and drop them onto wall segments with automatic height and normal calculation.

### **4.2 3D In-Scene Direct Manipulation**

> * Live 3D environment with Babylon.js GizmoManager for position/rotation fine-tuning.  
> * **Surface Snapping**: Movement is locked to the wall surface normal to prevent artwork from floating or clipping inside walls.  
> * **Frame & Lighting Inspector**: Real-time property panel to adjust frame thickness, mat colors, spotlight angles, and wall placards.  
> * **Hotspot Editor**: Click directly on the artwork surface to drop hotspot pins and edit descriptions.

### **4.3 Asset Importer**

> * **Google Drive Link Parser**: Accepts standard sharing links (\[https://drive.google.com/file/d/\](https://drive.google.com/file/d/){fileId}/view), validates public permissions, and extracts fileId.  
> * **YouTube Linker**: Validates video URLs and configures loop/autoplay.  
> * **Bulk Importer**: Paste multiple Google Drive links to generate artwork records in batches.

## **5\. Media Streaming Pipeline & Edge Caching**

Asset Request  
   │  
   ├── 2D Artwork Image ────\> Google Image CDN (lh3.googleusercontent.com/d/{fileId}=w1600 or \=s0)  
   │  
   ├── Video Artwork ───────\> YouTube Player API (Unlisted/Public video stream)  
   │  
   └── .glb Model / MP3 ────\> /api/media/proxy/\[fileId\]  
                                    │  
                              Cloudflare Cache API  
                                    ├── Cache Hit  ──\> Return Cached Asset (HTTP 200 / 206\)  
                                    └── Cache Miss ──\> Stream from Drive, Cache at Edge (1 year immutable)

> 1. **2D Artwork Images**: Served directly via Google’s global image CDN (\[https://lh3.googleusercontent.com/d/\](https://lh3.googleusercontent.com/d/){fileId}).  
   * Fast loading, multi-tier downscaling (=w1600 for gallery view, \=s0 for pop-up deep zoom).  
   * Zero egress or bandwidth cost.  
> 2. **Video Streaming**: Streamed via YouTube.  
   * Eliminates Google Drive concurrent download quota blocks (HTTP 403).  
   * Provides global adaptive bitrate streaming (HLS/DASH).  
> 3. **3D Models (.glb) & Audio MP3s**: Proxied via Cloudflare Workers.  
   * First visitor triggers edge cache population.  
   * Subsequent visitors download directly from Cloudflare Edge Cache, shielding Google Drive from concurrent download limits.  
   * Full HTTP Range-request support (HTTP 206\) for smooth audio seeking.

## **6\. Performance, Security & Error Handling**

> 1. **Memory & VRAM Management**:  
   * Frustum culling and occlusion queries enabled by default.  
   * Textures of unvisited rooms are automatically disposed when moving between large exhibition halls.  
> 2. **WebGL Fallback**:  
   * If WebGL is unavailable, the application gracefully renders a responsive 2D Virtual Exhibition Catalog view containing high-res images, audio guides, and text descriptions.  
> 3. **Security**:  
   * D1 queries use parameterized prepared statements.  
   * Private exhibitions protected with bcrypt password verification.  
   * Curator sessions managed via signed HTTP-only JWT cookies on Cloudflare Workers.

## **7\. Testing Strategy**

> 1. **Unit & Integration Tests (Vitest)**:  
   * D1 SQL schema migrations and CRUD queries.  
   * Google Drive URL parser and regex extraction (\[drive.google.com/file/d/\](https://drive.google.com/file/d/){id}).  
   * Cloudflare Worker media proxy and range header responses.  
   * Room layout JSON schema validators.  
> 2. **End-to-End Tests (Playwright)**:  
   * 3D Viewer canvas initialization and WebGL context acquisition.  
   * Three-tier hardware scaling transitions (75% $\\to$ 90% $\\to$ 100%).  
   * Camera collision detection (preventing walking through walls).  
   * Artwork click-to-focus and pop-up hotspot modal interactions.  
   * Guided tour sequential navigation and audio synchronization.  
   * 2D Floor Plan builder drag-and-drop artwork placement and room template saving.