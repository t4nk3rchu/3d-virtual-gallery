# REDA Redesign 04 — Auth + Dashboard + Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Read `00-roadmap.md` (shared context + Global Constraints) and finish `01-foundation.md` first (03-studio may land before or after — this plan is independent of it). Steps use `- [ ]`.

**Goal:** Restyle Login/Register and the Dashboard to `mockup/auth/**` + `mockup/dashboard/**`, add a **light-default + dark theme toggle** on auth, add a **Dashboard empty-state**, and build the **new Account page** (view + route + a password-change worker endpoint).

**Architecture:** Auth, Dashboard, New-Exhibition are view-states of `StudioApp.tsx` (`CmsView = 'login' | 'dashboard' | 'editor' | 'new-exhibition'`). This plan adds `'account'` to that union. Styling: `App.css` "Login Page"/"Studio Dashboard" sections + `reda-studio.css` + `reda-ui.css`. Backend: Cloudflare Worker (`worker/index.ts` router → `worker/auth.ts`, `worker/crypto.ts`, `worker/jwt.ts`, `worker/db.ts`).

**Tech Stack:** React 19 + TS, global CSS + `--reda-*` tokens, Cloudflare Worker + D1, Vitest (dom + node/worker projects), pnpm.

## Global Constraints

Roadmap constraints apply. Surface-specific:
- **Auth register:** **light giấy-điệp default** + a working **dark toggle** (persisted). **Dashboard/Account:** light giấy-điệp (no toggle — light only for now).
- **son** = primary/commit (Sign In, Create Account, Save, Delete-commit); **gold** = accent only (no gold-filled buttons — the mockups corrected these); links = an accessible `--reda-link` (dark-gold on light, gold-hi on dark).
- Keep `<Icon>` (no emoji), keep English copy, keep Google OAuth full-page-nav pattern (`<a href="/api/auth/google">`).
- Password handling: **reuse the existing hashing** from `worker/auth.ts` register/login — never invent a new scheme; never log or return password material.
- Every existing test stays green; add new tests for the new endpoint + Account view.

## Feature-preservation checklist

- **Login/Register (`StudioApp.tsx:105-319`):** Sign In / Register tabs (reset error on switch), Google OAuth anchor, credentials form (Full Name register-only, Email, Password with mode-correct autocomplete), submit label morph + "Authenticating…", single error alert box, header/branding, footer seal, endpoints `POST /api/auth/{register,login}` then `GET /api/auth/me`, boot state.
- **Dashboard (`StudioApp.tsx:321-444`):** header (logo, h1, signed-in email, New-exhibition primary, Sign Out ghost), loading state, exhibition cards (SVG preview placeholder, Live/Draft badge, `N works · room`, title, `/e/slug`, curator label, Edit&curate / View 3D / Delete), trailing `.dnew` card, delete flow (`DELETE /api/exhibitions/:id`).

## Mockup ↔ target map

| Mockup | Target |
|---|---|
| `auth/view-01-login.html`, `view-01b-signup.html` | `StudioApp.tsx` `Login` (`:105-319`) + theme toggle |
| `dashboard/view-02-dashboard.html` | `StudioApp.tsx` `Dashboard` (`:321-444`) |
| `dashboard/view-02-dashboard-empty.html` | `Dashboard` empty branch (net-new) |
| `dashboard/view-02b-account.html` | **new** `Account` view + `CmsView 'account'` + worker endpoint |

---

### Task 1: Auth theme system + Login/Register restyle

**Files:**
- Modify: `src/App.css` (Login Page section `:160+`) and/or `reda-studio.css` (login rules), `src/components/studio/StudioApp.tsx` (`Login` `:105-319`)
- Test: `src/components/studio/StudioApp.test.tsx`

**Preserve:** the full login/register checklist above.

