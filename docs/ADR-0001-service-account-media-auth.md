# ADR-0001: Private Google Drive Media Access via Service Account & Signed Token Proxy

## Status
Accepted

## Date
2026-09-01

## Context
In the initial version (v1) of Reda Gallery, Google Drive media files (images, GLB 3D models, audio guides, narration tracks) were retrieved via direct public Google Drive URLs (`lh3.googleusercontent.com`, `drive.google.com/uc?export=download`, `webContentLink`).

This legacy approach had critical limitations:
1. **Security & Privacy Invasiveness**: Required curators to set all Drive files or folders to **"Anyone with the link can view"**, exposing private and copyrighted museum assets publicly.
2. **Fragile Client-Side Validation**: Required the frontend client to query Google Drive permissions API to verify public link status (`isAnyoneWithLink`), adding network latency and permission errors.
3. **Unreliable Direct URLs**: Direct `drive.google.com/uc?export=download` URLs frequently trigger rate limits, virus scan warnings, and cookie blocks across browsers.

## Decision
Migrate all media retrieval to an **authenticated Cloudflare Worker proxy (`/api/media/:fileId`)** backed by a **Google Service Account** and protected with **HMAC-SHA256 signed tokens**:

1. **Private Access Delegation**: Curators share their exhibition assets folder with the dedicated Reda Service Account (`GDRIVE_SA_CLIENT_EMAIL`). Files remain completely private from the public web.
2. **Serverless Proxy with Edge Caching**:
   - Worker signs RS256 JWT assertions using `GDRIVE_SA_PRIVATE_KEY` via WebCrypto `crypto.subtle` to acquire Google OAuth access tokens.
   - Worker streams media directly from Google Drive API v3 (`files.get?alt=media&supportsAllDrives=true`) with range request and Cloudflare Cache API support.
3. **HMAC-SHA256 Token Authorization**:
   - Exhibition endpoints issue signed 6-hour tokens (`t=<token>`) for all referenced media assets.
   - Requests without a valid signed token or matching origin are rejected at the edge.
4. **Simplified Studio Picker**:
   - Removed client-side public permission queries and deleted `src/lib/studio/drive-share.ts`.
   - `DriveFilePicker` hands `fileId` directly to form fields without forcing public link sharing.

## Alternatives Considered

### Direct Public Google Drive Links (Legacy v1)
- **Rejected**: Insecure, requires public file sharing, prone to download throttling and browser blocking.

### User OAuth Token Relay to Browser
- **Rejected**: Exposes user OAuth access tokens on the frontend; fails for anonymous gallery visitors viewing public exhibitions.

### Pre-Signed Cloudflare R2 Uploads
- **Considered for Phase 2**: Ideal for curators uploading directly from local files; Service Account proxy is optimal for existing Google Drive workflows without duplicate storage costs.

## Consequences
- Curators no longer need to make assets public; sharing to the Service Account email is sufficient.
- Client codebase is simpler with zero dead code and no client-side permission checks.
- Media proxy provides unified CORS headers, range headers for audio/video streaming, and edge caching.
