# pikol-frontend

Next.js 15 (App Router) client for Pikol. TypeScript, TanStack Query, zod,
react-hook-form, Tailwind with hand-written shadcn-style primitives.

System-level brief: `../CLAUDE.md` — vocabulary, the two status axes, the
PENDING trap, roles and permissions, API conventions. Read it first; this
file covers only what is specific to the frontend.

Design: `../docs/plans/2026-09-09-court-booking-system-design.md` §8.

## Architecture: feature slices (asima's shape)

```
app/        → routes. Thin shells that compose feature components.
features/   → vertical slices. May import lib/ and other slices' index.ts only.
lib/        → cross-cutting primitives. NEVER imports from app/ or features/.
components/ → shared UI: ui/ (primitives), form/, layout/.
```

```
features/<slice>/
├─ api.ts        HTTP + zod .parse() only. No React.
├─ schemas.ts    zod schemas + inferred types — snake_case, mirroring the API.
├─ keys.ts       the ONLY place this slice's query keys are defined.
├─ hooks/        all React Query.
├─ components/   UI. Calls hooks, never api.ts or fetch.
└─ index.ts      public API for other slices.
```

ESLint enforces the barrel rule and forbids inline `queryKey` arrays.

## Slices and routes

| Slice | Owns |
|---|---|
| `auth` | sign-in/registration/recovery, `usePermissions`, `canBookOnline` |
| `catalog` | the venue list (`GET /venues`) |
| `availability` | the day grid and slot selection |
| `bookings` | holds, the pay page, the checkout return, My Bookings |

Routes: `/venues`, `/venues/[venueId]?date=`, `/bookings` (mine),
`/bookings/[bookingId]` (pay page), `/checkout/return?booking_id=`. `/staff`
is still a placeholder (Phase 8). `components/layout/app-nav.tsx` shows the
player links when `canBookOnline`.

## Non-negotiables

- **Every response is zod-parsed in `api.ts`.** Components never see raw JSON.
- **Gate UI on `GET /users/me/permissions`**, never on a role parsed
  client-side. `features/auth` exposes `usePermissions()`.
- **Branch on the error `code`, render the `detail`.** `lib/api-error.ts`
  understands both our envelope (`{detail, code, request_id}`) and FastAPI's
  validation shape (`{detail: [{msg}]}`).
- **`lib/api-client` is feature-agnostic.** `AuthProvider` injects the access
  token and the refresh handler; nothing else does.
- **All times render in Asia/Manila**, never browser-local (spec §8.2).
- **Slot selection is never optimistic** — a 409 on a busy evening is an
  expected outcome (spec §8.2). Tap → server → then held.
- **The browser redirect from checkout never confirms anything.** The
  return page polls (and calls `refresh-payment`) — spec §8.2, ADR 0002.

## Auth

- Access token in memory; refresh token in `localStorage` under
  `pikol:refresh_token`. Refresh sends `{refresh_token}` in the body and
  ROTATES: the old token dies, and presenting it again revokes every session
  of that user. So refresh is single-flight — `ApiClient` coalesces
  concurrent 401s into one refresh call. Never call `authApi.refresh` from
  anywhere but `AuthProvider`.
- Login returns tokens only; the provider then loads `GET /users/me`.
- Landing: `BOOKING:ReadAny` → `/staff`, otherwise `/venues`.

## Env

One variable, `NEXT_PUBLIC_API_BASE_URL` — the API root **including
`/api/v1`**. It is compiled into the bundle (no secrets, ever), so changing
it needs a rebuild. **`next.config.ts` fails a production build without it**
(spec §8.3); do not add a fallback that hides a missing value.

The dev server runs on **port 3000** — the backend's CORS allow-list.

## Commands

```bash
npm install
npm run dev                 # http://localhost:3000, backend on :8000
npm run lint:ci && npm run format:check && npm run typecheck && npm test && npm run build
```

CI runs all five. Run `npm run format` before committing.

## Docs live in the parent repo

Plans and ADRs are committed only in `../docs/`. Do not create a `docs/`
directory here. `tasks/` is a gitignored workspace.
