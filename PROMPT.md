# Old Reddit PWA Wrapper — Agentic Coding Prompt

## Project Overview

Build a Progressive Web App (PWA) that wraps `old.reddit.com` in a mobile-friendly Material UI shell. The goal is simplicity, extensibility, and a native app feel on Android.

---

## Stack

- React 18 + TypeScript
- Vite (latest stable) as the build tool
- MUI (Material UI v6, latest stable) for the shell UI
- `vite-plugin-pwa` (latest stable) with Workbox for PWA/service worker support
- React Router v6 for any internal routing

---

## Project Structure

```
reddit-pwa/
├── public/
│   └── icons/          # PWA icons (192x192, 512x512 — use a simple Reddit alien placeholder SVG converted to PNG)
├── src/
│   ├── components/
│   │   ├── AppShell.tsx        # Top AppBar + bottom nav + drawer scaffold
│   │   ├── RedditFrame.tsx     # The iframe wrapper for old.reddit.com
│   │   └── SettingsDrawer.tsx  # Slide-in drawer for settings (URL override, theme toggle)
│   ├── hooks/
│   │   └── useSettings.ts      # Persist settings to localStorage (base URL, dark mode)
│   ├── theme/
│   │   └── theme.ts            # MUI theme factory (light + dark, Reddit orange #FF4500 as primary)
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
├── manifest.webmanifest        # PWA manifest
└── package.json
```

---

## Functional Requirements

### 1. App Shell (`AppShell.tsx`)

- MUI `AppBar` at the top with the title "Reddit" and a settings (gear) icon button on the right.
- No bottom navigation bar is needed initially — keep it as a placeholder comment for future expansion.
- The AppBar should be sticky/fixed and the iframe should fill the remaining viewport height (`calc(100vh - 64px)`).

### 2. Reddit Frame (`RedditFrame.tsx`)

- Renders an `<iframe>` pointed at the `baseUrl` from settings (default: `https://old.reddit.com`).
- Props: `src: string`
- The iframe must be `width: 100%`, `height: 100%`, `border: none`, `overflow: auto`.
- Set `sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"` on the iframe.
- Add a `loading` state: show an MUI `LinearProgress` bar at the top while the iframe is loading (use `onLoad` to dismiss it).

### 3. Settings Drawer (`SettingsDrawer.tsx`)

- MUI `Drawer` anchored to the right, opened via the gear icon.
- Settings to expose:
  - **Base URL** — MUI `TextField` (default `https://old.reddit.com`). Saved on blur/enter.
  - **Dark Mode** toggle — MUI `Switch` with label.
- All settings persisted via the `useSettings` hook to `localStorage`.

### 4. Theme (`theme/theme.ts`)

- Export a `createAppTheme(mode: 'light' | 'dark')` function.
- Primary color: `#FF4500` (Reddit orange). Secondary: `#0DD3BB`.
- In dark mode, use `background.default: '#1A1A1B'` (Reddit dark background).

### 5. Settings Hook (`useSettings.ts`)

- Manages `{ baseUrl: string, darkMode: boolean }`.
- Reads/writes to `localStorage` under the key `'reddpwa_settings'`.
- Export as `useSettings()` returning `[settings, updateSettings]`.

### 6. PWA Configuration (`vite.config.ts`)

- Use `vite-plugin-pwa` with the following `manifest` values:
  - `name`: "Reddit PWA"
  - `short_name`: "Reddit"
  - `theme_color`: "#FF4500"
  - `background_color`: "#FFFFFF"
  - `display`: `"standalone"`
  - `orientation`: `"portrait"`
  - `scope`: `"/"`
  - `start_url`: `"/"`
- `workbox` strategy: `GenerateSW` with `navigateFallback: 'index.html'` and `runtimeCaching` for `https://old.reddit.com/` using the `NetworkFirst` strategy with a cache name of `"reddit-runtime"`.
- Register the service worker via `registerType: 'autoUpdate'`.

### 7. `manifest.webmanifest`

- Include icons for 192x192 and 512x512 pointing to `/icons/icon-192.png` and `/icons/icon-512.png`.
- `purpose: "any maskable"` on the 512 icon.

### 8. `index.html`

- Set `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
- Set `<meta name="theme-color" content="#FF4500">`.
- Set `<meta name="mobile-web-app-capable" content="yes">` and `<meta name="apple-mobile-web-app-capable" content="yes">`.

---

## Non-Functional Requirements

- TypeScript strict mode enabled (`tsconfig.json` with `"strict": true`).
- No ESLint errors at build time. Include a minimal `.eslintrc.cjs`.
- `vite build` must succeed with zero errors.
- Do not over-engineer. No state management library (Redux, Zustand, etc.) — `useState` + `localStorage` only.
- Add a `README.md` with: purpose, local dev instructions (`npm install && npm run dev`), how to build (`npm run build`), and how to install on Android (add to homescreen from Chrome).
- Use `npm` as the package manager. Pin all dependencies to their latest stable version at time of generation (no `^` or `~` — exact versions).

---

## Acceptance Criteria

- `npm run dev` starts a local server and the app loads `old.reddit.com` in the iframe.
- Toggling dark mode in the drawer updates the MUI shell immediately and persists after reload.
- Changing the base URL in the drawer and reloading the iframe navigates to the new URL.
- `npm run build` produces a `dist/` folder that is a valid installable PWA (passes Lighthouse PWA audit).
- The app is installable on Android via Chrome's "Add to Home Screen" and launches in standalone mode.
