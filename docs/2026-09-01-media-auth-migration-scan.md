# Media Auth Migration — Stale-Code Scan Brief (for Gemini)

**Date:** 2026-09-01
**Author:** handoff from Claude
**Task type:** whole-codebase scan + report (do NOT refactor yet — produce a findings list first)

---

## 1. What changed (the declaration)

The app's Google Drive media access model was **replaced**:

| | OLD model (removed) | NEW model (current) |
|---|---|---|
| Drive file visibility | **"Anyone with the link"** (public) | **Private**, shared only to the **service account** (folder-level share to the SA email) |
| How the browser got bytes | Direct public URLs — `lh3.googleusercontent.com` CDN, `drive.google.com/uc?export=download`, `webContentLink` | Proxied through the Worker: **`/api/media/:fileId?tier=<t>&t=<signed-token>`** |
| Who authenticates to Drive | nobody (public) | the **service account** via RS256 JWT → OAuth access token, Drive API v3 `files.get?alt=media` with `Authorization: Bearer` |
| Access control on a media URL | none (anyone) | **HMAC-SHA256 signed token**, 6h TTL, issued in the exhibition API response as `media_tokens` and registered client-side before render |
| Curator file selection | Drive Picker, then file made "anyone with link" | Drive Picker (`drive.file` scope), then file must be **shared to the SA** |

**Canonical new-model files (treat as the source of truth for "correct"):**
- `worker/media-proxy.ts` — the proxy + cache + range + token/origin gates
- `worker/media-sign.ts` — token sign/verify + `tokensForExhibition`
- `worker/gdrive-auth.ts` — service-account JWT → access token
- `src/lib/media/gdrive.ts` — client URL builder (`getImageUrl`, `proxyMediaUrl`, `withToken`)
- `src/lib/media/media-tokens.ts` — client token registry

---

## 2. What to find

Any code, comment, test, type, or config that **still assumes public "anyone with the link" access** or builds/relies on **direct public Drive URLs**. These are now dead, misleading, or actively wrong.

### Known suspects (start here, then go wider)

1. **`src/lib/studio/drive-share.ts` → `isAnyoneWithLink()`**
   - Checks whether a Drive file is shared "anyone with link". Under the new model files should be shared **to the service account**, not to "anyone".
   - Used by `src/components/studio/DriveFilePicker.tsx:52`. Determine whether the picker still gates/warns on public sharing when it should instead verify the SA can access the file (or drop the check entirely). Likely stale.
   - Its tests live in `src/lib/studio/studio.test.ts` (~line 136).

2. **`src/lib/babylon/artwork-factory.ts:10`** — comment references "lh3 CDN =w1600". Stale comment even if the URL now comes from `getImageUrl`. Verify no direct lh3 sizing logic remains.

3. **`src/lib/media/gdrive.ts`** — already rewritten, but confirm no leftover `lh3.googleusercontent.com` / `uc?export` URL construction remains anywhere (only `/api/media` + `withToken`).

### Grep seeds (not exhaustive — expand)

```
lh3\.googleusercontent\.com
drive\.google\.com/uc
export=download
webContentLink
webViewLink
alt=media                     # legit only inside worker/media-proxy.ts
anyone.*link | isAnyoneWithLink
type === 'anyone' | 'anyone'
makePublic | setPermission | permissions.create
```

---

## 3. For each finding, report

- **File:line** and the symbol (function/const/comment/test).
- **Why it's stale** — which part of the OLD model it assumes.
- **Blast radius** — who imports/calls it (is it dead, or wired into a live path?).
- **Recommended action** — delete / rewrite to SA model / update comment / update test. Do **not** apply yet.
- **Confidence** — high/medium/low, and what would confirm it.

Group findings: **(A) actively wrong on the live path**, **(B) dead code**, **(C) stale comments/docs/tests only**.

## 4. Out of scope

- The canonical new-model files in §1 (that's the target design, not a finding — only flag genuine bugs in them).
- The Drive Picker OAuth/scope config (`drive.file`) — that's intentional and correct.
- Don't change behavior in this pass; this is a scan-and-report task.
