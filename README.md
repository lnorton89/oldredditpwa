# Reddit PWA Wrapper

A lightweight Progressive Web App shell that wraps `old.reddit.com` in a mobile-friendly Material UI interface with installable PWA support.

## Local development

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

## Notes about old.reddit.com embedding

`old.reddit.com` commonly sends `X-Frame-Options: sameorigin`, which prevents rendering inside an iframe in normal browsers.

This app detects frame timeouts and shows a fallback action to open the configured URL in a regular tab.
