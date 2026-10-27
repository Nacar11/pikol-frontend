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

**The web is the staff console only** (ADR 0003). Customers book in a mobile
app; the player routes were removed and the backend's customer routes stay
for that app. A signed-in non-staff user lands on `/customer-app`.

| Slice | Owns |
|---|---|
| `auth` | sign-in and recovery screens, `usePermissions`, `landingPath`, the user/group schemas |
| `catalog` | the per-venue court list (`GET /venues/{id}/courts`) |
| `availability` | the day availability read and the slot-selection reducer |
| `bookings` | the booking schema and `StatusBadge`, reused by the console |
| `admin-bookings` | the Schedule (header, two-week strip, court grid, day-at-a-glance), the occupancy read, booking actions, the resolution queue |
| `staff` | `StaffShell` (the sidebar), `StaffOnly`, `StaffGate`, `StaffVenueSync`, `useStaffVenue`, `VenueRequired`, `VenueSwitcher`, `STAFF_LINKS` |
| `setup` | venues, courts, price rules and the price preview, closures; `useCourtSummaries` / `useVenueSummaries` (one request per page for the cards' stats) |
| `team` | Staff accounts: invites into a group, resend/revoke, deactivate |
| `groups` | user groups: Setup → Venue staff and Masters → User groups |
| `parameters` | the owner's business-parameters screen |

Routes: `/login`, `/forgot-password`, `/reset-password`, `/verify-email`,
`/accept-invite`, `/customer-app`, and the staff console under `/staff`
(every page gated on a permission code, never a group name): `/staff`
redirects to `/staff/schedule` in `next.config.ts` — never with a page calling
`redirect()`, which crashed the App Router on client navigation; the others are
`/staff/schedule?venue=&date=`, `/staff/bookings/[bookingId]`,
`/staff/resolution`, `/staff/closures`, `/staff/courts`,
`/staff/courts/[courtId]/pricing`, `/staff/venue-staff`, `/staff/users`
(Staff accounts), `/staff/venues`, `/staff/parameters` and `/staff/groups`
(owner only, gated on `VENUE:Manage`).

### The active venue

Permissions are per venue, so **every staff request carries `X-Venue-ID`**.
`useStaffVenue` picks it from `GET /users/me/venues`: `?venue=` first, then the
last choice on this browser, then the first. `StaffVenueSync` (in the staff
layout) injects it into `lib/api-client` as a venue provider — written during
render so children's first fetches already carry it — and resets every query
when it changes, permissions included.

## Non-negotiables

- **Every response is zod-parsed in `api.ts`.** Components never see raw JSON.
- **Gate UI on `GET /users/me/permissions`**, never on a group name parsed
  client-side. `features/auth` exposes `usePermissions()`. "Is this the
  owner?" is `permissions.includes('VENUE:Manage')` — an owner-only code.
- **Branch on the error `code`, render the `detail`.** `lib/api-error.ts`
  understands both our envelope (`{detail, code, request_id}`) and FastAPI's
  validation shape (`{detail: [{msg}]}`).
- **`lib/api-client` is feature-agnostic.** `AuthProvider` injects the access
  token and the refresh handler, and `StaffVenueSync` the venue provider;
  nothing else does.
- **Black and white.** Tokens in `globals.css` are neutral; `destructive` is
  the one hue, for errors and destructive actions only. Status is shape plus
  a text label, never colour alone (`bg-hatch` is the one sanctioned pattern,
  for a closed court-hour).
- **All times render in Asia/Manila**, never browser-local (spec §8.2).
- **Slot selection is never optimistic** — a 409 on a busy evening is an
  expected outcome (spec §8.2). Tap → server → then held.

## Auth

- Access token in memory; refresh token in `localStorage` under
  `pikol:refresh_token`. Refresh sends `{refresh_token}` in the body and
  ROTATES: the old token dies, and presenting it again revokes every session
  of that user. So refresh is single-flight — `ApiClient` coalesces
  concurrent 401s into one refresh call. Never call `authApi.refresh` from
  anywhere but `AuthProvider`.
- Login returns tokens only; the provider then loads `GET /users/me`.
- Landing: `BOOKING:ReadAny` → `/staff`, otherwise `/customer-app`.

## Env

One variable, `NEXT_PUBLIC_API_BASE_URL` — the API root **including
`/api/v1`**. It is compiled into the bundle (no secrets, ever), so changing
it needs a rebuild. **`next.config.ts` fails a production build without it**
(spec §8.3); do not add a fallback that hides a missing value.

The dev server runs on **port 3000** — the backend's CORS allow-list.

## Shared UI

Before hand-writing markup, use what exists (catalogue:
`../docs/standard/cleanup-pass.md` §5): `PageHeader`, `SectionLabel`,
`StatStrip`, `AddTile`, `Pill`, `Avatar`, `Skeleton`, `Select` (never a native
`<select>`), `buttonVariants` for links styled as buttons, and `VenueRequired`
for pages that need the active venue. Feedback after an action goes through
`notify.success / info / warning / error(message, { action? })` from
`components/ui/snackbar` — never `sonner` directly. Extract a new one only with
two real callers and no per-caller flag.

## Commands

```bash
npm install
npm run dev                 # http://localhost:3000, backend on :8000
npm run lint:ci && npm run format:check && npm run typecheck && npm test && npm run deadcode
NEXT_DIST_DIR=.next-e2e npm run build   # never plain `npm run build` under a running `npm run dev`
npm run e2e                 # Playwright, real backend :8100 + pikol_e2e, Next :3100
```

CI runs lint, format, typecheck, unit tests and the build. Run `npm run
format` before committing.

`npm run deadcode` runs knip twice: normally, and with `--production`, which
ignores tests — so code only its own tests call shows up. An export that
exists purely as a test seam is tagged `/** @internal */`.

`npm run e2e` recreates and seeds `pikol_e2e` (Docker Postgres must be up),
starts the backend and a production build, and runs `e2e/*.spec.ts`. Each
test signs in through the API with its own refresh token (`e2e/fixtures.ts`):
tokens rotate, and a shared one trips replay detection. Seeded logins:
`owner.e2e@example.com` / `desk.e2e@example.com`, password `E2e-password-1`.

## Docs live in the parent repo

Plans and ADRs are committed only in `../docs/`. Do not create a `docs/`
directory here. `tasks/` is a gitignored workspace.

## Building unfamiliar features

For unfamiliar features, don't write from scratch — first search GitHub for
open-source projects, compare approaches, then get started.
