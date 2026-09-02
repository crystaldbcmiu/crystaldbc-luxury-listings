# CrystalDBC Luxury Listings

Three workspaces in one repo:

| Folder | What it is | Dev URL |
| --- | --- | --- |
| `server/` | Express + MongoDB API | http://localhost:5050/api |
| `client/` | Vite + React web app | http://localhost:8080 |
| `mobile/` | Expo (React Native) app | Expo dev server on :8081 |

## Getting started

```bash
npm run setup
```

Installs dependencies at the root and in all three workspaces.

Then run everything at once:

```bash
npm run dev
```

This runs a preflight check (dependencies, `server/.env`, the mobile API URL),
then:

- **opens the Expo dev server in its own terminal window**, so its QR code
  renders properly and its keyboard menu (`a` / `i` / `w` / `r`) stays
  interactive — scan the QR from that window with Expo Go;
- starts the **API** and **web client** in the current terminal with prefixed,
  colour-coded output. `Ctrl+C` stops those two.

The Expo window is independent: closing it stops Expo, and `Ctrl+C` in the main
terminal does not. If Expo is already running on port 8081, `npm run dev` reuses
it instead of opening a second window.

Expo only draws its QR code when it owns a real terminal — that is why it gets a
window of its own. If you would rather have all three multiplexed into one
terminal (no QR code), use `npm run dev:inline`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run setup` | Install dependencies everywhere |
| `npm run dev` | API + web here, Expo (with QR code) in its own window |
| `npm run dev:inline` | All three multiplexed in one terminal — no QR code |
| `npm run dev:api` | API + web only (skips Expo) |
| `npm run dev:server` | API only |
| `npm run dev:web` | Web client only |
| `npm run dev:mobile` | Expo dev server only |
| `npm run check` | Static checks: server syntax, mobile typecheck, client lint + build |
| `npm run verify` | Read-only smoke test of the API and the map/favorites plumbing |

## Before you run it

**`server/.env` points at a remote database.** Treat every dev session as
production data. In particular, **never run `npm --prefix server run seed`**
against it — `server/seed.js` opens with `deleteMany({})` across every
collection and will wipe the database. It is deliberately not exposed as a root
script for that reason. `npm run verify` issues GET requests only.

**Expo Go version.** The mobile app targets **Expo SDK 54**, so it needs an
**Expo Go 54.x** build. Expo Go only ever supports one SDK at a time, so a newer
Expo Go from the App Store will refuse the project with "incompatible with this
version of Expo Go". If you upgrade the SDK later, every device's Expo Go has to
move with it.

**Testing the mobile app on a phone.** The phone must be on the same Wi-Fi as
this machine, and `mobile/.env` must point at this machine's LAN address, not
`localhost`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.10:5050/api
```

Preflight detects your current LAN IP and warns when the two disagree — that
mismatch is the usual cause of a mobile app that loads but shows no data.

**Previewing the mobile app in a browser** (`w` in the Expo menu) is useful for
layout, but two things do not work there:

- The **Map tab** renders a "not supported on this platform" notice, because
  `react-native-webview` has no web implementation. The map itself is fine on
  iOS and Android.
- API calls are blocked by CORS, since `CLIENT_URL` in `server/.env` only allows
  `http://localhost:8080`. Add `,http://localhost:8081` to it if you want the
  browser preview to load data.

Neither affects a real device or simulator.

## Map coordinates

The Map tab plots properties that have `latitude` and `longitude` set. Existing
listings have neither, so the map starts empty and says so. Set them per
property in the mobile admin: **Admin → Properties → edit → Latitude /
Longitude**. `npm run verify` reports how many properties are currently pinned.