- [ ] **Step 1 (theme tokens):** In the Login Page CSS, express the surface with theme-swappable local vars scoped to the login root: default (light) maps `--login-bg: var(--reda-eggshell)`, `--login-surface: var(--reda-parch)`, `--login-text: var(--reda-ink)`, `--login-muted: #6B5D42`, `--login-border: var(--reda-parch-border)`; a `[data-theme="dark"]` block on the same root maps them to `--reda-char`/`--reda-char-2`/`--reda-cream(-hi)`/`--reda-muted`. Point the login `body`/`.card`/text rules at these local vars.
- [ ] **Step 2 (toggle control):** In the `Login` component, render a sun/moon `<Icon>` toggle button (top-right of the card). On click, flip `data-theme` on the login root element and persist to `localStorage('reda-theme')`; read it on mount (default `'light'`) to set the initial attribute (avoid a flash — set it in a `useLayoutEffect` or an inline read). No global theme system — scope the attribute to the login root only.
- [ ] **Step 3 (palette corrections):** `.submit` → `--reda-son` (not gold); the Sign-In/Register tab active state → flat `--reda-parch` + a gold underline (no gold fill); field labels → mono `--reda-label`; links → `--reda-link`; the Google chip → real Google "G" `<Icon>`/SVG (no raw `#4285F4` fill on a text button — use a neutral chip). Add a `.field.error` visual capability (son border + son message) for future server errors; wire the existing single `error` string into it.
- [ ] **Step 4:** `pnpm test -- src/components/studio/StudioApp.test.tsx` → PASS (update assertions for any changed class/label; add a test that toggling sets `data-theme` and persists).
- [ ] **Step 5:** `pnpm dev` → `/studio` logged-out; screenshot login + register in **both** themes at desktop + SE1; compare to `view-01-login` / `view-01b-signup`.
- [ ] **Step 6:** `git add -A && git commit -m "feat(auth): light-default theme + dark toggle; restyle login/register"`

---

### Task 2: Dashboard restyle + empty-state

**Files:**
- Modify: `src/App.css` (Studio Dashboard section `:203+`), `src/components/studio/StudioApp.tsx` (`Dashboard` `:321-444`)
- Test: `src/components/studio/Dashboard.test.tsx`

**Preserve:** header + New-exhibition + Sign Out, loading state, card fields + actions, `.dnew` card, delete flow.

