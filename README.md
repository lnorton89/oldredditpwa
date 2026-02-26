# Reddit PWA Wrapper

A lightweight Progressive Web App shell that wraps `old.reddit.com` in a mobile-friendly Material UI interface with installable PWA support.

## Why a backend proxy is included

`old.reddit.com` sets frame-protection headers in many responses. To make iframe rendering possible, this project includes a Node.js backend proxy that removes frame-blocking headers and rewrites links/redirects through `/proxy/...`.

## Run with Docker (recommended)

Start backend proxy:

```bash
docker compose up --build proxy
```

Then in another terminal run the frontend:

```bash
npm install
npm run dev
```

The Vite dev server proxies `/proxy` requests to `http://localhost:8080`.

## Local development (without Docker)

Terminal 1 (backend):

```bash
cd backend
npm test
npm run start
```

Terminal 2 (frontend):

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The generated production assets are output to `dist/`.

## Install on Android

1. Open the deployed app in Chrome on Android.
2. Tap the browser menu and choose **Add to Home screen** (or **Install app**).
3. Launch it from the home screen for standalone app mode.

## Material reader mode

The app now renders Reddit data using native MUI cards/icons via `src/components/RedditReader.tsx`.
View-specific layout behavior is configured through `configureView()` in `src/views/viewConfig.ts` (e.g., `home`, `post`).
The backend exposes `/api/reddit` to normalize Reddit JSON into frontend-friendly payloads.
