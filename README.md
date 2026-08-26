# 🏛️ 3D Virtual Gallery & Exhibition Platform

> An immersive, high-performance WebGL2 3D virtual art gallery and exhibition authoring platform built with **React 19**, **Babylon.js 7**, and **Cloudflare Workers & D1**.

[![Tests](https://img.shields.io/badge/tests-74%20passed-brightgreen.svg)](#-automated-testing--quality)
[![Engine](https://img.shields.io/badge/engine-Babylon.js%207.x-orange.svg)](https://www.babylonjs.com/)
[![Framework](https://img.shields.io/badge/frontend-React%2019%20%2B%20Vite-61dafb.svg)](https://react.dev/)
[![Backend](https://img.shields.io/badge/edge-Cloudflare%20Workers%20%2B%20D1-f38020.svg)](https://workers.cloudflare.com/)

---

## 🌟 Key Highlights

### 🎨 Immersive 3D Visitor Experience
- **Spatial Exploration & Collision**: Real-time walking with WASD and sprint (`Shift`), with solid 0.6m architectural box collisions and boundary clamping so players cannot tunnel through walls.
- **Orthogonal 90° Focus**: Clicking any artwork calculates its outward normal vector to automatically position the camera directly in front at an optimal perpendicular view distance.
- **Deep-Zoom & 3D Tilt Inspect Lightbox**: High-resolution inspect modal with 3D perspective tilt slab, smooth drag panning, and wheel zooming.
- **Interactive Hotspots**: Pinpoint artwork details with radar pulsing pins, hover tooltips, smooth flight arc transitions, and attached dedicated audio guides or timestamp markers.
- **Cinema Video Mode**: Responsive 16:9 full-screen YouTube and video player embed with autoplay and cinema backdrop.
- **Audio Guides & Ambient Sound**: Spatial ambient audio and synchronised narration with seek jump actions.
- **Full Mobile & Touch Support**: Dual-mode pointer look, touch pan/pinch gestures, and accessible 2D Fallback Catalog mode for low-end devices.

### 🛠️ Curator Studio & Authoring CMS
- **Real-Time 3D Gizmo Placement**: Direct translation, rotation, and proportional aspect ratio locked scaling with intuitive toolbar toggles.
- **Curator Control Settings & Keybinding Remapping**: Custom sidebar drawer for remapping keys, adjusting camera speeds, panning speeds, and direct movement sensitivities.
- **Flexible Room Importer**: Built-in room presets (Minimalist Studio, White Cube Gallery, Classical Hall) plus one-click custom `.glb` import via Google Drive or direct file upload.
- **Hotspot Authoring**: Interactive drag-and-drop hotspot placement with live preview and audio guide binding.
- **PBR Frame & Matting Customizer**: Wood, black lacquer, brushed gold, floating canvas, and borderless frames with bevels and normal maps.

### ⚡ Edge & Cloudflare Serverless Architecture
- **Cloudflare D1 Database**: Global SQLite database with schema migrations.
- **Range-Streaming Media Proxy**: Stream audio and videos directly with HTTP 206 partial content support.
- **Edge Cache Pre-warming**: Automatic edge cache warming for high-speed sub-second load times worldwide.
- **Privacy-First Analytics**: Beacon and Analytics Engine logging for exhibition visits, artwork views, dwell time, and audio completion.

---

## 🏗️ Architecture & Tech Stack

```
3D-Virtual-Gallery/
├── src/
│   ├── components/
│   │   ├── studio/          # Curator CMS, Gizmo Placement, Room Importer, Hotspots
│   │   ├── viewer/          # 3D Exhibition Viewer, Focus Panel, Inspect Lightbox, HUD
│   │   └── ui/              # Reusable design system components (Modals, Sliders, Badges)
│   ├── lib/
│   │   ├── babylon/         # Babylon.js Scene Engine, CameraController, GizmoManager, ArtworkFactory
│   │   ├── media/           # YouTube parser, Google Drive GLB resolver, Audio handlers
│   │   └── api/             # API client services & endpoints
│   └── types/               # TypeScript data models and API contracts
├── worker/
│   ├── routes/              # Cloudflare Worker REST endpoints (Auth, Exhibitions, Artworks, Media)
│   ├── db/                  # D1 SQLite repository queries & database migrations
│   └── utils/               # JWT auth, Media streaming proxy, Cache pre-warming
├── migrations/              # SQL D1 schema migrations
└── docs/                    # Architecture specs, implementation plans, and checklists
```

| Layer | Technology |
|---|---|
| **3D Rendering** | [Babylon.js 7](https://www.babylonjs.com/) (PBR, UniversalCamera, GizmoManager, Draco) |
| **Frontend UI** | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Styling** | Modern Vanilla CSS (Glassmorphism, 3D CSS Transforms, Responsive Flex/Grid) |
| **Edge Server** | [Cloudflare Workers](https://workers.cloudflare.com/) (TypeScript) |
| **Database** | [Cloudflare D1](https://developers.cloudflare.com/d1/) (Serverless SQLite) |
| **Testing** | [Vitest](https://vitest.dev/) & [Testing Library](https://testing-library.com/) (74 test suites) |

---

## 🚀 Quickstart & Local Development

### Prerequisites
- Node.js 20+
- `pnpm` (`npm install -g pnpm`)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (for Cloudflare Workers/D1)

### 1. Installation
```bash
git clone <repository-url>
cd "3D Virtual Gallery"
pnpm install
```

### 2. Environment Variables
Copy the template configuration:
```bash
cp .dev.vars.example .dev.vars
```
Configure your `.dev.vars` with a 32+ character JWT secret key and optional Google OAuth credentials.

### 3. Setup Local Database Migrations
```bash
wrangler d1 migrations apply virtual-gallery-db --local
```

### 4. Run Development Servers
Start both the client and worker servers in parallel:
```bash
# Terminal 1: Client Vite App (http://localhost:5173)
pnpm dev

# Terminal 2: Cloudflare Worker API (http://localhost:8787)
pnpm worker:dev
```

---

## 🧪 Automated Testing & Quality

Run the comprehensive unit and integration test suite:
```bash
# Run all Vitest suites (74 / 74 tests)
pnpm test

# Run production bundle build & TypeScript type check
pnpm build
```

---

## 📚 Documentation & Specifications

Comprehensive architectural specifications and guides are available in the [`docs/`](file:///d:/Claude/3D%20Virtual%20Gallery/docs) folder:

- 📋 [**Design Specification v2**](file:///d:/Claude/3D%20Virtual%20Gallery/docs/spec/3D%20Virtual%20Gallery%20—%20Design%20Specification%20v2.md) — System requirements, component hierarchy, and data schemas.
- 📐 [**Complete Implementation Plan**](file:///d:/Claude/3D%20Virtual%20Gallery/docs/plan/3D%20Virtual%20Gallery%20&%20Exhibition%20Platform%20—%20Complete%20Implementation%20Plan.md) — Multi-phase technical implementation details.
- 📊 [**Project Status Report**](file:///d:/Claude/3D%20Virtual%20Gallery/docs/PROJECT_STATUS_REPORT.md) — Completed milestones, feature audit, and technical specifications.
- 🎨 [**Blender Room Authoring Checklist**](file:///d:/Claude/3D%20Virtual%20Gallery/docs/BLENDER_ROOM_CHECKLIST.md) — Guide for creating and exporting custom GLB rooms in Blender.
- 🚀 [**Phase 2 & Future Roadmap**](file:///d:/Claude/3D%20Virtual%20Gallery/docs/FUTURE_PLAN.md) — 3D Sculptures, WebXR, Multiplayer, and Guided Tours.

---

## 🌐 Production Deployment

### 1. Deploy Worker to Cloudflare
```bash
wrangler deploy worker/index.ts
```

### 2. Deploy SPA to Cloudflare Pages
```bash
pnpm build
wrangler pages deploy dist --project-name virtual-gallery
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
