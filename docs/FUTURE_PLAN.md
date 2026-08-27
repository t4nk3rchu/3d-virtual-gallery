# 🚀 3D Virtual Gallery — Phase 2 & Future Roadmap

**Document Version:** 2.0  
**Status:** Planned Enhancements & Next Phase Architecture  

---

## 1. 🗿 3D Sculpture & Volumetric Asset Pipeline (`SCULPTURE_3D`)
- **Interactive 3D Asset Loader**: Support for standalone `.glb` / `.gltf` 3D sculptures with Draco and meshopt compression.
- **Museum Plinth / Pedestal Customizer**: Procedural marble, wood, concrete, and brass plinths generated beneath 3D models.
- **360° Turntable & Orbit Inspection**: Dedicated turntable rotation in inspect mode allowing visitors to spin and examine sculptures from all vertical and horizontal angles.
- **Volumetric Bounding & Placement**: Automatic collision bounding boxes and gizmo snapping to pedestals and gallery floors.
- **KTX2 / Basis GPU Texture Compression**: Deferred from phase 1 (rooms were simple and artwork images are CDN-served, so KTX2 added authoring burden for no measurable win). Re-introduce when curators bring heavy custom rooms (photogrammetry / high-res baked-lighting textures) and mobile GPU VRAM becomes a measured bottleneck. Requires self-hosting the `uastc_to_*` / `zstddec` / `basis_transcoder` decoder assets in `public/decoders/` and restoring `KhronosTextureContainer2.URLConfig` in `engine.ts`. Draco geometry compression remains enabled in phase 1.

---

## 2. 👥 Real-Time Multiplayer & Social Presence
- **Cloudflare Durable Objects + WebSockets**: Room-level presence synchronization keeping track of active visitors in each exhibition.
- **Minimalist Ghost Avatars**: Non-intrusive 3D silhouettes or floating badges showing where other visitors are looking and walking in real time.
- **Live Proximity Audio**: WebRTC spatial proximity voice chat allowing visitors standing near the same artwork to converse naturally.
- **Live Visitor Counter**: Real-time visitor presence pill in the viewer HUD showing current concurrent attendees.

---

## 3. 🎙️ Live Curator Guided Tours (WebRTC Broadcast)
- **Presenter Mode**: Curators can initiate scheduled or live guided tours.
- **Camera Synchronization**: Tour participants can choose "Follow Curator" mode, which smoothly mirrors the curator's camera coordinates, focus targets, and hotspot selections.
- **Real-Time Narration**: Live audio broadcasting via Cloudflare Calls / LiveKit with low latency.
- **Interactive Tour Q&A**: Floating questions panel where attendees can raise hands and ask questions during the tour.

---

## 4. 📐 Parametric In-Browser Floor Plan & Room Builder
- **2D Floor Plan CAD Grid**: Curators can draw custom architectural floor plans directly in the browser (walls, partitions, doorways, windows).
- **Constructive Solid Geometry (CSG)**: Real-time wall extrusion, doorway punching, and ceiling height adjustment.
- **Material & Texture Palettes**: Seamless PBR material assignment for hardwood, polished concrete, plaster, exposed brick, and glass walls.
- **Custom Lighting Rig**: Drag-and-drop directional track lights, spotlights, and warm/cool temperature sliders.

---

## 5. 📊 Studio Advanced Analytics & Visual Dashboard
- **Visual Analytics Dashboard**: Interactive charts built into Studio for tracking:
  - Total Unique Visitors and Session Durations.
  - Artwork Heatmap (most viewed, longest dwell time, most inspected hotspots).
  - Audio Guide Completion Funnels (drop-off rates and completion percentages).
  - Geographic distribution and device breakdown (Desktop vs. Mobile/Tablet).
- **CSV / PDF Report Export**: One-click summary export for artists and gallery stakeholders.

---

## 6. 🔒 Access Control & Monetization Options
- **Password-Protected & Private Galleries**: Gated access for VIP previews, private collectors, and press releases.
- **Ticketing & Paywall Integration**: Optional Stripe payment gate for ticketed virtual exhibitions and fundraising events.
- **In-Gallery Artwork Purchase Inquiries**: Direct inquiry modal connecting collectors with the gallery or artist via email/webhook integration.

---

## 7. 🥽 WebXR (VR & AR) Immersion
- **WebXR Immersive-VR Support**: One-click entry into Meta Quest, Apple Vision Pro, and PC VR headsets with 6DOF teleportation and controller laser pointing.
- **AR Artwork Preview**: "View in your room" WebXR AR button allowing collectors to project 2D paintings and 3D sculptures onto their physical home walls via mobile camera.
