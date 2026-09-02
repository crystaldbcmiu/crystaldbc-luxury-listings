# CrystalDBC Mobile (Expo)

React Native app mirroring the full CrystalDBC web product — public browsing, auth,
investor portfolio, chat, and the complete admin console — against the **existing**
Express/Mongo API in [`../server`](../server). No backend changes are required.

## Stack

| Concern      | Choice                                        |
| ------------ | --------------------------------------------- |
| Runtime      | Expo SDK 54 + React Native 0.81 + TypeScript   |
| Navigation   | Expo Router (file-based, typed routes)         |
| Data         | TanStack Query + axios (`src/lib/apiClient.ts`)|
| Auth storage | `expo-secure-store` (JWT, key `crystaldbc_token`) |
| UI           | NativeWind v4, dark + gold luxury tokens       |
| i18n         | i18next / react-i18next — EN, AR, DE, RU       |
| Lists        | FlashList                                      |
| Charts       | `react-native-svg` (`src/components/admin/BarChart.tsx`) |
| Uploads      | `expo-image-picker` → `POST /uploads/image`    |
| PDF / CSV    | `expo-print`, `expo-file-system` + `expo-sharing` |

## Setup

```bash
cd mobile
npm install
cp .env.example .env   # then edit EXPO_PUBLIC_API_URL
npx expo start
```

### Pointing at the API

`EXPO_PUBLIC_API_URL` must include the `/api` suffix. **A physical device cannot reach
`localhost`** — that resolves to the phone itself. Use your machine's LAN IP
(`http://192.168.x.x:5050/api`) or a deployed URL. **Port 5050** is what `PORT` in
`server/.env` is set to — note this is not the 5000 the code comments elsewhere assume,
and on Windows port 5000 is often reserved by the system anyway.

If it is unset, `src/lib/env.ts` falls back to the Metro host, then to
`10.0.2.2:5050` on Android emulators and `localhost:5050` elsewhere.

**CORS:** add the origin you use to `CLIENT_URL` in `server/.env`, otherwise the API
rejects the request. (An empty `CLIENT_URL` allows all origins.)

Optional:

- `EXPO_PUBLIC_ASSETS_URL` — origin serving `/uploads/*` if different from the API.
- `EXPO_PUBLIC_WEB_URL` — origin serving the web app's public files. CMS records
  sometimes hold root-relative paths like `/lobby.jpeg`; without this they render as
  a placeholder, since those files live with the web front-end, not the API.

## Structure

```
app/                        # Expo Router routes
  (tabs)/                   # Home, Listings, Wishlist, More
  auth/[mode].tsx           # login | register
  property/[propertyId].tsx # detail, gallery, virtual tour, rent request
  investment, my-investments, chat, about, contact, terms
  admin/                    # role-gated console (12 screens)
src/
  components/               # UI primitives, PropertyCard, RoleGate, admin widgets
  context/                  # AuthContext, RegisterInterestContext
  hooks/                    # useAuth, useProperties, useCmsSection, useRoles, ...
  i18n/                     # init + resources copied from client/src/i18n.ts
  lib/                      # apiClient, env, media, format, uploads, exports
  types/                    # copy of client/src/types/index.ts
```

## Roles

Identical to `client/src/App.tsx`:

| Route                     | Roles                                   |
| ------------------------- | --------------------------------------- |
| `/wishlist`               | user, admin, employee, property-handler |
| `/my-investments`         | user, investor                          |
| `/investment`             | public (hidden when CMS `investmentPageEnabled` is false) |
| `/admin`, `/admin/properties`, `/admin/rentals` | admin, employee, property-handler |
| `/admin/leads`, `/messages`, `/reports`         | admin, employee |
| everything else under `/admin`                  | admin |

`src/components/RoleGate.tsx` is the port of `ProtectedRoute`: unauthenticated users
are redirected to login, authenticated users lacking the role get "Access Restricted".

Two deliberate differences from the web build, both noted in code:

1. The admin nav lists Projects/CMS for **admins only**. The web sidebar shows them to
   employees whose routes then reject them; repeating that would create dead links.
2. Property **delete** is admin-only, matching the web UI (`canDelete`), even though
   the API also permits `property-handler`.

## Notable platform swaps

Heavy web-only pieces have native equivalents rather than direct ports:

- Three.js globe / GSAP entrance / model-viewer → omitted; the data and features they
  decorated are all present.
- recharts + Three.js pie → `BarChart` on `react-native-svg`.
- jsPDF investor statement → `expo-print` + share sheet.
- Blob/anchor CSV download → `expo-file-system` + share sheet.
- Virtual tour `<iframe>` → `react-native-webview` in a modal.

## RTL

Arabic sets `I18nManager.forceRTL`. **Native RTL only fully applies after an app
restart**, so switching to or from Arabic shows a restart prompt. Components that need
to flip before the restart use `useIsRTL()`.

## Builds (EAS)

`eas.json` defines three profiles; each pins its own `EXPO_PUBLIC_API_URL` — update the
staging/production URLs to your real hosts before building.

```bash
npx eas build --profile development --platform android
npx eas build --profile preview --platform android
npx eas build --profile production --platform all
```

## Deep links

Scheme `crystaldbc://` plus Android App Links for `https://crystaldbc.com`. Routes map
to paths directly, e.g. `crystaldbc://property/<id>` or `crystaldbc://admin/leads`.
For iOS universal links, add an `associatedDomains` entry and host an AASA file.

## Checks

```bash
npm run typecheck
```

Native bundles (what EAS will build) can be verified without a device:

```bash
npx expo export --platform android
```

### Verified

Run against the local API (`node server.js` in `../server`) with Expo on port 8080 —
that port matches `CLIENT_URL` in `server/.env`, so browser CORS passes unchanged.
Native builds need no CORS change at all: React Native sends no `Origin` header, and
the server allows those.

Confirmed working end to end: CMS-driven home, listings (11 live properties) with
filters, property detail with similar-properties, role-gate redirect on `/admin`,
the CMS `investmentPageEnabled` gate redirecting `/investment` home, the
`rentButtonEnabled` gate hiding sale/rent controls, chat, and the `{ message }` error
shape on 401s.

Not yet exercised: authenticated flows (wishlist writes, admin CRUD, uploads) — these
need a login, and the seeded credentials in `server/.env` were deliberately left
untouched. Sign in on a device to cover them.