- [ ] **Step 1:** Target `view-02-dashboard.html`. Light register: son primaries (`.btn-new` "New exhibition", "Edit & curate"), Live badge = gold **outline/tint** (not fill), muted captions at ≥4.5:1, Delete = son-tinted danger with an SVG trash `<Icon>` + `aria-label`. The card `.prev` SVG placeholder stays (decorative) but flatten any gradient to a flat token fill.
- [ ] **Step 2 (empty-state, net-new):** Add an empty branch to `Dashboard`: when `exhibitions.length === 0` (after load), render the empty-state from `view-02-dashboard-empty.html` — a centered dashed-frame illustration, "You have no exhibitions yet" copy, and one son CTA that opens New-exhibition — instead of a lone `.dnew` card. Keep the populated-grid branch unchanged.
- [ ] **Step 3 (delete confirm):** Replace the native `window.confirm` (`:350-359`) with an in-app 2-step confirm on the Delete button (matches the mockup's "Chắc chắn?"/"Are you sure?" inline affirmation): first click arms the button (label→"Confirm delete", son fill), second click within a short window fires `DELETE /api/exhibitions/:id`; clicking elsewhere disarms. Keep the optimistic state filter after success.
- [ ] **Step 4:** `pnpm test -- src/components/studio/Dashboard.test.tsx` → PASS (add tests: empty-state renders on `[]`; delete requires the 2-step). Update any assertion tied to `window.confirm`.
- [ ] **Step 5:** `pnpm dev`, screenshot dashboard populated + empty; compare to the two mockups.
- [ ] **Step 6:** `git add -A && git commit -m "feat(dashboard): restyle + empty-state + inline delete confirm"`

---

### Task 3: Password-change worker endpoint (backend)

**Files:**
- Modify: `worker/index.ts` (add the route), `worker/auth.ts` (add `changePassword` handler)
- Reference: `worker/crypto.ts` (the hash/verify helpers used by register/login), `worker/jwt.ts` (auth-from-cookie), `worker/db.ts` (users table access)
- Test: `worker/auth.test.ts` (create or extend; node project)

**Interfaces:**
- Produces: `POST /api/auth/change-password` — auth required (JWT cookie); body `{ current_password: string, new_password: string }`; verifies `current_password` against the stored hash for the JWT's user, hashes `new_password` with the **same** helper register uses, updates the user row; responses: `200 {ok:true}`, `400` (missing/short new password), `401` (not authed OR current password wrong).

- [ ] **Step 1: Write the failing worker test**

```ts
// worker/auth.test.ts  (extend if it exists)
import { describe, it, expect } from 'vitest';
import worker from './index'; // adjust to the actual default export / fetch handler

// Follow the existing worker test setup for a mock Env + D1 (copy the pattern
// from the nearest existing worker/*.test.ts). Seed a user with a known password.
describe('POST /api/auth/change-password', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await worker.fetch(
      new Request('http://x/api/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ current_password: 'a', new_password: 'bbbbbbbb' }),
      }),
      mockEnv, // from the shared test helper
      mockCtx,
    );
    expect(res.status).toBe(401);
  });

  it('changes the password when current is correct and returns 200', async () => {
    // sign in / mint a JWT cookie for the seeded user per the existing helper,
    // then call change-password with the correct current + a valid new password.
    const res = await worker.fetch(authedRequest(/* seeded */), mockEnv, mockCtx);
    expect(res.status).toBe(200);
    // and the new password now verifies against the stored hash
  });
});
```

- [ ] **Step 2:** Run: `pnpm test -- worker/auth.test.ts` → FAIL (route not implemented).
- [ ] **Step 3:** Implement `changePassword(req, env)` in `worker/auth.ts`: read + verify the JWT cookie (reuse the same helper `/api/auth/me` uses); parse body; `400` if `new_password` shorter than the register minimum; load the user, **verify `current_password` with the same verify helper login uses** (`401` on mismatch); hash `new_password` with the same hash helper register uses; `UPDATE users SET password_hash=? WHERE id=?` via `worker/db.ts`; return `200 {ok:true}`. Never log password material. Register the route in `worker/index.ts` alongside the other `/api/auth/*` routes.
- [ ] **Step 4:** Run: `pnpm test -- worker/auth.test.ts` → PASS.
- [ ] **Step 5:** `pnpm build` → clean.
- [ ] **Step 6:** `git add worker/ && git commit -m "feat(worker): POST /api/auth/change-password"`

---

### Task 4: Account page (view + route)

**Files:**
- Modify: `src/components/studio/StudioApp.tsx` (add `'account'` to `CmsView` `:11-15`; add the `Account` component; wire navigation)
- Create (optional): `src/components/studio/Account.tsx` if you prefer a file over an inline component (match the existing inline pattern OR extract — either is fine; extract is cleaner)
- Modify: `src/App.css` / `reda-studio.css` (account styles)
- Test: `src/components/studio/StudioApp.test.tsx` (or a new `Account.test.tsx`)

**Interfaces:**
- Consumes: `POST /api/auth/change-password` (Task 3), `GET /api/auth/me` (existing, for user info).

- [ ] **Step 1:** Add `'account'` to `CmsView`. Add navigation into it: the Dashboard header's signed-in-email/user chip becomes a button → `setView('account')`; the Account view has a back-to-dashboard control. (Do not add a new route — it's a `StudioApp` view-state like the others.)
- [ ] **Step 2:** Build the `Account` view to match `view-02b-account.html` (light register): **Profile info** panel (full name, email read-only) and a **Security** panel with Current / New / Confirm password fields. Real **password-mismatch validation**: the Confirm field shows a son error border + "Passwords don't match" and the submit button is disabled until New === Confirm and non-empty. On submit, `POST /api/auth/change-password` with `{current_password, new_password}`; show success or the server error in an alert. Section headings are real serif titles (No-Kicker — no mono uppercase eyebrow). Primary buttons = son.
- [ ] **Step 3:** `pnpm test -- src/components/studio/StudioApp.test.tsx` (or `Account.test.tsx`) → PASS. Add tests: Account renders from the union; the submit is disabled on mismatch; a matching submit calls the endpoint.
- [ ] **Step 4:** `pnpm dev`, navigate dashboard → account; screenshot; compare to `view-02b-account` (both panels, mismatch error state, disabled submit).
- [ ] **Step 5:** `git add -A && git commit -m "feat(account): account page + password change UI"`

---

### Task 5: Full-suite gate + visual pass

- [ ] **Step 1:** `pnpm test` → PASS (dom + node/worker).
- [ ] **Step 2:** `pnpm build` → clean typecheck + build.
- [ ] **Step 3:** `pnpm dev` (+ `pnpm worker:dev` for the live endpoint): log in, view dashboard (populated + empty), open account, change a password end-to-end, toggle the auth theme; confirm each matches its mockup and all preserved features work.
- [ ] **Step 4:** `git commit --allow-empty -m "chore(auth/dashboard/account): verified against mockups"`

## Self-Review (completed)

- **Coverage:** login/signup + theme toggle (Task 1), dashboard + empty-state + delete-confirm (Task 2), the net-new password endpoint (Task 3, TDD), the net-new Account view + route (Task 4). All four mockups mapped. ✓
- **Placeholders:** the endpoint task has a concrete contract + a failing test + a security note (reuse existing hashing, never log); the theme task specifies the exact var mapping + persistence; the account task specifies fields + validation + endpoint call. ✓
- **Consistency:** `CmsView` union (`:11-15`), `Login` (`:105-319`), `Dashboard` (`:321-444`), and the worker `/api/auth/*` router are cited at their exploration locations; the password endpoint name matches between Task 3 (produces) and Task 4 (consumes). ✓
